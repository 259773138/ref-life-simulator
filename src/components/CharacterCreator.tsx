/**
 * 角色创建器（第二章）
 * 步进式：基本信息 → 属性分配 → 选天赋 → 选目标
 */
import React, { useMemo, useState } from 'react';
import type { AttributeKey, Attributes, Gender, LifeGoal } from '../types/game';
import { CITIES, TALENTS, ATTR_LABELS, GOAL_TEMPLATES, cityById, CUSTOM_TIERS } from '../lib/constants';
import { normal, clamp, pick, pickN, randInt, uid, mulberry32, hashString } from '../lib/rng';
import { familyBackgroundOf } from '../lib/world';
import { useGameStore } from '../store/useGameStore';
import { useApiStore } from '../store/useApiStore';
import { Card, Chip, SectionTitle, attrRating } from './ui';

const ATTR_KEYS: AttributeKey[] = ['智力', '情商', '意志', '外貌', '体质', '家境', '运气', '健康'];

function rollBaseAttrs(rand: () => number): Attributes {
  const attrs = {} as Attributes;
  for (const k of ATTR_KEYS) {
    if (k === '家境') attrs[k] = clamp(Math.round(normal(45, 18, rand)), 5, 95);
    else if (k === '健康') attrs[k] = clamp(Math.round(normal(60, 12, rand)), 30, 85);
    else attrs[k] = clamp(Math.round(normal(50, 12, rand)), 20, 80);
  }
  return attrs;
}

const GOAL_TYPES = ['财务', '事业', '家庭', '健康', '技能', '旅行', '社交'] as const;

