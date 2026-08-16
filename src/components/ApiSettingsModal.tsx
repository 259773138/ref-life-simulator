/**
 * API 设置弹窗（最高优先级功能）
 * - Base URL / Key / Model / Temperature / Max Tokens
 * - 连通性测试
 * - 引擎模式（自动 / 强制 LLM / 本地推演）与叙事详细度
 * 密钥仅存浏览器 localStorage。
 */
import React, { useEffect, useState } from 'react';
import { MODEL_SUGGESTIONS, useApiStore } from '../store/useApiStore';
import { normalizeBaseUrl } from '../lib/ai-client';
import { Card, Chip, SectionTitle } from './ui';

export default function ApiSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config, mode, narrativeDepth, testing, testResult, setConfig, setMode, setDepth, runTest, clearTest } = useApiStore();
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [temperature, setTemperature] = useState(config.temperature);
  const [maxTokens, setMaxTokens] = useState(config.maxTokens);

  useEffect(() => {
    if (open) {
      setBaseUrl(config.baseUrl);
      setApiKey(config.apiKey);
      setModel(config.model);
      setTemperature(config.temperature);
      setMaxTokens(config.maxTokens);
    }
  }, [open, config]);

  if (!open) return null;

  const saveAll = () => {
    setConfig({ baseUrl: normalizeBaseUrl(baseUrl), apiKey, model, temperature, maxTokens });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl my-8 fade-up" onClick={e => e.stopPropagation()}>
        <Card className="p-6">
          <SectionTitle
            icon="🔌"
            title="API 设置"
            sub="接入任意 OpenAI 兼容服务 · 密钥仅保存在本机浏览器 localStorage"
            right={<button onClick={onClose} className="btn-ghost !px-3 !py-1.5 text-sm">✕ 关闭</button>}
          />

          <div className="space-y-4">
            {/* Base URL */}
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">🌐 API Base URL</label>
              <input
                className="input-base font-mono"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                spellCheck={false}
              />
              <p className="text-[11px] text-ink/45 mt-1">
                兼容 DeepSeek / 硅基流动 / Moonshot / OpenRouter / Ollama（如 http://localhost:11434/v1）等。
                未填 /v1 时自动补全。
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">🔑 API Key</label>
              <input
                className="input-base font-mono"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
              <p className="text-[11px] text-ink/45 mt-1">仅保存在浏览器 localStorage，请求由浏览器直连你的 Endpoint，绝不上传任何第三方服务器。</p>
            </div>

            {/* Model */}
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">🤖 模型名称 (Model)</label>
              <input
                className="input-base font-mono"
                list="model-suggestions"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="gpt-4o"
                spellCheck={false}
              />
              <datalist id="model-suggestions">
                {MODEL_SUGGESTIONS.map(m => <option key={m} value={m} />)}
              </datalist>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {MODEL_SUGGESTIONS.slice(0, 6).map(m => (
                  <button key={m} onClick={() => setModel(m)} className="px-2 py-0.5 rounded-sm text-[11px] border border-ink/15 hover:border-accent hover:text-accent transition-colors">
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 参数滑条 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex justify-between text-[12px] font-semibold tracking-widest text-steel mb-1.5">
                  <span>🌡️ Temperature</span>
                  <span className="font-mono">{temperature.toFixed(1)}</span>
                </label>
                <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-[#b3402f]" />
                <p className="text-[11px] text-ink/45 mt-0.5">越高越有创造力，越低越稳定。默认 0.7。</p>
              </div>
              <div>
                <label className="flex justify-between text-[12px] font-semibold tracking-widest text-steel mb-1.5">
                  <span>📏 Max Tokens</span>
                  <span className="font-mono">{maxTokens}</span>
                </label>
                <input type="range" min={512} max={8192} step={256} value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} className="w-full accent-[#b3402f]" />
                <p className="text-[11px] text-ink/45 mt-0.5">单次回复最大长度。叙事较丰富建议 ≥ 2048。</p>
              </div>
            </div>

            {/* 引擎模式 */}
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">⚙️ 引擎模式</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['auto', '🔄 自动', '有 Key 走 AI，失败自动回退本地'],
                  ['llm', '🤖 强制 LLM', '必须调用 API，失败则报错'],
                  ['local', '📦 本地推演', '纯本地模板引擎，无需网络'],
                ] as const).map(([m, label, desc]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-2 rounded-sm text-left border transition-all ${mode === m ? 'border-accent bg-accent/8 shadow-[inset_0_0_0_1px_#b3402f]' : 'border-ink/15 hover:border-ink/35'}`}
                  >
                    <div className="text-[13px] font-medium">{label}</div>
                    <div className="text-[10px] text-ink/50 mt-0.5 leading-tight">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 叙事详细度 */}
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">📖 叙事详细度（第十八章）</label>
              <div className="flex gap-2">
                {(['精简', '标准', '沉浸'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`px-4 py-1.5 rounded-sm text-[13px] border transition-all ${narrativeDepth === d ? 'border-accent bg-accent/8 text-accent' : 'border-ink/15 hover:border-ink/35'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 连通性测试 */}
            <div className="border-t border-ink/10 pt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button className="btn-primary" disabled={testing} onClick={() => { saveAll(); runTest(); }}>
                  {testing ? '⏳ 测试中…' : '🧪 测试连通性'}
                </button>
                {testResult && (
                  <div className={`text-[13px] ${testResult.ok ? 'text-moss' : 'text-accent'}`}>
                    {testResult.message}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-ink/45 mt-2">
                测试将向 {normalizeBaseUrl(baseUrl)}/chat/completions 发送一条最小请求，验证 Base URL、Key 与 Model 三要素。
              </p>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-between border-t border-ink/10 pt-4">
              <Chip tone="steel">🛡️ 密钥仅存 localStorage · 直连 Endpoint · 不经第三方</Chip>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => { setConfig({ baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o', temperature: 0.7, maxTokens: 2048 }); setBaseUrl('https://api.openai.com/v1'); setApiKey(''); setModel('gpt-4o'); setTemperature(0.7); setMaxTokens(2048); clearTest(); }}>重置</button>
                <button className="btn-primary" onClick={() => { saveAll(); onClose(); }}>✅ 保存并关闭</button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
