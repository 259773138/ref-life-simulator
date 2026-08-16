/**
 * 一生回顾（第十五章）& 存档恢复（第十六章）
 * 死亡自动触发一生回顾 · 支持子女继承 / 重开新人生 / 查看回顾
 * 恢复页：输入存档码或从本机存档列表恢复
 */
import React, { useMemo, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { fmtCash } from '../lib/rng';
import { listSaves, isValidCode, normalizeCode } from '../lib/savecode';
import { Card, Chip, SectionTitle } from './ui';

export default function LifeReview() {
  const s = useGameStore();
  const screen = s.screen;
  const inheritAsChild = useGameStore(x => x.inheritAsChild);
  const newGame = useGameStore(x => x.newGame);
  const restoreGame = useGameStore(x => x.restoreGame);
  const [code, setCode] = useState('');
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saves, setSaves] = useState(() => listSaves());

  const eligibleChild = useMemo(() => {
    if (!s.character) return null;
    const kids = s.npcs.filter(n => n.isChild && n.alive).sort((a, b) => (b.ageMonths ?? 0) - (a.ageMonths ?? 0));
    const eldest = kids[0];
    if (!eldest) return null;
    const age = Math.floor((eldest.ageMonths ?? 0) / 12);
    if (age < 16) return null;
    return { npc: eldest, age, adult: age >= 18 };
  }, [s.npcs, s.character]);

  // ── 恢复页 ──
  if (screen === 'restore') {
    const doRestore = (c: string) => {
      const r = restoreGame(c);
      setRestoreMsg({ ok: r.ok, msg: r.message });
      setSaves(listSaves());
    };
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 fade-up">
        <Card className="!p-8">
          <SectionTitle icon="💾" title="存档恢复" sub="输入 8 位存档码（格式 XXXX-XXXX），或从本机存档列表恢复" />
          <div className="flex gap-2">
            <input
              className="input-base font-mono tracking-[0.2em] text-center uppercase"
              placeholder="例如 K7M2-9X4B"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={9}
            />
            <button className="btn-primary shrink-0" disabled={!isValidCode(code)} onClick={() => doRestore(code)}>🔓 恢复</button>
          </div>
          <p className="text-[11px] text-ink/45 mt-1.5">字符集：2-9、A-Z（不含 0/1/I/L/O）· 存档数据保存在本机浏览器</p>

          {restoreMsg && (
            <div className={`mt-3 px-3 py-2 rounded-sm border text-[13px] ${restoreMsg.ok ? 'bg-moss/10 border-moss/30 text-moss' : 'bg-accent/8 border-accent/30 text-accent'}`}>
              {restoreMsg.msg}
            </div>
          )}

          {saves.length > 0 && (
            <div className="mt-5">
              <div className="text-[11px] tracking-widest text-steel mb-2">本机存档列表</div>
              <div className="space-y-1.5">
                {saves.map(sv => (
                  <button key={sv.code} onClick={() => doRestore(sv.code)} className="w-full flex items-center justify-between px-3 py-2 rounded-sm border border-ink/12 hover:border-accent/50 text-[13px]">
                    <span className="font-mono tracking-widest">{sv.code}</span>
                    <span className="text-ink/40 text-[11px]">点击恢复 →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button className="btn-ghost" onClick={() => useGameStore.getState().setScreen('create')}>← 返回创建页</button>
          </div>
        </Card>
      </div>
    );
  }

  // ── 一生回顾 ──
  const c = s.character;
  if (!c) return null;
  const ending = endingType(s);
  const friends = s.npcs.filter(n => n.alive && n.level >= 2 && !n.isChild).length;
  const spouse = s.spouseId ? s.npcs.find(n => n.id === s.spouseId) : null;
  const kids = s.npcs.filter(n => n.isChild && n.alive);
  const achievedGoals = s.goals.filter(g => g.achieved);
  const endingStyle: Record<string, { icon: string; tone: string }> = {
    圆满: { icon: '🌅', tone: 'text-gold' },
    平淡: { icon: '🍵', tone: 'text-ink/60' },
    遗憾: { icon: '🌧️', tone: 'text-steel' },
    传奇: { icon: '🏆', tone: 'text-accent' },
    早逝: { icon: '🕯️', tone: 'text-ink/50' },
    孤独: { icon: '🌙', tone: 'text-steel/70' },
    转折: { icon: '🌄', tone: 'text-moss' },
  };
  const es = endingStyle[ending] ?? endingStyle['平淡'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 fade-up">
      <Card className="!p-6 md:!p-10">
        <div className="text-center mb-8">
          <div className="divider-line" aria-hidden>═══════════════════════════════════</div>
          <h1 className="font-serifcn font-black text-3xl tracking-[0.35em] mt-3">一 生 回 顾</h1>
          <div className="divider-line mt-3" aria-hidden>═══════════════════════════════════</div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-2xl">{es.icon}</span>
            <span className={`font-serifcn font-bold text-lg ${es.tone}`}>结局：{ending}</span>
          </div>
          <p className="text-[13px] text-ink/55 mt-2">{s.deathReason} · 享年 {c.age} 岁</p>
        </div>

        {/* 基本档案 */}
        <Section title="基本档案" icon="🪪">
          <p>{c.name} · {c.gender === 'male' ? '男' : '女'} · {c.startAge} 岁开局 · 出生于 {c.birthCity} · {c.familyBackground}</p>
          <p>人生足迹：{s.memories.length} 段记忆 · 共度过 {s.totalMonths} 个月 · 穿越 {s.deaths + 1} 代人</p>
        </Section>

        {/* 事业轨迹 */}
        <Section title="事业轨迹" icon="💼">
          {s.job ? (
            <p>{s.job.title}（税前 {fmtCash(s.job.salary)} 元/月）· 从业 {s.job.workYears} 年 · 职业层级 {s.job.level ?? '—'}</p>
          ) : (
            <p>一生未长期任职于某一份工作，自由而漂泊。</p>
          )}
        </Section>

        {/* 财务总结 */}
        <Section title="财务总结" icon="💰">
          <p>最终存款：{fmtCash(s.cash)} 元 {s.debt > 0 && `｜ 负债 ${fmtCash(s.debt)} 元`}</p>
          <p>资产：载具 {s.vehicles.length} 辆 ｜ 房产 {s.properties.filter(p => p.owned).length} 处 ｜ 其他藏品 {s.otherItems.length} 件 ｜ 服饰 {s.clothing.length} 件</p>
        </Section>

        {/* 家庭与社交 */}
        <Section title="家庭与社交" icon="👨‍👩‍👧">
          <p>伴侣：{spouse ? `${spouse.name}（${spouse.romanceStage ?? '伴侣/夫妻'}）` : '一生未走入婚姻'}</p>
          <p>子女：{kids.length > 0 ? kids.map(k => `${k.name}（${Math.floor((k.ageMonths ?? 0) / 12)} 岁）`).join('、') : '无'}</p>
          <p>社交圈：密友及以上 {friends} 位 · 曾结识 {s.npcs.length} 位 NPC</p>
        </Section>

        {/* 人生成就 */}
        <Section title="人生成就" icon="🏆">
          {achievedGoals.length > 0 ? (
            achievedGoals.map(g => <p key={g.id}>· {g.title} <span className="text-[11px] text-ink/40">（{g.achievedAt}）</span></p>)
          ) : (
            <p>未能达成任何设定目标，但生活本身也是一种成就。</p>
          )}
        </Section>

        {/* 记忆碎片 */}
        <Section title="记忆碎片" icon="🧩">
          {s.memories.length > 0 ? (
            s.memories.slice(-8).map((m, i) => <p key={i}>· {m}</p>)
          ) : (
            <p>· 平凡的一生，连记忆都平淡如水。</p>
          )}
        </Section>

        {/* 结局叙事 */}
        <Section title="结局叙事" icon="📖">
          <p className="italic leading-7">{endingNarrative(ending, c.name)}</p>
        </Section>

        <div className="divider-line" aria-hidden>═══════════════════════════════════</div>

        {/* 选择 */}
        <div className="mt-6 space-y-2.5">
          {eligibleChild && (
            <button className="w-full btn-primary !py-3.5 !px-6 justify-between text-left" onClick={inheritAsChild}>
              <span>① 以子女身份继续游戏（继承部分资产与人脉）</span>
              <span className="text-[11px] opacity-80">长子/长女 {eligibleChild.npc.name} · {eligibleChild.age} 岁{eligibleChild.adult ? '（成年，100% 继承）' : '（未成年，继承比例 70%）'}</span>
            </button>
          )}
          <button className="w-full btn-primary !py-3 !px-6 justify-between text-left" onClick={() => useGameStore.getState().setScreen('restore')}>
            <span>① 恢复存档（继续某个存档码的人生）</span>
            <span className="text-[11px] opacity-80">→</span>
          </button>
          <button className="w-full btn-ghost !py-3 !px-6 justify-between text-left" onClick={newGame}>
            <span>② 重开新人生</span>
            <span className="text-[11px] opacity-60">从零开始</span>
          </button>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="section-label mb-2">{icon} {title}</div>
      <div className="text-[13.5px] text-ink/75 space-y-1 leading-relaxed">{children}</div>
    </section>
  );
}

function endingType(s: ReturnType<typeof useGameStore.getState>): string {
  const c = s.character!;
  const achieved = s.goals.filter(g => g.achieved).length;
  const spouse = !!s.spouseId && s.npcs.some(n => n.id === s.spouseId && n.alive);
  const friends = s.npcs.filter(n => n.alive && n.level >= 3).length;
  if (c.age < 45) return '早逝';
  if (achieved >= 2 && c.attrs.健康 >= 50 && (spouse || friends >= 2)) return '圆满';
  if (s.cash >= 5000000 || c.age >= 95) return '传奇';
  if (achieved === 0 && c.attrs.健康 < 40 && friends === 0 && !spouse) return '遗憾';
  if (friends === 0 && !spouse && c.age >= 60) return '孤独';
  if (s.cash >= 1000000 || achieved >= 1) return '转折';
  return '平淡';
}

function endingNarrative(type: string, name: string): string {
  const map: Record<string, string> = {
    圆满: `「${name}」的一生，像一首温和的曲子。没有惊天动地，却在不经意间把日子过成了别人羡慕的样子。老去的时候，身边有人，心中有光。`,
    平淡: `「${name}」的一生平淡如水，上班、下班、吃饭、睡觉，偶有涟漪，很快又归于平静。平凡，或许就是大多数人生的答案。`,
    遗憾: `回望一生，「${name}」总觉得有些愿望没能实现。但那些未竟之事，也成了生命的一部分。`,
    传奇: `「${name}」的一生是一部传奇。当后人提起这个名字，眼中仍有光。`,
    早逝: `「${name}」的人生戛然而止，留下许多未完成的计划。生命有时就是这样，来不及告别。`,
    孤独: `「${name}」的晚年是孤独的，与亲友渐渐疏离。但那些独自看过的风景，也是真实的一生。`,
    转折: `「${name}」的一生经历了大起大落，最终归于平静。回头望去，所有的转折都成了故事。`,
  };
  return map[type] ?? map['平淡'];
}
