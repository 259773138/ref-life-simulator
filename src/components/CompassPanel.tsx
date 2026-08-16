/**
 * 决策罗盘（第四章）
 * 7 大一级分类 · 数字编号点选 / 自由描述 / 混合输入 · 行动点实时校验
 */
import React, { useMemo, useState } from 'react';
import type { CompassCategory, CompassOption } from '../types/game';
import { CATEGORY_EMOJI } from '../lib/constants';
import { useGameStore } from '../store/useGameStore';
import { circled, Chip, Divider } from './ui';

const CATEGORY_ORDER: CompassCategory[] = ['目标推进', '因缘际会', '职业发展', '社交经营', '生活事务', '自由探索', '商店购物'];

export default function CompassPanel() {
  const { compass, actionPoints, submitTurn, busy, lastError, clearError, silenceCounter, character, eggTriggered, totalMonths } = useGameStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [note, setNote] = useState('');

  const isFirstMonth = totalMonths === 0;

  const usedCount = selected.length + (freeText.trim() ? 1 : 0);
  const remaining = actionPoints.total - usedCount;
  const over = usedCount > actionPoints.total;

  const grouped = useMemo(() => {
    const map = new Map<CompassCategory, CompassOption[]>();
    for (const c of CATEGORY_ORDER) map.set(c, []);
    for (const o of compass) map.get(o.category)?.push(o);
    return map;
  }, [compass]);

  const toggle = (id: string) => {
    setSelected(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
    setNote('');
  };

  const silentGuide = silenceCounter >= 3;

  const doSubmit = async () => {
    if (over) {
      setNote('⚠ 行动点不足，请取消部分选择或减少自由描述行动。');
      return;
    }
    if (usedCount === 0) {
      setNote('请至少选择 1 个编号选项，或填写自由描述。');
      return;
    }
    await submitTurn(selected, freeText);
    setSelected([]);
    setFreeText('');
  };

  return (
    <div className="magazine-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="magazine-section-title">🧭 决策罗盘 · 本月你可以做以下事情</h2>
        <div className="flex items-center gap-2">
          {eggTriggered && <Chip tone="gold">🥚 彩蛋已触发</Chip>}
          <Chip tone={over ? 'accent' : remaining > 0 ? 'steel' : 'moss'}>
            已选：{selected.map(id => circled(compass.find(o => o.id === id)?.no ?? 0)).join(' ') || '—'}
            <span className="mx-1">｜</span>
            剩余行动点：{Math.max(0, remaining)}/{actionPoints.total}
          </Chip>
        </div>
      </div>
      <p className="text-[11px] text-ink/45 mb-4">每项编号消耗 1 行动点 · 可混合自由描述 · 商店选项点击后将在本月结算中直接成交</p>

      <div className="space-y-5">
        {CATEGORY_ORDER.map(cat => {
          const opts = grouped.get(cat) ?? [];
          if (cat === '目标推进' && silentGuide) {
            return (
              <div key={cat}>
                <div className="text-[12px] font-semibold tracking-widest text-steel mb-1.5">—— {CATEGORY_EMOJI[cat]} {cat}（主线） ——</div>
                <p className="text-[12px] text-ink/40 italic px-2">（你暂时没有明确的人生目标推进计划。）</p>
              </div>
            );
          }
          if (cat === '因缘际会' && silentGuide) {
            return (
              <div key={cat}>
                <div className="text-[12px] font-semibold tracking-widest text-steel mb-1.5">—— {CATEGORY_EMOJI[cat]} {cat} ——</div>
                <p className="text-[12px] text-ink/40 italic px-2">（你选择了一段相对安静的时光。）</p>
              </div>
            );
          }
          if (opts.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[12px] font-semibold tracking-widest text-steel mb-2">
                —— {CATEGORY_EMOJI[cat]} {cat}{cat === '商店购物' ? `（本月随机 ${opts.length} 件）` : ''} ——
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {opts.map(o => {
                  const isSel = selected.includes(o.id);
                  const tag = o.urgency ? o.urgency : o.duration && o.duration < 99 ? `⏳ 长期有效` : '⏳ 长期有效';
                  const love = o.love;
                  return (
                    <button key={o.id} onClick={() => toggle(o.id)} className={`compass-option text-left ${isSel ? 'selected' : ''}`}>
                      <span className={`badge-num ${isSel ? '!bg-accent !text-white' : ''}`}>{circled(o.no)}</span>
                      <span className="flex-1 text-[12.5px] leading-relaxed">
                        <span className={`font-medium ${isSel ? 'text-accent' : ''}`}>【{o.sub}】</span>
                        {o.text}
                        {love && <span className="text-[10px] text-accent/70 ml-1">💗</span>}
                        {o.urgency && <span className="ml-1.5 text-[10px] text-accent/80 font-medium">{o.urgency}</span>}
                      </span>
                      <span className={`text-[10px] shrink-0 ${isSel ? 'text-accent' : 'text-ink/35'}`}>{isSel ? '✓' : '＋1 AP'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 自由描述 */}
      <Divider variant="dash" />
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[12px] font-semibold tracking-widest text-steel">✍️ 自由描述</span>
          {freeText.trim() && <Chip tone="accent">消耗 1 行动点</Chip>}
          {isFirstMonth && !eggTriggered && (
            <span className="text-[10px] text-ink/40">（彩蛋提示：首月自由描述输入「拜访作者」有惊喜 ✨）</span>
          )}
        </div>
        <textarea
          className="input-base min-h-[72px] resize-y"
          placeholder="直接描述你本月想做的事，可完全无视上方选项（受 7 行动点限制）……"
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
        />
      </div>

      {lastError && (
        <div className="mt-3 px-3 py-2 rounded-sm bg-accent/8 border border-accent/30 text-[12.5px] text-accent">
          ⚠ {lastError}
        </div>
      )}
      {note && !lastError && (
        <div className="mt-3 px-3 py-2 rounded-sm bg-gold/10 border border-gold/30 text-[12.5px] text-gold">
          {note}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
        <div className="text-[12px] text-ink/50">
          {character && <>👤 {character.name} · {character.age} 岁 · {character.city}</>}
        </div>
        <button className="btn-primary !px-8" disabled={busy || over || usedCount === 0} onClick={doSubmit}>
          {busy ? '⏳ 世界推演中…' : `📨 提交本月行动（${Math.max(0, remaining)}/7 剩余）`}
        </button>
      </div>
    </div>
  );
}
