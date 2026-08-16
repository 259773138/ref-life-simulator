/**
 * 月末结算面板（第十四章 · 界面模板）
 * 月度总结 · 本月纪要 · 收支总览 · 资产变动 · 关系变动 · 属性变动 ·
 * 人生目标 · 下月提醒 · 世界系统检查 · 存档码
 */
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { fmtCash, fmtMoney } from '../lib/rng';
import { Card, Chip } from './ui';

export default function SettlementPanel() {
  const s = useGameStore();
  const st = s.settlement;
  const nextMonth = useGameStore(x => x.nextMonth);
  const saveNow = useGameStore(x => x.saveNow);

  if (!st) return null;

  const income = st.flows.filter(f => f.kind === 'income');
  const expense = st.flows.filter(f => f.kind === 'expense');
  const totalIncome = income.reduce((a, f) => a + f.amount, 0);
  const totalExpense = expense.reduce((a, f) => a + f.amount, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 fade-up">
      <Card className="!p-6 md:!p-8">
        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="divider-line mb-3" aria-hidden>━━━━━━━━━━━━━━━━━━━━━</div>
          <h1 className="font-serifcn font-black text-2xl tracking-[0.3em]">月 度 总 结</h1>
          <div className="divider-line mt-3" aria-hidden>━━━━━━━━━━━━━━━━━━━━━</div>
          <div className="text-[13px] text-ink/55 mt-2">
            {st.month} ｜ 年龄：{s.character!.age} 岁 ｜ {s.character!.city}
          </div>
        </div>

        {/* 一、本月纪要 */}
        <section className="mb-6">
          <div className="section-label">一、本月纪要</div>
          <div className="narrative-text mt-2">{st.narrative}</div>
        </section>

        <div className="divider-line" aria-hidden>─────────────────────────</div>

        {/* 二、收支总览 */}
        <section className="mb-6">
          <div className="section-label">二、收支总览</div>
          <div className="mt-2 overflow-x-auto">
            <table className="flow-table w-full">
              <thead>
                <tr>
                  <th className="w-28">项目</th>
                  <th>明细</th>
                  <th className="text-right w-28">金额（元）</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>上月结余</td>
                  <td className="text-ink/50">—</td>
                  <td className="text-right font-medium">{fmtMoney(st.cashStart)}</td>
                </tr>
                {income.map(f => (
                  <tr key={f.id}>
                    <td className="text-moss">➕ {f.category}</td>
                    <td className="text-ink/60">{f.detail}</td>
                    <td className="text-right text-moss font-medium">+{fmtMoney(f.amount)}</td>
                  </tr>
                ))}
                {expense.map(f => (
                  <tr key={f.id}>
                    <td className="text-accent">➖ {f.category}</td>
                    <td className="text-ink/60">{f.detail}</td>
                    <td className="text-right text-accent font-medium">-{fmtMoney(f.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="!border-t-2 !border-ink/35 font-bold">本月结余</td>
                  <td className="!border-t-2 !border-ink/35 text-ink/50">收入 {fmtMoney(totalIncome)} − 支出 {fmtMoney(totalExpense)}</td>
                  <td className={`!border-t-2 !border-ink/35 text-right font-bold ${st.cashEnd >= 0 ? 'text-moss' : 'text-accent'}`}>{fmtMoney(st.cashEnd)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="divider-line" aria-hidden>─────────────────────────</div>

        {/* 三、资产变动 */}
        <Section title="三、资产变动" items={st.assetNotes} icon="💼" />
        <div className="divider-line" aria-hidden>─────────────────────────</div>

        {/* 四、关系变动 */}
        <Section title="四、关系变动" items={st.relationNotes} icon="🤝" />
        <div className="divider-line" aria-hidden>─────────────────────────</div>

        {/* 五、属性变动 */}
        <Section title="五、属性变动" items={st.attrNotes} icon="📈" />
        <div className="divider-line" aria-hidden>─────────────────────────</div>

        {/* 六、人生目标 */}
        <Section title="六、人生目标" items={st.goalNotes} icon="🎯" />
        <div className="divider-line" aria-hidden>─────────────────────────</div>

        {/* 七、下月提醒 */}
        <section className="mb-6">
          <div className="section-label">七、下月提醒</div>
          <div className="mt-2 space-y-1">
            {st.reminders.length > 0 ? (
              st.reminders.map((r, i) => <p key={i} className="text-[13px] text-ink/70">· {r}</p>)
            ) : (
              <p className="text-[13px] text-ink/40 italic">（无特别提醒）</p>
            )}
          </div>
        </section>

        {/* 系统检查 */}
        <div className="mt-6 pt-4 border-t border-ink/15 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Chip tone="moss">✅ 世界系统检查 · V9.0.13 · 全部模块已执行</Chip>
            <Chip tone="steel">💾 人生已存档 ｜ 存档码：<span className="font-mono font-bold tracking-wider">{st.saveCode}</span></Chip>
          </div>
          <p className="text-[12px] text-ink/45">本月结算完毕 ｜ 下月再会 · 时间如流水，你的故事仍在继续……</p>
        </div>

        {/* 操作 */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button className="btn-ghost" onClick={() => { const code = saveNow(); alert(`已手动存档：${code}`); }}>💾 另存新档</button>
          <button className="btn-primary !px-10" onClick={nextMonth}>⏭ 进入下月</button>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return (
    <section className="mb-6">
      <div className="section-label">{icon} {title}</div>
      <div className="mt-2 space-y-1">
        {items.map((it, i) => (
          <p key={i} className="text-[13px] text-ink/70 leading-relaxed">· {it}</p>
        ))}
      </div>
    </section>
  );
}
