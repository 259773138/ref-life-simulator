/**
 * 游戏状态机（store/useGameStore.ts）
 * ─────────────────────────────────────────────────
 * 角色创建 / 每月行动点 / 购买结算 / 属性更新 / 彩蛋判定 / 存档读档
 * 回合引擎：优先调用用户配置的 LLM API，失败或未配置时自动回退本地推演。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AIDiff, CashFlowItem, ClothingItem, CompassOption, CreatePayload, GameState, LifeGoal, NPC, Settlement, ShopOfferData,
} from '../types/game';
import { CITIES, JOBS, cityById } from '../lib/constants';
import { clamp, fmtCash, hashString, mulberry32, pick, pickN, randInt, uid } from '../lib/rng';
import { generateBriefing, generateCompass, generateNPCs, generateWeather, familyBackgroundOf } from '../lib/world';
import { genSaveCode, writeSave } from '../lib/savecode';
import { useApiStore, llmAvailable } from './useApiStore';
import { chatCompletion } from '../lib/ai-client';
import { buildSystemPrompt, buildUserPayload, parseAiResponse } from '../lib/prompt';
import { runLocalTurn } from '../lib/demo-engine';

const VERSION = '9.0.13';
const AP_TOTAL = 7;

interface GameStoreActions {
  createCharacter: (p: CreatePayload) => void;
  submitTurn: (selectedIds: string[], freeText: string) => Promise<void>;
  executePurchase: (option: CompassOption) => { ok: boolean; note: string };
  nextMonth: () => void;
  restoreGame: (code: string) => { ok: boolean; message: string };
  saveNow: () => string;
  newGame: () => void;
  inheritAsChild: () => void;
  setScreen: (s: GameState['screen']) => void;
  clearError: () => void;
}

type Store = GameState & GameStoreActions;

/* ═══ 工具函数 ═══════════════════════════════════ */
export function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}
export function monthLabel(y: number, m: number): string {
  return `${y} 年 ${m} 月`;
}
export function computeLifeExpectancy(attrs: GameState['character'] extends null ? never : any): number {
  const h = attrs.attrs.健康, s = attrs.attrs.体质, l = attrs.attrs.运气;
  return clamp(Math.round(78 + (h - 50) * 0.12 + (s - 50) * 0.08 + (l - 50) * 0.02), 70, 95);
}
export function clothingLookBonus(state: GameState): number {
  return state.clothing.reduce((s, it) => s + it.lookBonus, 0);
}
export function buffLookBonus(state: GameState): number {
  return state.lookBuffs.reduce((s, b) => s + b.value, 0);
}
export function effectiveAppearance(state: GameState): { base: number; clothing: number; buff: number; total: number; overflow: number } {
  const base = state.character!.attrs.外貌;
  const clothing = clothingLookBonus(state);
  const buff = buffLookBonus(state);
  const raw = base + clothing + buff;
  const total = Math.min(100, raw);
  return { base, clothing, buff, total, overflow: Math.max(0, raw - 100) };
}
export function socialFromOverflow(state: GameState): number {
  const { overflow } = effectiveAppearance(state);
  return Math.floor(overflow / 10);
}

function ratingText(v: number): string {
  if (v >= 90) return '顶尖';
  if (v >= 80) return '优秀';
  if (v >= 70) return '良好';
  if (v >= 50) return '中等';
  if (v >= 30) return '偏弱';
  if (v >= 10) return '很差';
  return '极差';
}

/* ═══ 初始状态 ═══════════════════════════════════ */
const initialState = (): GameState => ({
  version: VERSION,
  screen: 'create',
  character: null,
  year: 2026,
  month: 8,
  totalMonths: 0,
  lifeExpectancy: 78,
  actionPoints: { total: AP_TOTAL, used: 0 },
  focus: {},
  focusBonus: 0,
  cash: 0,
  debt: 0,
  liabilities: [],
  flows: [],
  job: null,
  vehicles: [],
  clothing: [],
  properties: [],
  otherItems: [],
  lookBuffs: [],
  npcs: [],
  childrenIds: [],
  goals: [],
  cityBriefing: { dynamics: [], policies: [], people: [], economy: [] },
  weather: { season: '夏', seasonKeys: [], weather: '晴', weatherIcon: '☀️', mood: '' },
  compass: [],
  shopOffers: [],
  compassMonth: '',
  eggTriggered: false,
  eggMonthsLeft: 0,
  eggDividend: 0,
  settlement: null,
  pendingTurn: null,
  busy: false,
  lastError: null,
  memories: [],
  lastWarmth: [],
  log: [],
  saveCode: '',
  deaths: 0,
  dead: false,
  deathReason: '',
  silenceCounter: 0,
});

