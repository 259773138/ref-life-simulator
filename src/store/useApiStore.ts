/**
 * API 设置 Store（store/useApiStore.ts）
 * - 密钥仅存浏览器 localStorage（zustand persist）
 * - 引擎模式：auto（配置可用走 LLM，否则本地兜底）/ llm（强制 LLM）/ local（强制本地）
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiConfig } from '../types/game';
import { testConnection } from '../lib/ai-client';

export const MODEL_SUGGESTIONS = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3-5-sonnet',
  'deepseek-chat',
  'deepseek-reasoner',
  'qwen-max',
  'qwen-plus',
  'moonshot-v1-8k',
  'glm-4-plus',
  'openrouter/auto',
  'llama3.1:8b',
];

export type EngineMode = 'auto' | 'llm' | 'local';
export type NarrativeDepth = '精简' | '标准' | '沉浸';

interface ApiState {
  config: ApiConfig;
  mode: EngineMode;
  narrativeDepth: NarrativeDepth;
  testing: boolean;
  testResult: { ok: boolean; message: string; model?: string } | null;
  setConfig: (patch: Partial<ApiConfig>) => void;
  setMode: (m: EngineMode) => void;
  setDepth: (d: NarrativeDepth) => void;
  runTest: () => Promise<void>;
  clearTest: () => void;
  reset: () => void;
}

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
};

export const useApiStore = create<ApiState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      mode: 'auto',
      narrativeDepth: '标准',
      testing: false,
      testResult: null,

      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch }, testResult: null })),

      setMode: (m) => set({ mode: m }),
      setDepth: (d) => set({ narrativeDepth: d }),

      runTest: async () => {
        const { config } = get();
        set({ testing: true, testResult: null });
        const result = await testConnection(config);
        set({
          testing: false,
          testResult: result.ok
            ? { ok: true, message: `✅ 连通成功（${result.model}）：${result.reply}`.slice(0, 120), model: result.model }
            : { ok: false, message: `❌ 测试失败：${result.error}` },
        });
      },

      clearTest: () => set({ testResult: null }),

      reset: () => set({ config: DEFAULT_CONFIG, testResult: null }),
    }),
    {
      name: 'ref-life-api',
      partialize: (s) => ({ config: s.config, mode: s.mode, narrativeDepth: s.narrativeDepth }),
    },
  ),
);

/** 判断当前是否可走 LLM 路径 */
export function llmAvailable(): boolean {
  const { config, mode } = useApiStore.getState();
  if (mode === 'local') return false;
  if (mode === 'llm') return true;
  return config.apiKey.trim().length > 0;
}
