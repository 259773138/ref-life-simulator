/**
 * 每月开局页面（第十四章 · 界面模板）
 * 日期/年龄/寿命 · 位置/通勤/城市特征 · ⚡上月余温 · 基础状态 · 属性面板 ·
 * 人生目标盒子 · 📰城市简报 · 🧭决策罗盘
 */
import React from 'react';
import { useGameStore, effectiveAppearance, clothingLookBonus, buffLookBonus } from '../store/useGameStore';
import { cityById, ATTR_LABELS } from '../lib/constants';
import { fmtCash } from '../lib/rng';
import { Card, Chip, Divider, SectionTitle, Empty, attrRating } from './ui';
import CompassPanel from './CompassPanel';

export default function MonthlyBoard() {
  const s = useGameStore();
  const c = s.character!;
  const city = cityById(c.city);
  const look = effectiveAppearance(s);
  const home = s.properties.find(p => !p.owned && p.usage === '租房');
  const ownHome = s.properties.find(p => p.owned && p.usage === '自住');
  const housing = ownHome ? `自有住房·${ownHome.name}` : home ? `租房·${home.name}（${fmtCash(home.monthlyRent)} 元/月）` : '暂无住所';

  const weatherLine = `${s.weather.weatherIcon} ${s.weather.weather} · ${s.weather.mood}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5 fade-up">
      {/* 头部：日期/年龄/寿命 */}
      <div className="text-center">
        <div className="font-serifcn font-bold text-2xl tracking-wider">
          {s.year} 年 {s.month} 月 <span className="text-ink/40 font-normal text-lg">｜</span> 年龄：<span className="text-accent">{c.age}</span> 岁
          <span className="text-ink/40 font-normal text-lg"> ｜</span> ⏳ 预期寿命：{s.lifeExpectancy} 岁
        </div>
        <p className="text-[12px] text-ink/50 mt-1.5">
          {weatherLine}
        </p>
      </div>

      <Divider variant="bolt" />

      {/* 位置信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="!p-4">
          <div className="text-[11px] tracking-widest text-steel mb-1">📍 当前位置</div>
          <div className="text-[13.5px] font-medium">{c.city} · {c.district ?? '城区'} · {housing.split('·')[1] ?? housing}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] tracking-widest text-steel mb-1">🚇 通勤</div>
          <div className="text-[13.5px] font-medium">
            {s.vehicles.length > 0 ? `${city.commuteNote.replace('地铁', '驾车')}（载具：${s.vehicles[0].name}）` : `地铁 ${city.commuteNote.split('至')[0].replace(/[^\d]/g, '') ?? '40'} 分钟至 ${city.commuteNote.split('至')[1] ?? '市中心'}（当前无载具）`}
          </div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] tracking-widest text-steel mb-1">🏙️ 城市特征</div>
          <div className="text-[13.5px] font-medium">{city.tier}城市 · {city.tags.join(' · ')}</div>
        </Card>
      </div>

      {/* 上月余温 */}
      <Card className="!p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] font-semibold tracking-widest text-steel">⚡ 上月余温</span>
        </div>
        {s.lastWarmth.length > 0 ? (
          <div className="space-y-1">
            {s.lastWarmth.map((w, i) => <p key={i} className="text-[13px] text-ink/70 italic">· {w}</p>)}
          </div>
        ) : (
          <Empty>这个月还没有值得回味的瞬间。</Empty>
        )}
      </Card>

      {/* 基础状态 */}
      <Card>
        <SectionTitle icon="🏠" title="基础状态" sub={`${c.name} · ${c.gender === 'male' ? '♂ 男' : '♀ 女'} · ${c.familyBackground}`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-[13px]">
          <div>
            <div className="text-[10px] tracking-widest text-ink/40 mb-0.5">💼 职业</div>
            <div className="font-medium">{s.job ? `${s.job.title}${s.job.level ? ` · ${s.job.level}` : ''}` : '待业/学生'}</div>
            {s.job && <div className="text-[11px] text-ink/45">税前 {fmtCash(s.job.salary)} 元 ｜ 到手 {fmtCash(s.job.takeHome)} 元</div>}
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-ink/40 mb-0.5">💰 存款 / 负债</div>
            <div className="font-medium text-moss">{fmtCash(s.cash)} 元</div>
            <div className="text-[11px] text-ink/45">{s.debt > 0 ? `负债 ${fmtCash(s.debt)} 元` : '无负债'}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-ink/40 mb-0.5">🏠 住房 / 载具</div>
            <div className="font-medium">{housing}</div>
            <div className="text-[11px] text-ink/45">{s.vehicles.length ? s.vehicles.map(v => v.name).join('、') : '无载具'}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-ink/40 mb-0.5">❤️ 健康 / 情绪</div>
            <div className="font-medium">
              <span className={c.attrs.健康 < 30 ? 'text-accent' : c.attrs.健康 < 60 ? 'text-gold' : 'text-moss'}>
                健康 {c.attrs.健康}
              </span>
              <span className="text-ink/30 mx-1">｜</span>
              <span className={c.emotion < 40 ? 'text-accent' : 'text-ink/70'}>情绪 {c.emotion}</span>
            </div>
            <div className="text-[11px] text-ink/45">{healthDesc(c.attrs.健康)} · {emotionDesc(c.emotion)}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-dashed border-ink/15 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[12.5px]">
          <span>✨ 外貌有效值：<b className="text-accent">{look.total}</b> <span className="text-[11px] text-ink/45">（基础 {look.base} + 服饰 {look.clothing} + 临时 {look.buff}）</span></span>
          {look.overflow > 0 && <Chip tone="gold">溢出 {look.overflow} → 社交 +{Math.floor(look.overflow / 10)}</Chip>}
          <span>⚡ 行动点数：<b>{s.actionPoints.total - s.actionPoints.used}/{s.actionPoints.total}</b></span>
          {s.focusBonus > 0 && <Chip tone="moss">🎯 专注加成 +{s.focusBonus}%</Chip>}
          {s.eggTriggered && s.eggMonthsLeft > 0 && <Chip tone="gold">📱「抖音@Ref 的拆解室」剩余 {s.eggMonthsLeft} 个月</Chip>}
        </div>
      </Card>

      {/* 属性面板 */}
      <Card>
        <SectionTitle icon="📊" title="属性面板" sub="8 项基础属性 · 数值区间：90+ 顶尖 / 80+ 优秀 / 70+ 良好 / 50+ 中等" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ATTR_LABELS.map(l => {
            const v = c.attrs[l.key as keyof typeof c.attrs];
            const r = attrRating(v);
            return (
              <div key={l.key} className="attr-cell !px-1">
                <span className="text-[14px]">{l.icon}</span>
                <span className="attr-name">{l.name}</span>
                <span className="attr-val !text-[15px]">{v}</span>
                <span className={`text-[9px] ${r.color}`}>{r.text}</span>
              </div>
            );
          })}
        </div>
        {c.talents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.talents.map(t => <Chip key={t} tone="accent">✨ {t}</Chip>)}
          </div>
        )}
      </Card>

      {/* 人生目标 */}
      <Card>
        <SectionTitle icon="🎯" title="人生目标" sub="目标达成后可继续游戏 · 可随时修改" />
        <div className="goal-box space-y-2">
          {s.goals.length > 0 ? (
            s.goals.map((g, i) => (
              <div key={g.id} className={`text-[13px] ${g.achieved ? 'text-moss' : ''}`}>
                <span className="mr-1.5">{g.achieved ? '🏆' : '⚪'}</span>
                <b>{g.title}</b>
                {g.target !== undefined && (
                  <span className="text-ink/50 ml-2">
                    （当前 {g.unit === '元' ? fmtCash(g.current ?? 0) : g.current ?? 0}/{g.unit === '元' ? fmtCash(g.target) : g.target}{g.unit ?? ''}）
                  </span>
                )}
                {g.achieved && <span className="ml-2 text-[11px]">✓ 已达成 {g.achievedAt}</span>}
              </div>
            ))
          ) : (
            <Empty>尚未设定人生目标。</Empty>
          )}
        </div>
      </Card>

      {/* 城市简报 */}
      <Card>
        <SectionTitle icon="📰" title={`城市简报 · ${s.year} 年 ${s.month} 月`} right={<Chip tone="steel">⚖ 世界独立运转</Chip>} />
        <div className="space-y-2 text-[12.5px] leading-relaxed">
          <div>
            <div className="text-[11px] tracking-widest text-gold mb-1">一、城市动态</div>
            {s.cityBriefing.dynamics.map((d, i) => <p key={i} className="text-ink/75">· {d}</p>)}
          </div>
          <div>
            <div className="text-[11px] tracking-widest text-gold mb-1">⚖ 二、政策变化</div>
            {s.cityBriefing.policies.map((d, i) => <p key={i} className="text-ink/75">· {d}</p>)}
          </div>
          <div>
            <div className="text-[11px] tracking-widest text-gold mb-1">三、人物消息</div>
            {s.cityBriefing.people.map((d, i) => <p key={i} className="text-ink/75">· {d}</p>)}
          </div>
          <div>
            <div className="text-[11px] tracking-widest text-gold mb-1">四、经济行情</div>
            {s.cityBriefing.economy.map((d, i) => <p key={i} className="text-ink/75">· {d}</p>)}
          </div>
        </div>
      </Card>

      {/* 决策罗盘 */}
      <CompassPanel />
    </div>
  );
}

function healthDesc(v: number): string {
  if (v >= 85) return '精力充沛';
  if (v >= 70) return '健康';
  if (v >= 50) return '亚健康';
  if (v >= 30) return '需要休养';
  return '⚠ 健康预警';
}
function emotionDesc(v: number): string {
  if (v >= 80) return '状态极佳';
  if (v >= 60) return '平稳';
  if (v >= 40) return '轻微焦虑';
  if (v >= 20) return '低落';
  return '⚠ 情绪危机';
}