/* ═══ 基础月收支（自动日常，不消耗行动点） ═══════ */
function baseMonthlyFlows(s: GameState): CashFlowItem[] {
  const flows: CashFlowItem[] = [];
  const city = cityById(s.character!.city);
  const ym = monthKey(s.year, s.month);

  // 收入：月薪
  if (s.job && s.job.takeHome > 0) {
    flows.push({ id: uid('f'), kind: 'income', category: '月薪', detail: `${s.job.title}·到手工资`, amount: s.job.takeHome, month: ym });
  }
  // 彩蛋分红
  if (s.eggTriggered && s.eggMonthsLeft > 0 && s.eggDividend > 0) {
    flows.push({ id: uid('f'), kind: 'income', category: '账号分红', detail: '「抖音@Ref 的拆解室」月度分红', amount: s.eggDividend, month: ym });
  }
  // 出租房产收入
  for (const p of s.properties) {
    if (p.owned && p.usage === '出租') {
      flows.push({ id: uid('f'), kind: 'income', category: '房租收入', detail: `${p.name} 租金`, amount: p.monthlyRent, month: ym });
    }
  }

  // 支出：住房
  const residence = s.properties.find(p => !p.owned && p.usage === '租房');
  if (residence) {
    flows.push({ id: uid('f'), kind: 'expense', category: '房租', detail: `${residence.name} 月付`, amount: residence.monthlyRent, month: ym });
  }
  const ownedHome = s.properties.find(p => p.owned && p.usage === '自住');
  if (ownedHome) {
    flows.push({ id: uid('f'), kind: 'expense', category: '物业费', detail: `${ownedHome.name} 物业费`, amount: ownedHome.propertyFee, month: ym });
  }
  // 餐饮（随城市生活成本浮动）
  const food = Math.round(1600 * (city.costIndex / 90));
  flows.push({ id: uid('f'), kind: 'expense', category: '餐饮', detail: '日常饮食', amount: food, month: ym });
  // 交通
  const hasVehicle = s.vehicles.length > 0;
  const transport = Math.round((hasVehicle ? 260 : 520) * (city.costIndex / 90));
  flows.push({ id: uid('f'), kind: 'expense', category: '交通', detail: hasVehicle ? '油费/电费+停车' : '地铁+公交+打车', amount: transport, month: ym });
  // 生活用品
  flows.push({ id: uid('f'), kind: 'expense', category: '生活用品', detail: '日用品、话费、水电', amount: Math.round(480 * (city.costIndex / 90)), month: ym });
  // 载具维护
  for (const v of s.vehicles) {
    flows.push({ id: uid('f'), kind: 'expense', category: '载具维护', detail: `${v.name} 维护`, amount: v.upkeep, month: ym });
  }
  // 分期负债
  for (const l of s.liabilities) {
    flows.push({ id: uid('f'), kind: 'expense', category: '分期还款', detail: `${l.name} 第 ${l.total - l.remaining + 1}/${l.total} 期`, amount: l.monthly, month: ym });
  }
  // 子女抚养
  const kids = s.npcs.filter(n => n.isChild && n.alive);
  if (kids.length > 0) {
    const cost = kids.reduce((sum, k) => sum + (k.ageMonths! < 72 ? 2500 : k.ageMonths! < 216 ? 3000 : 1500), 0);
    flows.push({ id: uid('f'), kind: 'expense', category: '子女抚养', detail: `${kids.length} 个孩子的生活与教育`, amount: cost, month: ym });
  }
  return flows;
}

