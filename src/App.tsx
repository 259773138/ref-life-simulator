/**
 * 全局页面整合（第五步）
 * 顶栏 + 屏幕路由 + API 设置弹窗（全局可随时打开）
 */
import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { useApiStore } from './store/useApiStore';
import CharacterCreator from './components/CharacterCreator';
import MonthlyBoard from './components/MonthlyBoard';
import SettlementPanel from './components/SettlementPanel';
import LifeReview from './components/LifeReview';
import ApiSettingsModal from './components/ApiSettingsModal';
import { Chip } from './components/ui';

export default function App() {
  const screen = useGameStore(s => s.screen);
  const character = useGameStore(s => s.character);
  const year = useGameStore(s => s.year);
  const month = useGameStore(s => s.month);
  const saveCode = useGameStore(s => s.saveCode);
  const busy = useGameStore(s => s.busy);
  const mode = useApiStore(s => s.mode);
  const [apiOpen, setApiOpen] = useState(false);

  // 全局错误提示（3 秒自动消失）
  const lastError = useGameStore(s => s.lastError);
  const clearError = useGameStore(s => s.clearError);
  useEffect(() => {
    if (lastError) {
      const t = setTimeout(clearError, 6000);
      return () => clearTimeout(t);
    }
  }, [lastError, clearError]);

  const engineLabel = mode === 'local' ? '本地推演' : mode === 'llm' ? 'LLM' : '自动';

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-ink/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌆</span>
            <span className="font-serifcn font-black tracking-widest text-[15px] hero-title">Ref 现代人生模拟器</span>
            <span className="hidden sm:inline text-[10px] text-ink/40 tracking-widest">V9.0.13</span>
          </div>

          <div className="flex items-center gap-2">
            {character && screen !== 'create' && screen !== 'restore' && (
              <>
                <Chip tone="steel" >📅 {year}年{month}月</Chip>
                <Chip tone="gold">⚙️ {engineLabel}</Chip>
                {saveCode && <Chip tone="moss" >💾 {saveCode}</Chip>}
              </>
            )}
            <button className="btn-ghost !px-3 !py-1.5 text-[12.5px]" onClick={() => setApiOpen(true)}>🔌 API 设置</button>
            {character && screen !== 'create' && screen !== 'review' && screen !== 'restore' && (
              <button
                className="btn-ghost !px-3 !py-1.5 text-[12.5px]"
                onClick={() => { if (confirm('确定放弃当前人生，重新开始？当前存档仍可恢复。')) useGameStore.getState().newGame(); }}
              >
                🔄 新人生
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="flex-1">
        {screen === 'create' && <CharacterCreator />}
        {screen === 'playing' && <MonthlyBoard />}
        {screen === 'settlement' && <SettlementPanel />}
        {(screen === 'review' || screen === 'restore') && <LifeReview />}
      </main>

      {/* 底部 */}
      <footer className="py-5 text-center">
        <div className="divider-dash" aria-hidden>────── ✦ ──────</div>
        <p className="text-[11px] text-ink/35 tracking-widest mt-2">
          Ref 现代人生模拟器 V9.0.13 · 单人月令回合制 · 你的故事，由你的选择书写
        </p>
      </footer>

      {/* 全局错误横幅 */}
      {lastError && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] px-4 py-3 rounded-md bg-ink text-paper text-[13px] shadow-lg fade-up">
          ⚠ {lastError}
        </div>
      )}

      {/* 推演中遮罩 */}
      {busy && (
        <div className="fixed inset-0 z-[60] bg-paper/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="text-4xl blink">🧭</div>
          <div className="font-serifcn text-[15px] tracking-widest text-ink/70">世界正在推演你的选择……</div>
          <div className="text-[11px] text-ink/40 tracking-widest">月度结算生成中</div>
        </div>
      )}

      <ApiSettingsModal open={apiOpen} onClose={() => setApiOpen(false)} />
    </div>
  );
}
