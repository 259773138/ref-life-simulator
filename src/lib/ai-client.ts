/**
 * 通用 OpenAI 兼容客户端（lib/ai-client.ts）
 * 兼容：OpenAI / DeepSeek / 硅基流动 / Moonshot / OpenRouter / Ollama 等
 * 密钥仅保存在浏览器 localStorage，请求由浏览器直连用户配置的 Endpoint，
 * 绝不经过任何第三方服务器。
 */
import type { ApiConfig } from '../types/game';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, opts?: { status?: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.code = opts?.code;
  }
}

/** 规范化 Base URL：确保以 /v1 结尾（若用户输入根域名则自动补全） */
export function normalizeBaseUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) url = 'https://api.openai.com/v1';
  // 若含 /chat/completions 则截断
  url = url.replace(/\/chat\/completions$/, '');
  // 若不含 /v1 且不是 Ollama 等特殊服务，补 /v1
  if (!/\/v\d+$/.test(url) && !/localhost|127\.0\.0\.1|\.local/.test(url)) {
    // OpenAI 兼容服务通常暴露在 /v1
    if (!url.includes('/v1')) url = url + '/v1';
  }
  return url;
}

async function httpPostJson(url: string, body: unknown, headers: Record<string, string>, timeoutMs = 90000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(`请求超时（${Math.round(timeoutMs / 1000)}s）。请检查网络或增大超时设置。`, { code: 'TIMEOUT' });
    }
    const e = err as Error;
    if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) {
      throw new ApiError(
        '无法连接到该地址。可能原因：① 地址/端口不正确；② 服务未启动（如 Ollama 需先运行）；③ 浏览器跨域限制（CORS）——可尝试本地代理或允许跨域的服务。',
        { code: 'NETWORK' },
      );
    }
    throw new ApiError(`网络错误：${e.message}`, { code: 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }
}

async function parseError(res: Response, fallback: string): Promise<ApiError> {
  let detail = '';
  try {
    const data = await res.json();
    detail = data?.error?.message || data?.message || JSON.stringify(data).slice(0, 300);
  } catch {
    detail = await res.text().catch(() => '');
  }
  return new ApiError(`${fallback}${detail ? `：${detail}` : ''}`, { status: res.status });
}

/** 发送 Chat Completions 请求 */
export async function chatCompletion(cfg: ApiConfig, messages: ChatMessage[], opts?: Partial<ChatRequest>): Promise<ChatResponse> {
  const base = normalizeBaseUrl(cfg.baseUrl);
  const url = `${base}/chat/completions`;
  const headers: Record<string, string> = {};
  if (cfg.apiKey.trim()) headers.Authorization = `Bearer ${cfg.apiKey.trim()}`;

  const payload: ChatRequest = {
    model: cfg.model || 'gpt-4o',
    messages,
    temperature: cfg.temperature ?? 0.7,
    max_tokens: cfg.maxTokens ?? 2048,
    stream: false,
    ...opts,
  };

  const res = await httpPostJson(url, payload, headers);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new ApiError('鉴权失败：API Key 无效或无权限（401/403）。请检查 Key 与模型权限。', { status: res.status, code: 'AUTH' });
    }
    if (res.status === 404) {
      throw new ApiError('接口地址 404：请确认 Base URL 是否正确（应指向 /v1 或 /v1 根路径，如 https://api.openai.com/v1）。', { status: res.status, code: 'NOT_FOUND' });
    }
    if (res.status === 429) {
      throw new ApiError('请求过于频繁或额度不足（429）。', { status: res.status, code: 'RATE_LIMIT' });
    }
    throw await parseError(res, `API 返回错误（HTTP ${res.status}）`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('响应解析失败：返回内容不是有效 JSON。', { code: 'BAD_JSON' });
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new ApiError('响应格式异常：缺少 choices[0].message.content 字段。', { code: 'BAD_FORMAT' });
  }
  return {
    content,
    model: data?.model ?? cfg.model,
    usage: data?.usage,
  };
}

/** 连通性测试：发送最小 prompt，验证 Endpoint / Key / Model 三要素 */
export async function testConnection(cfg: ApiConfig): Promise<{ ok: true; reply: string; model?: string } | { ok: false; error: string }> {
  try {
    const res = await chatCompletion(cfg, [
      { role: 'system', content: '你是一个连通性测试助手。只回复两个字："连通"。' },
      { role: 'user', content: '测试：请回复"连通"' },
    ], { max_tokens: 16, temperature: 0 });
    return { ok: true, reply: res.content.slice(0, 80), model: res.model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