/* ═══ Store ═══════════════════════════════════════ */
export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      /* ── 角色创建 ── */
      createCharacter: (p) => {
        const city = cityById(p.cityId);
        const family = familyBackgroundOf(p.attrs.家境);
        const rand = mulberry32(hashString(`${p.name}-${p.startAge}-${p.cityId}-${p.gender}`));

        // 初始住房（租房，押一付三）
        const rent = Math.round(1800 * city.rentFactor + randInt(-200, 400));
        const rental: any = {
          id: uid('prop'), name: `${city.name}·合租单间`, tier: '租房', usage: '租房',
          price: 0, basePrice: 0, monthlyRent: rent, propertyFee: 0, owned: false, deposit: rent,
        };

        // 初始服饰
        const starterClothes: ClothingItem[] = [
          { id: uid('clo'), name: '基础纯色 T 恤', tier: '快时尚', price: 89, slot: '上装', lookBonus: 1, socialBonus: 0 },
          { id: uid('clo'), name: '百搭休闲鞋', tier: '快时尚', price: 199, slot: '鞋履', lookBonus: 1, socialBonus: 0 },
        ];

        // 初始 NPC
        const npcs = generateNPCs(city, family.label, `${p.name}-${p.cityId}-seed`, rand() < 0.5 ? 18 : 17);

        // 初始职业（按年龄分层：<16 学生 / 16-22 学生·兼职 / 23+ 就业 / 30+ 主管 / 40+ 经理 / 55+ 资深）
        let job = null;
        const jobChance = p.startAge >= 30 ? 1 : p.startAge >= 26 ? 0.9 : p.startAge >= 23 ? 0.55 : p.startAge >= 18 ? 0.25 : 0;
        if (p.startAge >= 18 && p.attrs.智力 >= 40 && rand() < jobChance) {
          const pool = JOBS.filter(j => ['无', '本科', '本科/培训', '本科+资格证', '专科+执照', '无/相关经验', '驾照'].includes(j.gate) && j.stability !== '极低');
          const j = pick(pool, rand);
          const levelOf = p.startAge >= 55 ? '资深顾问' : p.startAge >= 40 ? '经理' : p.startAge >= 30 ? '主管' : '专员';
          const salaryMult = p.startAge >= 55 ? 1.6 : p.startAge >= 40 ? 1.35 : p.startAge >= 30 ? 1.2 : 1;
          const salary = Math.round(j.salary * salaryMult);
          job = { title: j.title, company: `${city.name}·本地企业`, salary, takeHome: Math.round(salary * 0.8), workYears: Math.max(0, p.startAge - 22), level: levelOf, industry: city.industry[0] };
        }

        const year = 2026, month = 8;
        const weather = generateWeather(month, rand);
        const base: GameState = {
          ...initialState(),
          version: VERSION,
          screen: 'playing',
          character: {
            name: p.name, gender: p.gender, age: p.startAge, startAge: p.startAge,
            birthCity: city.name, city: city.name,
            district: city.commuteNote, familyBackground: family.label,
            attrs: { ...p.attrs }, talents: p.talentIds, emotion: 60, narrativeDepth: p.narrativeDepth,
          },
          year, month, totalMonths: 0,
          lifeExpectancy: Math.max(computeLifeExpectancy({ attrs: p.attrs }), p.startAge + 10),
          cash: family.cash,
          job,
          npcs,
          goals: p.goals,
          weather,
          properties: [rental],
          clothing: starterClothes,
        };
        base.cityBriefing = generateBriefing(base, rand);
        const compass = generateCompass(base, rand);
        base.compass = compass.options;
        base.shopOffers = compass.offers;
        base.compassMonth = monthKey(year, month);
        base.lastWarmth = ['欢迎来到这个世界。你的故事，从今天开始。'];
        set(base);
      },

      /* ── 提交本月行动 ── */
      submitTurn: async (selectedIds, freeText) => {
        const s = get();
        if (s.busy || !s.character) return;

        const selected = s.compass.filter(o => selectedIds.includes(o.id));
        const hasFree = freeText.trim().length > 0;
        const cost = selected.length + (hasFree ? 1 : 0);
        if (cost > AP_TOTAL) {
          set({ lastError: `⚠ 行动点不足：已选 ${cost} 项，超过每月上限 7 点。请取消部分选择或减少自由描述。` });
          return;
        }
        set({ busy: true, lastError: null });

        const notes: string[] = [];
        const flows: CashFlowItem[] = [];
        const assetNotes: string[] = [];
        const relationNotes: string[] = [];
        const attrNotes: string[] = [];
        const goalNotes: string[] = [];
        const reminders: string[] = [];
        const events: string[] = [];
        let narrativeExtra = '';

        let cash = s.cash;
        let debt = s.debt;
        let attrs = { ...s.character.attrs };
        let emotion = s.character.emotion;
        let npcs = s.npcs.map(n => ({ ...n }));
        let job = s.job ? { ...s.job } : null;
        let lookBuffs = s.lookBuffs.map(b => ({ ...b }));
        let goals = s.goals.map(g => ({ ...g }));
        let liabilities = s.liabilities.map(l => ({ ...l }));
        let vehicles = s.vehicles.map(v => ({ ...v }));
        let clothing = s.clothing.map(c => ({ ...c }));
        let properties = s.properties.map(p => ({ ...p }));
        let otherItems = s.otherItems.map(o => ({ ...o }));
        const memories = [...s.memories];
        let eggTriggered = s.eggTriggered;
        let eggMonthsLeft = s.eggMonthsLeft;

        /* ── 彩蛋判定（第五章） ── */
        const eggKeyword = '拜访作者';
        if (!eggTriggered && s.totalMonths === 0 && hasFree && freeText.includes(eggKeyword)) {
          eggTriggered = true;
          eggMonthsLeft = 12;
          cash += 10000000;
          memories.push(`你在城市的某个隐秘角落见到了这个世界的创造者。`);
          narrativeExtra = `✨ ━━━━━━━━━━━━━━━━━━━ ✨\n彩蛋触发：拜访作者\n你在城市的某个隐秘角落，见到了这个世界的创造者。他递给你一部手机，屏幕上是一个名为「抖音@Ref 的拆解室」的账号。\n"这个号借你用一年。每个月会有点分红，怎么用，你自己决定。"\n你获得「抖音@Ref 的拆解室」使用权（12 个月）\n现金 +10,000,000 元\n每月分红 +100,000 元（持续 12 个月）\n✨ ━━━━━━━━━━━━━━━━━━━ ✨`;
          events.push('彩蛋');
          assetNotes.push('✨ 触发隐藏彩蛋「拜访作者」：现金 +10,000,000 元');
          reminders.push('「抖音@Ref 的拆解室」账号将在 12 个月后被收回');
        }

        /* ── 商店购物立即执行（第六章：选即买） ── */
        const shopSelections = selected.filter(o => o.category === '商店购物');
        for (const opt of shopSelections) {
          const offer = s.shopOffers.find(of => of.id === opt.shopItemId);
          if (offer) {
            const r = executePurchaseCore({
              cash, debt, attrs, emotion, npcs, vehicles, clothing, properties, otherItems, liabilities,
              job, offer, flows, notes, assetNotes, reminders, monthKey: monthKey(s.year, s.month),
            });
            cash = r.cash; debt = r.debt; attrs = r.attrs; emotion = r.emotion;
            vehicles = r.vehicles; clothing = r.clothing; properties = r.properties;
            otherItems = r.otherItems; liabilities = r.liabilities;
            notes.push(r.note);
          } else {
            notes.push(`❌ 购物选项「${opt.text}」货架已更新，未能完成交易。`);
          }
        }

        /* ── 引擎（LLM 或本地） ── */
        const nonShop = selected.filter(o => o.category !== '商店购物');
        const { config, mode, narrativeDepth } = useApiStore.getState();
        let narrative = '';
        let diff: AIDiff | null = null;
        let engineNote = '';

        const tryLLM = llmAvailable();
        if (tryLLM) {
          try {
            const messages = [
              { role: 'system' as const, content: buildSystemPrompt() },
              { role: 'user' as const, content: buildUserPayload({ ...s, character: { ...s.character }, npcs, goals, cash, job, attrs: { ...attrs } } as GameState, nonShop.map(o => o.text), freeText, nonShop) },
            ];
            const res = await chatCompletion(config, messages, {
              temperature: config.temperature,
              max_tokens: config.maxTokens,
              model: config.model,
            });
            const parsed = parseAiResponse(res.content);
            narrative = parsed.narrative;
            diff = parsed.diff;
            if (mode === 'auto') engineNote = `（引擎：${res.model}）`;
          } catch (err) {
            if (mode === 'llm') {
              set({ busy: false, lastError: `LLM 调用失败：${err instanceof Error ? err.message : String(err)}。可在「API 设置」中切换为自动/本地模式后重试。` });
              return;
            }
            engineNote = `（LLM 调用失败，已回退本地推演：${err instanceof Error ? err.message.slice(0, 60) : ''}）`;
          }
        }
        if (!narrative) {
          const local = runLocalTurn({ ...s, character: { ...s.character, attrs: { ...attrs } }, npcs, goals, cash, job } as GameState, nonShop, freeText);
          narrative = local.narrative;
          diff = local.diff;
          if (!tryLLM) engineNote = narrativeDepth === '沉浸' ? '' : '（本地推演模式：配置 API Key 可获得更沉浸的 AI 叙事）';
        }
        narrative = [narrativeExtra, narrative].filter(Boolean).join('\n\n');

        /* ── 应用 diff ── */
        if (diff) {
          if (diff.income) diff.income.forEach(i => {
            flows.push({ id: uid('f'), kind: 'income', category: i.item, detail: i.detail, amount: Math.round(i.amount), month: monthKey(s.year, s.month) });
          });
          if (diff.expenses) diff.expenses.forEach(e => {
            flows.push({ id: uid('f'), kind: 'expense', category: e.item, detail: e.detail, amount: Math.round(e.amount), month: monthKey(s.year, s.month) });
          });
          if (diff.cash) cash += diff.cash;
          if (diff.attributes) {
            for (const [k, v] of Object.entries(diff.attributes)) {
              if (k in attrs && typeof v === 'number') {
                attrs[k as keyof typeof attrs] = clamp(attrs[k as keyof typeof attrs] + v, 1, 100);
                if (v !== 0) attrNotes.push(`${attrIcon(k)}${k} ${v > 0 ? `+${v}` : v}（${ratingText(attrs[k as keyof typeof attrs])}）`);
              }
            }
          }
          if (diff.emotion) emotion = clamp(emotion + diff.emotion, 0, 100);
          if (diff.lookBuffs) {
            diff.lookBuffs.forEach(b => {
              lookBuffs.push({ id: uid('buff'), name: b.name, value: b.value, remaining: b.duration, source: '事件' });
              if (b.cost) flows.push({ id: uid('f'), kind: 'expense', category: '形象管理', detail: b.name, amount: b.cost, month: monthKey(s.year, s.month) });
              attrNotes.push(`✨ ${b.name}：外貌临时 +${b.value}（持续 ${b.duration} 个月）`);
            });
          }
          if (diff.relationships) {
            for (const [name, v] of Object.entries(diff.relationships)) {
              const npc = npcs.find(n => n.name === name);
              if (npc) {
                if (v.intimacy) {
                  npc.intimacy = clamp(npc.intimacy + v.intimacy, 0, 100);
                  npc.interactions += 1;
                  npc.lastContactMonth = monthKey(s.year, s.month);
                }
                if (v.heart !== undefined) npc.heart = clamp(npc.heart + v.heart, 0, 100);
                relationNotes.push(`🤝 ${name}：亲密度${v.intimacy ? `${v.intimacy > 0 ? '+' : ''}${v.intimacy}` : '不变'}${v.heart ? `，心动值${v.heart > 0 ? '+' : ''}${v.heart}` : ''}${v.note ? `（${v.note}）` : ''}`);
                // 恋爱阶段联动
                updateRomanceStage(npc);
              } else {
                relationNotes.push(`🤝 ${name}：${v.note ?? '关系变化'}`);
              }
            }
          }
          if (diff.newNPCs) {
            diff.newNPCs.forEach(n => {
              if (!npcs.some(x => x.name === n.name)) {
                npcs.push({
                  id: uid('npc'), name: n.name, gender: n.gender, age: n.age ?? randInt(20, 35), city: n.city ?? s.character!.city,
                  job: n.job ?? '自由职业者', incomeBand: n.incomeBand ?? '中',
                  appearance: n.appearance ?? '普通', traits: n.traits?.length ? n.traits : ['友善'],
                  lifestyle: n.lifestyle ?? '普通', family: n.family ?? '普通家庭', goal: n.goal ?? '安稳生活',
                  preference: n.preference ?? ['性格'], intimacy: clamp(n.intimacy ?? 20, 0, 100),
                  heart: n.heart ?? 0, level: (n.intimacy ?? 20) >= 40 ? 2 : (n.intimacy ?? 20) >= 20 ? 1 : 0,
                  location: n.location ?? '城市一角', interactions: 0, alive: true,
                });
                relationNotes.push(`✨ 新认识：${n.name}（${n.job}）`);
              }
            });
          }
          if (diff.events) diff.events.forEach(e => events.push(e));
          if (diff.debt) debt = Math.max(0, debt + diff.debt);
          if (diff.job) {
            if (diff.job === null) {
              job = null;
              notes.push('💼 你离开了原岗位。');
            } else {
              job = { title: diff.job.title, salary: diff.job.salary, takeHome: Math.round(diff.job.salary * 0.8), workYears: job?.workYears ?? 0, level: job?.level, company: diff.job.company };
              attrNotes.push(`💼 新工作：${diff.job.title}（月薪 ${fmtCash(diff.job.salary)} 元）`);
            }
          }
          if (diff.cityChange) {
            // 简化迁移：迁入目标城市
            const target = CITIES.find(c => c.name === diff.cityChange);
            if (target) {
              const migrateCost = randInt(1000, 5000);
              cash -= migrateCost;
              flows.push({ id: uid('f'), kind: 'expense', category: '迁移', detail: `搬家至${target.name}`, amount: migrateCost, month: monthKey(s.year, s.month) });
              notes.push(`🚚 你迁移到了${target.name}。`);
              events.push('迁移');
            }
          }
          if (diff.reminders) reminders.push(...diff.reminders);
          if (diff.memory) memories.push(diff.memory);
        }

        /* ── 基础月收支 ── */
        const baseFlows = baseMonthlyFlows({ ...s, job, cash, npcs, properties, vehicles, liabilities } as GameState);
        flows.push(...baseFlows);
        const totalIncome = flows.filter(f => f.kind === 'income').reduce((a, f) => a + f.amount, 0);
        const totalExpense = flows.filter(f => f.kind === 'expense').reduce((a, f) => a + f.amount, 0);
        const cashStart = s.cash;
        cash = cashStart + totalIncome - totalExpense;

        // 负债月供扣除与到期
        let debtNow = debt;
        for (const l of liabilities) {
          l.remaining -= 1;
          if (l.remaining <= 0) {
            assetNotes.push(`✅ ${l.name} 已还清`);
          }
        }
        const activeLiabilities = liabilities.filter(l => l.remaining > 0);
        debtNow = Math.max(0, activeLiabilities.reduce((a, l) => a + l.monthly * l.remaining, 0));

        /* ── 专注加成（第三章） ── */
        const focus = { ...s.focus };
        const focusTargets = nonShop.map(o => o.sub);
        let focusBonus = 0;
        if (focusTargets.length > 0) {
          for (const t of focusTargets) focus[t] = (focus[t] ?? 0) + 1;
          const top = Math.max(...focusTargets.map(t => focus[t] ?? 0));
          focusBonus = Math.min(30, Math.max(0, (top - 1) * 10));
        }
        if (focusBonus > 0) notes.push(`⚡ 专注加成：连续 ${topFocusMonths(focus, focusTargets)} 个月投入同一目标，本季效果 +${focusBonus}%`);

        /* ── 目标进度更新 ── */
        for (const g of goals) {
          if (g.achieved) continue;
          if (g.type === '财务' && g.target && g.unit === '元') {
            const before = g.current ?? 0;
            g.current = Math.max(0, Math.round(cash));
            if (g.current >= g.target) {
              g.achieved = true; g.achievedAt = monthKey(s.year, s.month);
              goalNotes.push(`🏆 目标达成：「${g.title}」`); events.push('目标达成');
            }
          }
          if (g.type === '健康' && g.unit === '岁' && g.target) {
            g.current = s.character!.age;
            if (g.current >= g.target) { g.achieved = true; g.achievedAt = monthKey(s.year, s.month); goalNotes.push(`🏆 目标达成：「${g.title}」`); }
          }
          if (g.type === '社交' && g.unit === '人' && g.target) {
            const friends = npcs.filter(n => n.alive && n.level >= 2).length;
            g.current = friends;
            if (friends >= g.target) { g.achieved = true; g.achievedAt = monthKey(s.year, s.month); goalNotes.push(`🏆 目标达成：「${g.title}」`); }
          }
          if (g.type === '家庭' && g.unit === '人') {
            const hasSpouse = !!s.spouseId && npcs.some(n => n.id === s.spouseId && n.romanceStage === '伴侣/夫妻');
            const hasKid = npcs.some(n => n.isChild && n.alive);
            if (hasSpouse && hasKid && !g.achieved) { g.achieved = true; g.achievedAt = monthKey(s.year, s.month); goalNotes.push(`🏆 目标达成：「${g.title}」`); }
          }
          if (g.type === '事业' && g.unit === '级') {
            if (job && job.level && ['经理', '总监', '副总裁'].includes(job.level) && !g.achieved) { g.achieved = true; g.achievedAt = monthKey(s.year, s.month); goalNotes.push(`🏆 目标达成：「${g.title}」`); }
          }
        }

        /* ── 沉默计数（第二章 · 引导暂停） ── */
        const silenceCounter = nonShop.some(o => /目标|事件/.test(o.sub)) ? 0 : s.silenceCounter + 1;

        /* ── 情绪环境影响 ── */
        const residence = properties.find(p => !p.owned && p.usage === '租房');
        if (residence) {
          emotion = clamp(emotion + 1, 0, 100);
        }
        const ownedHome2 = properties.find(p => p.owned && p.usage === '自住');
        if (ownedHome2) emotion = clamp(emotion + 2, 0, 100);

        /* ── 健康预警 ── */
        if (s.character.age > 70 || attrs.健康 < 30) {
          reminders.push(`⚠ 健康预警：年龄 ${s.character.age} 岁 / 健康值 ${attrs.健康}，请注意身体。`);
        }

        /* ── 结算 ── */
        const saveCode = genSaveCode();
        const settlement: Settlement = {
          month: monthLabel(s.year, s.month),
          narrative: narrative.trim() + (engineNote ? `\n\n${engineNote}` : ''),
          flows: flows.slice().sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'income' ? -1 : 1)),
          cashStart: Math.round(cashStart),
          cashEnd: Math.round(cash),
          debtAfter: Math.round(debtNow),
          assetNotes: notes.length ? notes : ['（本月无特殊资产变动）'],
          relationNotes: relationNotes.length ? relationNotes : ['（本月无特别关系变动）'],
          attrNotes: attrNotes.length ? attrNotes : ['（本月属性平稳）'],
          goalNotes: goalNotes.length ? goalNotes : ['（目标仍在推进中）'],
          reminders: reminders.slice(0, 6),
          events,
          saveCode,
          memory: diff?.memory ?? (narrativeExtra ? '你触发了隐藏彩蛋。' : ''),
          summaryLines: [],
        };

        const newState: Partial<GameState> = {
          busy: false,
          cash: Math.round(cash),
          debt: Math.round(debtNow),
          liabilities: activeLiabilities,
          npcs,
          job,
          goals,
          character: { ...s.character, attrs: { ...attrs }, emotion: Math.round(emotion) },
          lookBuffs,
          memories: memories.slice(-60),
          focus,
          focusBonus,
          silenceCounter,
          actionPoints: { total: AP_TOTAL, used: cost },
          settlement,
          flows: [...flows, ...s.flows].slice(0, 120),
          eggTriggered,
          eggMonthsLeft,
          lastWarmth: settlement.memory ? [settlement.memory] : [],
          saveCode,
          screen: 'settlement',
          pendingTurn: { selectedIds, freeText, month: monthKey(s.year, s.month) },
        };
        // 属性更新后同步外貌基础值
        if (newState.character) {
          newState.character.attrs.外貌 = clamp(newState.character.attrs.外貌, 1, 100);
        }

        // 死亡判定（第十章）
        if (attrs.健康 <= 0) {
          newState.dead = true;
          newState.deathReason = '疾病缠身，健康值归零';
          newState.screen = 'review';
        } else if (s.character.age >= s.lifeExpectancy + 3) {
          newState.dead = true;
          newState.deathReason = `寿终正寝（${s.character.age} 岁，超过预期寿命）`;
          newState.screen = 'review';
        } else if (Math.random() < accidentChance(attrs.健康, attrs.运气)) {
          newState.dead = true;
          newState.deathReason = '遭遇意外事故';
          newState.screen = 'review';
        }

        writeSave(saveCode, {
          state: { ...get(), ...newState, busy: false, lastError: null },
          at: monthKey(s.year, s.month),
          name: s.character?.name,
          version: VERSION,
        });

        set(newState as GameState);
      },

      executePurchase: (option) => {
        // 立即购买（从罗盘点击时调用）
        const s = get();
        const offer = s.shopOffers.find(of => of.id === option.shopItemId);
        if (!offer) return { ok: false, note: '该商品已下架' };
        const r = executePurchaseCore({
          cash: s.cash, debt: s.debt, attrs: { ...s.character!.attrs }, emotion: s.character!.emotion, npcs: s.npcs,
          vehicles: s.vehicles, clothing: s.clothing, properties: s.properties, otherItems: s.otherItems,
          liabilities: s.liabilities, job: s.job, offer,
          flows: [], notes: [], assetNotes: [], reminders: [], monthKey: monthKey(s.year, s.month),
        });
        set({
          cash: r.cash, debt: r.debt, character: { ...s.character!, attrs: r.attrs, emotion: r.emotion },
          vehicles: r.vehicles, clothing: r.clothing, properties: r.properties, otherItems: r.otherItems,
          liabilities: r.liabilities,
        });
        return { ok: r.ok, note: r.note };
      },

      /* ── 下月 ── */
      nextMonth: () => {
        const s = get();
        if (!s.character) return;
        let { year, month, totalMonths } = s;
        totalMonths += 1;
        month += 1;
        if (month > 12) { month = 1; year += 1; }
        const age = s.character.startAge + Math.floor((totalMonths - 1) / 12);
        const rand = mulberry32(hashString(`${year}-${month}-next`));

        // 彩蛋账号到期
        let eggMonthsLeft = Math.max(0, s.eggMonthsLeft - 1);
        const eggNote = s.eggMonthsLeft === 1 && s.eggTriggered ? '「抖音@Ref 的拆解室」使用期已满，账号已被收回。' : null;

        // 临时 buff 衰减
        const lookBuffs = s.lookBuffs.map(b => ({ ...b, remaining: b.remaining - 1 })).filter(b => b.remaining > 0);

        // NPC 亲密度衰减（异地加速、久未联系衰减）
        const npcs = s.npcs.map(n => {
          const out = { ...n };
          if (!out.alive) return out;
          const away = out.city !== s.character!.city;
          const noContact = !out.lastContactMonth;
          if (noContact || monthsSince(out.lastContactMonth, year, month) >= 6) {
            out.intimacy = clamp(out.intimacy - (away ? randInt(3, 5) : randInt(1, 3)), 0, 100);
          }
          if (away && out.level > 0 && monthsSince(out.lastContactMonth, year, month) >= 2) {
            out.intimacy = clamp(out.intimacy - randInt(1, 2), 0, 100);
          }
          return out;
        });

        const base: GameState = {
          ...s,
          year, month, totalMonths,
          character: { ...s.character, age },
          lifeExpectancy: computeLifeExpectancy(s.character),
          actionPoints: { total: AP_TOTAL, used: 0 },
          lookBuffs,
          npcs,
          eggMonthsLeft,
          settlement: null,
          busy: false,
          lastError: null,
          silenceCounter: s.silenceCounter,
        };
        base.weather = generateWeather(month, rand);
        base.cityBriefing = generateBriefing(base, rand);
        const compass = generateCompass(base, rand);
        base.compass = compass.options;
        base.shopOffers = compass.offers;
        base.compassMonth = monthKey(year, month);
        base.lastWarmth = s.lastWarmth.length ? s.lastWarmth : [];
        base.screen = 'playing';
        if (eggNote) {
          base.log = [...s.log.slice(-40), `✨ ${eggNote}`];
        }
        // 自然衰老 / 意外（低概率）
        if (age >= s.lifeExpectancy + 3) {
          base.dead = true;
          base.deathReason = `寿终正寝（${age} 岁）`;
          base.screen = 'review';
        } else if (base.character && base.character.attrs.健康 < 30 && Math.random() < 0.015) {
          base.dead = true;
          base.deathReason = '突发疾病，抢救无效';
          base.screen = 'review';
        }
        set(base);
      },

      /* ── 存档 ── */
      saveNow: () => {
        const s = get();
        const code = genSaveCode();
        writeSave(code, { state: s, at: monthKey(s.year, s.month), name: s.character?.name, version: VERSION });
        set({ saveCode: code });
        return code;
      },

      restoreGame: (code) => {
        const data = readSaveAny(code);
        if (!data) return { ok: false, message: `未找到存档 ${code}。请确认存档码无误。` };
        if (data.state && data.state.character) {
          set({ ...data.state, screen: 'playing', busy: false, lastError: null });
          return { ok: true, message: `✅ 存档恢复成功：${data.state.character.name} · ${monthLabel(data.state.year, data.state.month)}` };
        }
        return { ok: false, message: '存档数据损坏，无法恢复。' };
      },

      newGame: () => {
        set({ ...initialState(), screen: 'create' });
      },

      inheritAsChild: () => {
        const s = get();
        const kids = s.npcs.filter(n => n.isChild && n.alive).sort((a, b) => (b.ageMonths ?? 0) - (a.ageMonths ?? 0));
        const child = kids[0];
        if (!child) return;
        const childAge = Math.floor((child.ageMonths ?? 0) / 12);
        const keepNpcs = s.npcs.filter(n => n.alive && n.level >= 2 && n.id !== child.id && !n.isChild);
        const kept = keepNpcs.slice(0, Math.ceil(keepNpcs.length * 0.3)).map(n => ({ ...n, intimacy: Math.round(n.intimacy * 0.5), level: Math.max(1, n.level - 1) as NPC['level'] }));
        const city = cityById(s.character!.city);
        const newNpcs = generateNPCs(city, s.character!.familyBackground, `${child.name}-inherit-${Date.now()}`, 14).concat(kept);
        const rand = mulberry32(hashString(`${child.name}-inherit`));
        const base: GameState = {
          ...initialState(),
          version: VERSION,
          screen: 'playing',
          character: {
            name: child.name, gender: child.gender, age: childAge, startAge: childAge,
            birthCity: s.character!.birthCity, city: s.character!.city,
            district: s.character!.district, familyBackground: s.character!.familyBackground,
            attrs: {
              智力: clamp(Math.round(s.character!.attrs.智力 * 0.4 + randInt(20, 50)), 20, 95),
              情商: clamp(Math.round(s.character!.attrs.情商 * 0.4 + randInt(20, 50)), 20, 95),
              意志: clamp(Math.round(s.character!.attrs.意志 * 0.4 + randInt(20, 50)), 20, 95),
              外貌: clamp(Math.round(s.character!.attrs.外貌 * 0.4 + randInt(30, 60)), 20, 95),
              体质: clamp(Math.round(s.character!.attrs.体质 * 0.4 + randInt(20, 50)), 20, 95),
              家境: clamp(Math.round(s.character!.attrs.家境 * 0.5 + 10), 20, 95),
              运气: randInt(30, 70),
              健康: randInt(60, 90),
            },
            talents: pickN(['memory', 'social', 'iron', 'beauty', 'sturdy', 'business', 'number', 'art', 'lang'], 1, rand),
            emotion: 60, narrativeDepth: s.character!.narrativeDepth,
          },
          year: s.year, month: s.month, totalMonths: 0,
          lifeExpectancy: 80,
          cash: Math.round(s.cash * 0.5),
          debt: 0,
          vehicles: s.vehicles.map(v => ({ ...v })),
          clothing: s.clothing.map(c => ({ ...c })),
          properties: s.properties.map(p => ({ ...p })),
          otherItems: s.otherItems.map(o => ({ ...o })),
          npcs: newNpcs,
          goals: [],
          memories: [`你以${child.name}的身份，继续书写这个家族的故事。`],
          lastWarmth: ['你继承了家族的遗产与人脉，也继承了未尽的故事。'],
          deaths: s.deaths + 1,
          dead: false,
        };
        const compass = generateCompass(base, rand);
        base.compass = compass.options;
        base.shopOffers = compass.offers;
        base.compassMonth = monthKey(s.year, s.month);
        base.cityBriefing = generateBriefing(base, rand);
        set(base);
      },

      setScreen: (screen) => set({ screen }),
      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'ref-life-game',
      version: 3,
      partialize: (s) => {
        const { busy: _b, lastError: _e, ...rest } = s as any;
        return rest;
      },
      merge: (persisted, current) => {
        // 旧存档缺少的新字段用默认值补齐
        return { ...current, ...(persisted as Partial<GameState>), busy: false, lastError: null };
      },
    },
  ),
);