export default function CharacterCreator() {
  const createCharacter = useGameStore(s => s.createCharacter);
  const depth = useApiStore(s => s.narrativeDepth);
  const setDepth = useApiStore(s => s.setDepth);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(18);
  const [cityId, setCityId] = useState('bj');
  const [customName, setCustomName] = useState('');
  const [customTierKey, setCustomTierKey] = useState('cn2');

  const [baseAttrs, setBaseAttrs] = useState<Attributes>(() => rollBaseAttrs(Math.random));
  const [alloc, setAlloc] = useState<Record<AttributeKey, number>>({ 智力: 0, 情商: 0, 意志: 0, 外貌: 0, 体质: 0, 家境: 0, 运气: 0, 健康: 0 });
  const [talentPool, setTalentPool] = useState<string[]>(() => pickN(TALENTS.map(t => t.id), 2, Math.random));
  const [talentId, setTalentId] = useState<string>('');
  const [goals, setGoals] = useState<Array<{ id: string; title: string; type: LifeGoal['type']; description: string; current?: number; target?: number; unit?: string }>>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [customType, setCustomType] = useState<LifeGoal['type']>('财务');

  const freePoints = 10 - Object.values(alloc).reduce((a, b) => a + b, 0);
  const city = cityById(cityId);
  const family = familyBackgroundOf(baseAttrs.家境 + alloc.家境);
  const finalAttrs = useMemo(() => {
    const out = {} as Attributes;
    for (const k of ATTR_KEYS) {
      const cap = k === '家境' ? 95 : 90;
      out[k] = clamp(baseAttrs[k] + alloc[k], 1, cap);
    }
    return out;
  }, [baseAttrs, alloc]);

  const canNext = step === 1 ? name.trim().length > 0 && name.trim().length <= 12 : true;

  const stepTitles = ['① 基本信息', '② 属性分配', '③ 选天赋', '④ 选目标'];

  const addPoint = (k: AttributeKey) => {
    if (freePoints <= 0) return;
    const cap = k === '家境' ? 95 : 90;
    if (baseAttrs[k] + alloc[k] >= cap) return;
    setAlloc(a => ({ ...a, [k]: a[k] + 1 }));
  };
  const subPoint = (k: AttributeKey) => {
    if (alloc[k] <= 0) return;
    setAlloc(a => ({ ...a, [k]: a[k] - 1 }));
  };
  const rerollAttrs = () => { setBaseAttrs(rollBaseAttrs(Math.random)); setAlloc({ 智力: 0, 情商: 0, 意志: 0, 外貌: 0, 体质: 0, 家境: 0, 运气: 0, 健康: 0 }); };
  const rerollTalents = () => { setTalentPool(pickN(TALENTS.map(t => t.id), 2, Math.random)); setTalentId(''); };

  const toggleGoal = (g: { title: string; type: LifeGoal['type']; description: string; current?: number; target?: number; unit?: string }) => {
    setGoals(list => {
      const exists = list.find(x => x.title === g.title && x.type === g.type);
      if (exists) return list.filter(x => x.id !== exists.id);
      if (list.length >= 3) return list;
      return [...list, { ...g, id: uid('goal') }];
    });
  };

  const addCustomGoal = () => {
    const t = customGoal.trim();
    if (!t || goals.length >= 3) return;
    setGoals(list => [...list, { id: uid('goal'), title: t, type: customType, description: '自定义目标' }]);
    setCustomGoal('');
  };

  const finish = () => {
    createCharacter({
      name: name.trim(),
      gender,
      startAge: age,
      cityId,
      attrs: finalAttrs,
      talentIds: talentId ? [talentId] : [],
      goals: goals.map(g => ({ ...g, achieved: false })),
      narrativeDepth: depth,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 标题 */}
      <div className="text-center mb-8 fade-up">
        <div className="text-[11px] tracking-[0.4em] text-gold mb-2">REF · MODERN LIFE SIMULATOR · V9.0.13</div>
        <h1 className="hero-title font-serifcn font-black text-4xl md:text-5xl tracking-wider">现代人生模拟器</h1>
        <p className="text-[13px] text-ink/50 mt-3">单人月令回合制 · 开放世界人生模拟 · 每月 7 个行动点，书写你的一生</p>
      </div>

      {/* 步骤指示 */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {stepTitles.map((t, i) => (
          <React.Fragment key={t}>
            {i > 0 && <span className="text-ink/25 text-xs">━━</span>}
            <button
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={`px-3 py-1.5 rounded-sm text-[12px] tracking-wider transition-all ${i + 1 === step ? 'bg-accent text-white' : i + 1 < step ? 'text-accent border border-accent/40' : 'text-ink/40 border border-ink/15'}`}
            >
              {t}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* ── 第一步：基本信息 ── */}
      {step === 1 && (
        <Card className="fade-up">
          <SectionTitle icon="🪪" title="基本信息" sub="姓名 · 性别 · 年龄 · 初始城市" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">姓名（中文，现代真实风格）</label>
              <input className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="例如：林晚舟" maxLength={12} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">性别</label>
              <div className="flex gap-2">
                {([['male', '♂ 男'], ['female', '♀ 女']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setGender(v)} className={`flex-1 py-2 rounded-sm border text-[14px] transition-all ${gender === v ? 'border-accent bg-accent/8 text-accent shadow-[inset_0_0_0_1px_#b3402f]' : 'border-ink/15 hover:border-ink/35'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="flex justify-between text-[12px] font-semibold tracking-widest text-steel mb-1.5">
                <span>开局年龄（任意）</span>
                <span className="font-serifcn text-lg text-accent font-bold">{age} 岁</span>
              </label>
              <input
                type="number"
                className="input-base font-serifcn text-lg"
                min={1}
                max={120}
                value={age}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setAge(Number.isFinite(v) ? Math.min(120, Math.max(1, v)) : 1);
                }}
              />
              <div className="flex gap-1.5 mt-1.5">
                {[16, 18, 22, 25, 30, 40].map(a => (
                  <button key={a} onClick={() => setAge(a)} className={`px-2 py-0.5 rounded-sm text-[11px] border transition-all ${age === a ? 'border-accent bg-accent/8 text-accent' : 'border-ink/15 text-ink/50 hover:border-ink/35'}`}>
                    {a} 岁
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-ink/40 mt-1">
                <span>任意年龄均可开局</span>
                <span>16-25 岁为常规开局区间</span>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">叙事详细度（可随时切换）</label>
              <div className="flex gap-2">
                {(['精简', '标准', '沉浸'] as const).map(d => (
                  <button key={d} onClick={() => setDepth(d)} className={`flex-1 py-2 rounded-sm border text-[13px] transition-all ${depth === d ? 'border-accent bg-accent/8 text-accent' : 'border-ink/15'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">初始城市（后期可迁移 · 可选预设或自定义任意城市）</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {CITIES.map(c => (
                  <button key={c.id} onClick={() => setCityId(c.id)} className={`px-2.5 py-1.5 rounded-sm text-left border text-[12px] transition-all ${cityId === c.id ? 'border-accent bg-accent/8 text-accent' : 'border-ink/12 hover:border-ink/35'}`}>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[10px] opacity-60 ml-1">{c.region === 'CN' ? c.tier : '海外·' + c.tier}</span>
                  </button>
                ))}
              </div>

              {/* 自定义城市 */}
              <div className="mt-2.5 rounded-sm border border-dashed border-ink/25 px-3 py-2.5">
                <div className="text-[12px] font-semibold text-steel mb-1.5">✏️ 自定义城市（输入任意城市名即可开局）</div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    className="input-base flex-1 min-w-[150px]"
                    placeholder="例如：大理 / 杭州 / 巴黎 / 曼谷"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    maxLength={12}
                  />
                  <select className="input-base !w-40" value={customTierKey} onChange={e => setCustomTierKey(e.target.value)}>
                    {CUSTOM_TIERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <button
                    className="btn-ghost shrink-0"
                    disabled={!customName.trim()}
                    onClick={() => setCityId(`custom-${customTierKey}-${customName.trim()}`)}
                  >
                    使用该城市
                  </button>
                </div>
                <p className="text-[10.5px] text-ink/40 mt-1">
                  按所选城市等级自动生成房价/薪资/生活成本参数（以城市名为种子，同名城市参数稳定一致）
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-between items-center">
            <div className="text-[12px] text-ink/50">
              🏙️ {city.name} · {city.tags.join(' / ')} · 平均月薪 {city.avgSalary.toLocaleString()} 元
              {cityId.startsWith('custom-') && <span className="ml-1.5 text-[10.5px] text-gold">（自定义城市 · {city.tier}）</span>}
            </div>
            <button className="btn-primary" disabled={!canNext} onClick={() => setStep(2)}>下一步 →</button>
          </div>
        </Card>
      )}

      {/* ── 第二步：属性分配 ── */}
      {step === 2 && (
        <Card className="fade-up">
          <SectionTitle
            icon="📊"
            title="属性分配"
            sub="基础值按正态分布生成（均值 50）· 你拥有 10 点自由分配点"
            right={<Chip tone={freePoints > 0 ? 'accent' : 'moss'}>剩余分配点：{freePoints}</Chip>}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ATTR_KEYS.map(k => {
              const label = ATTR_LABELS.find(l => l.key === k)!;
              const val = finalAttrs[k];
              const rating = attrRating(val);
              return (
                <div key={k} className="attr-cell">
                  <div className="flex items-center gap-1">
                    <span>{label.icon}</span>
                    <span className="attr-name">{label.name}</span>
                    {alloc[k] > 0 && <span className="text-[10px] text-accent font-bold">+{alloc[k]}</span>}
                  </div>
                  <div className="attr-val">{val}</div>
                  <div className={`text-[10px] ${rating.color}`}>{rating.text}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <button onClick={() => subPoint(k)} className="w-6 h-6 rounded-sm border border-ink/15 text-[12px] hover:border-accent">−</button>
                    <span className="text-[10px] text-ink/40 w-6 text-center">{baseAttrs[k]}</span>
                    <button onClick={() => addPoint(k)} className="w-6 h-6 rounded-sm border border-ink/15 text-[12px] hover:border-accent">＋</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-sm bg-gold/8 border border-gold/25 px-4 py-2.5 text-[12px] text-ink/70">
            🏛️ 家境 {finalAttrs.家境} → <b>{family.label}</b>（初始存款 {family.cash.toLocaleString()} 元 · {family.deposit[0].toLocaleString()} ~ {family.deposit[1].toLocaleString()} 元）。家境影响初始资产、可用人脉与教育支持。
          </div>
          <div className="mt-4 flex justify-between">
            <button className="btn-ghost" onClick={rerollAttrs}>🎲 重新随机</button>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setStep(1)}>← 上一步</button>
              <button className="btn-primary" onClick={() => setStep(3)}>下一步 →</button>
            </div>
          </div>
        </Card>
      )}

      {/* ── 第三步：选天赋 ── */}
      {step === 3 && (
        <Card className="fade-up">
          <SectionTitle icon="✨" title="选天赋" sub="先天特质：系统随机给出 2 项候选，选择 1 项作为初始天赋" right={
            <button className="btn-ghost !px-3 !py-1 text-[12px]" onClick={rerollTalents}>🎲 换一批</button>
          } />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {talentPool.map(id => {
              const t = TALENTS.find(x => x.id === id)!;
              const active = talentId === id;
              return (
                <button key={id} onClick={() => setTalentId(id)} className={`text-left p-4 rounded-sm border transition-all ${active ? 'border-accent bg-accent/8 shadow-[inset_0_0_0_1px_#b3402f]' : 'border-ink/15 hover:border-ink/35'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{t.icon}</span>
                    <span className="font-serifcn font-bold text-[15px]">{t.name}</span>
                    {active && <span className="ml-auto text-accent text-[11px]">✓ 已选择</span>}
                  </div>
                  <p className="text-[12px] text-ink/70 mt-2">{t.effect}</p>
                  <p className="text-[10px] text-ink/40 mt-1.5">🔓 解锁：{t.unlock}</p>
                </button>
              );
            })}
          </div>
          <details className="mt-3 text-[12px] text-ink/50">
            <summary className="cursor-pointer">查看全部 10 项特质</summary>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {TALENTS.map(t => (
                <div key={t.id} className="px-2.5 py-1.5 rounded-sm bg-ink/4 text-[11px]">
                  <span className="font-medium">{t.icon} {t.name}</span> — {t.effect}
                </div>
              ))}
            </div>
          </details>
          <div className="mt-4 flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(2)}>← 上一步</button>
            <button className="btn-primary" disabled={!talentId} onClick={() => setStep(4)}>下一步 →</button>
          </div>
        </Card>
      )}

      {/* ── 第四步：选目标 ── */}
      {step === 4 && (
        <Card className="fade-up">
          <SectionTitle icon="🎯" title="选目标" sub="设定 1-3 个人生目标（可随时修改或放弃）" right={<Chip tone="accent">{goals.length}/3</Chip>} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GOAL_TEMPLATES.map((g, i) => {
              const active = goals.some(x => x.title === g.title && x.type === g.type);
              return (
                <button key={i} onClick={() => toggleGoal(g)} className={`text-left px-3 py-2 rounded-sm border text-[12px] transition-all ${active ? 'border-accent bg-accent/8 text-accent' : 'border-ink/12 hover:border-ink/35'}`}>
                  <span className="mr-1.5">{active ? '◉' : '⚪'}</span>
                  <span className="font-medium">{g.title}</span>
                  <span className="text-[10px] opacity-60 ml-1.5">[{g.type}]</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 border-t border-ink/10 pt-4">
            <label className="block text-[12px] font-semibold tracking-widest text-steel mb-1.5">✍️ 自定义目标</label>
            <div className="flex gap-2">
              <select className="input-base !w-28" value={customType} onChange={e => setCustomType(e.target.value as LifeGoal['type'])}>
                {GOAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input className="input-base flex-1" value={customGoal} onChange={e => setCustomGoal(e.target.value)} placeholder="例如：环游世界 / 写一本小说 / 成为百万粉丝博主" />
              <button className="btn-ghost shrink-0" onClick={addCustomGoal} disabled={goals.length >= 3}>添加</button>
            </div>
          </div>
          {goals.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] tracking-widest text-steel mb-1.5">已选目标</div>
              <div className="space-y-1.5">
                {goals.map(g => (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-ink/4 text-[12px]">
                    <span>🎯 {g.title}</span>
                    <span className="text-[10px] text-ink/45">[{g.type}]</span>
                    <button className="ml-auto text-accent/70 text-[11px]" onClick={() => setGoals(list => list.filter(x => x.id !== g.id))}>移除</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 rounded-sm bg-accent/6 border border-accent/25 px-4 py-2.5 text-[12px] text-ink/70">
            📋 角色预览：<b>{name || '未命名'}</b> · {gender === 'male' ? '♂' : '♀'} · {age} 岁 · {city.name} · 家境 {finalAttrs.家境}（{family.label}）
            {talentId && <> · ✨ {TALENTS.find(t => t.id === talentId)?.name}</>}
          </div>
          <div className="mt-4 flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(3)}>← 上一步</button>
            <button className="btn-primary !px-8" onClick={finish}>🚀 开启新人生</button>
          </div>
        </Card>
      )}
    </div>
  );
}