/* ═══ 内部：购买结算 ═════════════════════════════ */
interface PurchaseCtx {
  cash: number; debt: number; attrs: any; emotion: number; npcs: NPC[];
  vehicles: any[]; clothing: any[]; properties: any[]; otherItems: any[];
  liabilities: any[]; job: any; offer: ShopOfferData;
  flows: CashFlowItem[]; notes: string[]; assetNotes: string[]; reminders: string[]; monthKey: string;
}
interface PurchaseResult {
  ok: boolean; note: string; cash: number; debt: number; attrs: any; emotion: number;
  vehicles: any[]; clothing: any[]; properties: any[]; otherItems: any[]; liabilities: any[];
}

function executePurchaseCore(ctx: PurchaseCtx): PurchaseResult {
  const { offer, cash, debt, liabilities } = ctx;
  const month = ctx.monthKey;
  const r: PurchaseResult = {
    ok: false, note: '', cash, debt, attrs: ctx.attrs, emotion: ctx.emotion,
    vehicles: [...ctx.vehicles], clothing: [...ctx.clothing], properties: [...ctx.properties],
    otherItems: [...ctx.otherItems], liabilities: liabilities.map(l => ({ ...l })),
  };
  const d = offer.data ?? {};

  if (offer.kind === '载具') {
    const def = d.def;
    const price = d.price ?? offer.price;
    const eff = { commute: def.effects.commute, social: def.effects.social, emotion: def.effects.emotion };
    if (offer.buyMode === '全款') {
      if (cash >= price) {
        r.cash -= price;
        r.vehicles.push({ id: uid('veh'), name: offer.name, tier: def.tier, price, upkeep: randInt(def.upkeep[0], def.upkeep[1]), effects: eff, buyMode: 'full' });
        ctx.flows.push({ id: uid('f'), kind: 'expense', category: '购物', detail: offer.name, amount: price, month });
        ctx.assetNotes.push(`🚗 购入：${offer.name}（全款 ${fmtCash(price)} 元）`);
        r.ok = true; r.note = `✅ 已全款购入 ${offer.name}`;
        if (eff.social > 0) r.emotion = clamp(r.emotion + 1, 0, 100);
      } else {
        r.note = `❌ 购买失败：存款不足（需要 ${fmtCash(price)} 元，当前 ${fmtCash(cash)} 元）`;
        ctx.notes.push(r.note);
      }
    } else if (offer.buyMode === '分期') {
      const down = d.down ?? Math.round(price * 0.2);
      const monthly = d.monthly ?? Math.round((price - down) / 36);
      const months = d.months ?? 36;
      const monthlyIncome = ctx.job?.takeHome ?? 0;
      if (cash >= down && (monthlyIncome === 0 || monthly <= monthlyIncome * 0.5)) {
        r.cash -= down;
        r.liabilities.push({ id: uid('liab'), name: `${offer.name} 分期`, monthly, remaining: months, total: months });
        r.vehicles.push({ id: uid('veh'), name: offer.name, tier: def.tier, price, upkeep: randInt(def.upkeep[0], def.upkeep[1]), effects: eff, buyMode: 'installment', installment: { down, monthly, months, paid: 1 } });
        ctx.flows.push({ id: uid('f'), kind: 'expense', category: '购物', detail: `${offer.name} 首付`, amount: down, month });
        ctx.assetNotes.push(`🚗 分期购入：${offer.name}（首付 ${fmtCash(down)} 元，月供 ${fmtCash(monthly)} 元 ×${months}）`);
        r.ok = true; r.note = `✅ 已分期购入 ${offer.name}`;
        if (eff.social > 0) r.emotion = clamp(r.emotion + 1, 0, 100);
      } else {
        const reason = cash < down ? `存款不足首付 ${fmtCash(down)} 元` : `月供 ${fmtCash(monthly)} 元超过月收入 50%`;
        r.note = `❌ 购买失败：${reason}`;
        ctx.notes.push(r.note);
      }
    }
  } else if (offer.kind === '服饰') {
    const def = d.def;
    const price = d.price ?? offer.price;
    const look = d.look ?? 1;
    if (cash >= price) {
      r.cash -= price;
      r.clothing.push({ id: uid('clo'), name: offer.name, tier: def.tier, price, slot: def.slot, lookBonus: look, socialBonus: 0 });
      ctx.flows.push({ id: uid('f'), kind: 'expense', category: '购物', detail: offer.name, amount: price, month });
      ctx.assetNotes.push(`👔 购入：${offer.name}（外貌 +${look}）`);
      r.ok = true; r.note = `✅ 已购入 ${offer.name}`;
    } else {
      r.note = `❌ 购买失败：存款不足（需要 ${fmtCash(price)} 元）`;
      ctx.notes.push(r.note);
    }
  } else if (offer.kind === '房产') {
    if (offer.buyMode === '月租') {
      const rent = d.monthlyRent ?? offer.price;
      const deposit = rent;
      if (cash >= rent + deposit) {
        r.cash -= (rent + deposit);
        const newProp = {
          id: uid('prop'), name: offer.name, tier: d.tier ?? '普通住宅', usage: '租房' as const,
          price: 0, basePrice: 0, monthlyRent: rent, propertyFee: d.fee ?? 0, owned: false, deposit,
        };
        // 退掉旧租房（退还押金不计，简化）
        r.properties = r.properties.filter(p => p.usage !== '租房');
        r.properties.push(newProp);
        ctx.flows.push({ id: uid('f'), kind: 'expense', category: '租房', detail: `${offer.name} 押金+首月`, amount: rent + deposit, month });
        ctx.assetNotes.push(`🏠 新租：${offer.name}（月租 ${fmtCash(rent)} 元，押一付三）`);
        r.ok = true; r.note = `✅ 已租下 ${offer.name}`;
        r.emotion = clamp(r.emotion + 1, 0, 100);
      } else {
        r.note = `❌ 租房失败：存款不足（押金+首月需 ${fmtCash(rent + deposit)} 元）`;
        ctx.notes.push(r.note);
      }
    } else {
      // 购房（罗盘另有购房入口，此处通用处理）
      const price = d.price ?? offer.price;
      if (cash >= price) {
        r.cash -= price;
        r.properties.push({
          id: uid('prop'), name: offer.name, tier: d.tier ?? '普通住宅', usage: '自住' as const,
          price, basePrice: price, monthlyRent: 0, propertyFee: d.fee ?? 0, owned: true,
        });
        ctx.flows.push({ id: uid('f'), kind: 'expense', category: '购房', detail: offer.name, amount: price, month });
        ctx.assetNotes.push(`🏠 购入：${offer.name}（${fmtCash(price)} 元）`);
        r.ok = true; r.note = `✅ 已购入 ${offer.name}`;
        r.emotion = clamp(r.emotion + 3, 0, 100);
      } else {
        r.note = `❌ 购房失败：存款不足`;
        ctx.notes.push(r.note);
      }
    }
  } else if (offer.kind === '其他') {
    const def = d.def;
    const price = d.price ?? offer.price;
    if (cash >= price) {
      r.cash -= price;
      r.otherItems.push({
        id: uid('item'), name: offer.name, sub: def.sub ?? '其他', price,
        attrBonus: def.attr ? { ...def.attr } : undefined,
        emotionBonus: def.emotion, socialBonus: def.social, note: def.note,
      });
      ctx.flows.push({ id: uid('f'), kind: 'expense', category: '购物', detail: offer.name, amount: price, month });
      ctx.assetNotes.push(`📦 购入：${offer.name}（${fmtCash(price)} 元）`);
      if (def.attr) {
        for (const [k, v] of Object.entries(def.attr)) {
          if (k in r.attrs) r.attrs[k] = clamp(r.attrs[k] + (v as number), 1, 100);
        }
        ctx.assetNotes.push(`   → 属性加成：${Object.entries(def.attr).map(([k, v]) => `${k}+${v}`).join('，')}`);
      }
      if (def.emotion) r.emotion = clamp(r.emotion + def.emotion, 0, 100);
      r.ok = true; r.note = `✅ 已购入 ${offer.name}`;
    } else {
      r.note = `❌ 购买失败：存款不足（需要 ${fmtCash(price)} 元）`;
      ctx.notes.push(r.note);
    }
  } else {
    r.note = '未知商品类型';
  }
  return r;
}

/* ═══ 内部：恋爱阶段联动 ═══════════════════════ */
function updateRomanceStage(npc: NPC) {
  const i = npc.intimacy, h = npc.heart;
  if (npc.romanceStage === '伴侣/夫妻') return;
  if (i >= 90 && h >= 90) npc.romanceStage = '伴侣/夫妻';
  else if (i >= 85 && h >= 80) npc.romanceStage = '订婚/谈婚论嫁';
  else if (i >= 70 && h >= 60) npc.romanceStage = '恋人';
  else if (i >= 60 && h >= 30) npc.romanceStage = '暧昧期';
}

function topFocusMonths(focus: Record<string, number>, targets: string[]): number {
  let m = 0;
  for (const t of targets) m = Math.max(m, focus[t] ?? 0);
  return m;
}

function monthsSince(monthStr: string | undefined, year: number, month: number): number {
  if (!monthStr) return 99;
  const [y, m] = monthStr.split('-').map(Number);
  return (year - y) * 12 + (month - m);
}

function readSaveAny(code: string): any {
  try {
    const raw = localStorage.getItem('ref-life-save-' + code.trim().toUpperCase());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function attrIcon(k: string): string {
  const map: Record<string, string> = { 智力: '🧠', 情商: '💬', 意志: '⛰️', 外貌: '✨', 体质: '💪', 家境: '🏛️', 运气: '🍀', 健康: '❤️' };
  return map[k] ?? '📊';
}


function accidentChance(health: number, luck: number): number {
  // 意外概率：基准 0.3%/月；健康越低越危险；运气可对冲
  let p = 0.003;
  if (health < 50) p += (50 - health) * 0.0004;
  if (luck > 70) p *= 0.5;
  return Math.min(p, 0.03);
}
