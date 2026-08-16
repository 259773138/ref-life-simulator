/**
 * 世界生成器（lib/world.ts）
 * NPC 生成 / 季节天气 / 城市简报 / 决策罗盘生成
 */
import type {
  CityBriefing, CityDef, CompassCategory, CompassOption, GameState, Gender, NPC, WeatherInfo,
} from '../types/game';
import {
  CITIES, CITY_EVENT_POOL, CLOTHING_POOL, ECONOMY_POOL, FAMILY_POOL, GIVEN_F, GIVEN_M,
  GOAL_TEMPLATES, NPC_GOALS, NPC_JOBS, NPC_LOCATIONS, PERSONALITIES, POLICY_POOL, PREFERENCE_POOL,
  PROPERTY_NAMES, PROPERTY_POOL, OTHER_POOL, SURNAMES, VEHICLE_POOL, WEATHERS, seasonOf, cityById,
} from './constants';
import { clamp, hashString, mulberry32, normal, pick, pickN, randInt } from './rng';
import { uid } from './rng';

/* ═══ NPC 生成（第二章 · 15-20 位） ═══════════ */
export function generateNPCs(city: CityDef, familyBackground: string, seedStr: string, count = 17): NPC[] {
  const rand = mulberry32(hashString(seedStr));
  const npcs: NPC[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const gender: Gender = rand() < 0.5 ? 'male' : 'female';
    const name = genName(gender, rand, usedNames);
    const age = clamp(Math.round(normal(24, 7, rand)), 16, 55);
    const job = pick(NPC_JOBS, rand);
    const incomeBand: '高' | '中' | '低' = rand() < 0.25 ? '高' : rand() < 0.6 ? '中' : '低';
    const intimacy = randInt(5, 40, rand);
    const level = intimacy >= 40 ? 2 : intimacy >= 20 ? 1 : 0;

    const npc: NPC = {
      id: uid('npc'),
      name,
      gender,
      age,
      city: city.name,
      job,
      incomeBand,
      appearance: genAppearance(rand),
      traits: pickN(PERSONALITIES, randInt(2, 3, rand), rand),
      lifestyle: genLifestyle(rand),
      family: pick(FAMILY_POOL, rand),
      goal: pick(NPC_GOALS, rand),
      preference: pickN(PREFERENCE_POOL, randInt(2, 3, rand), rand),
      intimacy,
      heart: 0,
      level: level as NPC['level'],
      location: pick(NPC_LOCATIONS, rand),
      interactions: randInt(0, 3, rand),
      alive: true,
    };
    npcs.push(npc);
  }

  // 保证至少有 3 位与玩家年龄相近的异性潜在恋爱对象（心动值初始 0-15）
  npcs.forEach((n, i) => {
    if (n.age <= 30 && rand() < 0.6) {
      n.heart = randInt(0, 15, rand);
    }
  });

  return npcs;
}

function genName(gender: Gender, rand: () => number, used: Set<string>): string {
  for (let tries = 0; tries < 30; tries++) {
    const surname = pick(SURNAMES, rand);
    const given = gender === 'male' ? pick(GIVEN_M, rand) : pick(GIVEN_F, rand);
    const name = surname + given;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  return `路人${Math.floor(rand() * 999)}`;
}

function genAppearance(rand: () => number): string {
  const pool = [
    '戴着黑框眼镜，穿着朴素', '笑起来有浅浅的酒窝', '总是背着一个旧帆布包',
    '头发理得很利落', '穿衣服讲究，配色舒服', '个子高，走路带风',
    '圆脸，看起来很亲切', '眉清目秀，气质温和', '皮肤偏黑，很健康',
    '手上常戴着运动手环', '穿着西装但领带总有点歪', '素颜，但皮肤很好',
  ];
  return pick(pool, rand);
}

function genLifestyle(rand: () => number): string {
  const pool = [
    '朝九晚五，周末喜欢爬山', '经常加班，靠咖啡续命', '喜欢做饭，朋友圈全是美食',
    '夜跑爱好者', '猫奴，家里养了两只猫', '爱打游戏，周末宅家',
    '泡图书馆，准备考证', '喜欢逛展看剧', '爱和朋友聚餐饮酒',
    '骑行通勤，环保主义者',
  ];
  return pick(pool, rand);
}

/* ═══ 季节与天气 ═══════════════════════════ */
export function generateWeather(month: number, rand: () => number = Math.random): WeatherInfo {
  const { season, keys } = seasonOf(month);
  const weather = pick(WEATHERS, rand);
  return {
    season,
    seasonKeys: keys,
    weather: weather.name,
    weatherIcon: weather.icon,
    mood: weather.mood,
  };
}

/* ═══ 城市简报（第十二章） ═══════════════════ */
export function generateBriefing(state: GameState, rand: () => number = Math.random): CityBriefing {
  const city = cityById(state.character!.city) ?? cityById(state.character!.birthCity);
  const dynamics: string[] = [];
  const policies: string[] = [];
  const people: string[] = [];
  const economy: string[] = [];

  // 城市动态：从标签事件池抽取 1-2 条
  const tagPool = city.tags.flatMap(t => CITY_EVENT_POOL[t] ?? []);
  if (tagPool.length) {
    pickN(tagPool, Math.min(2, tagPool.length), rand).forEach(t => dynamics.push(t));
  }
  if (dynamics.length === 0) {
    dynamics.push(`【${city.name}】${city.jobs === '极多' ? '招聘市场活跃' : '就业市场平稳'}，${city.tags[0]}。`);
  }

  // 政策 1-2 条
  pickN(POLICY_POOL, randInt(1, 2, rand), rand).forEach(p => policies.push(p));

  // 人物消息 1-2 条（NPC 自主人生）
  const alive = state.npcs.filter(n => n.alive);
  const n1 = pickN(alive, Math.min(2, alive.length), rand);
  n1.forEach(n => {
    const r = rand();
    if (r < 0.3) people.push(`【${n.name}】升职为${n.job}主管，约你吃饭庆祝。`);
    else if (r < 0.5) people.push(`【${n.name}】搬到了${n.city}新区，换了新住处。`);
    else if (r < 0.7) people.push(`【${n.name}】最近在准备${pick(['跳槽', '考证', '买房'], rand)}，忙得不可开交。`);
    else if (r < 0.85) people.push(`【${n.name}】生了场小病，最近气色不太好。`);
    else people.push(`【${n.name}】开始学${pick(['吉他', '日语', '编程', '烘焙'], rand)}，朋友圈更新频繁。`);
  });

  // 经济行情 1-2 条
  pickN(ECONOMY_POOL, randInt(1, 2, rand), rand).forEach(e => economy.push(e));

  return { dynamics, policies, people, economy };
}

/* ═══ 决策罗盘生成（第四章） ═════════════════ */
const CATEGORIES: CompassCategory[] = ['目标推进', '因缘际会', '职业发展', '社交经营', '生活事务', '自由探索'];

export interface ShopOffer {
  id: string;
  kind: '载具' | '服饰' | '房产' | '其他';
  name: string;
  price: number;
  detail: string;
  buyMode: '全款' | '分期' | '月租';
  effectsText: string;
  data: any;
}

export function generateCompass(state: GameState, rand: () => number = Math.random): { options: CompassOption[]; offers: ShopOffer[] } {
  const options: CompassOption[] = [];
  const offers = generateShopOffers(state, rand);
  let no = 1;

  const push = (category: CompassCategory, sub: string, text: string, extra?: Partial<CompassOption>) => {
    options.push({ id: uid('opt'), no: no++, category, sub, text, cost: 1, ...extra });
  };

  /* ── 1. 目标推进（主线） ── */
  const activeGoals = state.goals.filter(g => !g.achieved);
  if (activeGoals.length > 0) {
    activeGoals.slice(0, 3).forEach(g => {
      if (g.type === '财务') push('目标推进', '目标·存款', `【目标·${g.type}】本月严格按预算执行，压缩非必要支出，向"${g.title}"前进`, { duration: 99 });
      else if (g.type === '事业') push('目标推进', '目标·事业', `【目标·${g.type}】主动推进"${g.title}"：投递简历 / 争取机会`, { duration: 99 });
      else if (g.type === '健康') push('目标推进', '目标·健康', `【目标·${g.type}】坚持规律作息与锻炼，向"${g.title}"努力`, { duration: 99 });
      else if (g.type === '家庭') push('目标推进', '目标·家庭', `【目标·${g.type}】为"${g.title}"做准备：了解婚姻/生育/家庭相关事宜`, { duration: 99 });
      else if (g.type === '技能') push('目标推进', '目标·技能', `【目标·${g.type}】投入时间学习，推进"${g.title}"`, { duration: 99 });
      else if (g.type === '旅行') push('目标推进', '目标·旅行', `【目标·${g.type}】规划路线、攒钱，推进"${g.title}"`, { duration: 99 });
      else push('目标推进', '目标·社交', `【目标·${g.type}】经营社交网络，推进"${g.title}"`, { duration: 99 });
    });
  }
  if (activeGoals.length < 3) {
    const others = ['学习一项新技能', '研究投资理财', '规划职业转型', '改善居住条件', '坚持每月健身', '拓展副业收入'];
    pickN(others, 3 - activeGoals.length, rand).forEach(t => push('目标推进', '目标·成长', `⏳ 【目标·成长】${t}（长期有效）`, { duration: 99 }));
  }

  /* ── 2. 因缘际会（世界动态） ── */
  const aliveNpcs = state.npcs.filter(n => n.alive && n.city === state.character!.city);
  const friend = aliveNpcs.filter(n => n.level >= 1);
  const eventNpc = pickN(friend, Math.min(2, friend.length), rand);
  if (eventNpc[0]) push('因缘际会', '事件·朋友之托', `${eventNpc[0].name}约你周末帮他/她搬家，说搬完请吃饭（限时·本月）`, { urgency: '⚠ 限时·本月', duration: 1, linkedNpcId: eventNpc[0].id });
  if (eventNpc[1]) push('因缘际会', '事件·邀约', `${eventNpc[1].name}约你参加一场行业沙龙，可以认识新朋友（限时·本月）`, { urgency: '⚠ 限时·本月', duration: 1, linkedNpcId: eventNpc[1].id });
  push('因缘际会', '事件·聚会', '大学/高中同学组织聚会，许久未见的旧友都在', { duration: 2 });
  if (state.cityBriefing.dynamics[0]) {
    const d = state.cityBriefing.dynamics[0].replace(/^【.*?】/, '').trim();
    push('因缘际会', '事件·城市动态', `响应城市动态：「${d}」——主动跟进这个变化`, { duration: 1 });
  }

  /* ── 3. 职业发展 ── */
  if (state.job) {
    push('职业发展', '职业·晋升', '主动向领导争取重要项目，展现能力');
    push('职业发展', '职业·技能', '报名专业课程/考取证书，提升职业竞争力');
    push('职业发展', '职业·跳槽', '关注招聘市场，投递心仪公司（机会下月截止）', { urgency: '⚠ 限时·2月', duration: 2 });
  } else {
    push('职业发展', '职业·求职', '投递简历，参加面试，寻找工作机会');
    push('职业发展', '职业·兼职', '找一份兼职先保证基本收入');
    push('职业发展', '职业·方向', '梳理自己的技能与职业方向，制定求职计划');
  }

  /* ── 4. 社交经营（含恋爱，V9.0.13 规则） ── */
  const candidates = aliveNpcs.filter(n => n.gender !== state.character!.gender && n.age >= 18);
  const crushOnPlayer = state.npcs.filter(n => n.alive && n.gender !== state.character!.gender && n.heart >= 30);
  const playerCrushes = state.npcs.filter(n => n.alive && n.gender !== state.character!.gender && n.intimacy >= 40);
  const hasSpouse = !!state.spouseId;
  const loveCondition = hasSpouse || crushOnPlayer.length > 0 || playerCrushes.some(n => n.heart >= 30 || n.romanceStage && n.romanceStage !== '普通朋友');

  if (loveCondition) {
    const target = hasSpouse
      ? state.npcs.find(n => n.id === state.spouseId) ?? candidates[0]
      : (crushOnPlayer[0] ?? candidates[0]);
    if (target) {
      const stage = target.romanceStage ?? '普通朋友';
      if (stage === '普通朋友' || stage === '暧昧期') {
        push('社交经营', '社交·约会', `约${target.name}周末去新开的餐厅吃饭，顺便聊聊近况`, { linkedNpcId: target.id, love: true });
        push('社交经营', '社交·表白', `找机会向${target.name}表达你的心意（表白结果取决于心动值、情商与外貌）`, { linkedNpcId: target.id, love: true });
      } else {
        push('社交经营', '社交·恋爱沟通', `与${target.name}安排一次正式约会，维系感情`, { linkedNpcId: target.id, love: true });
        push('社交经营', '社交·见家长', `与${target.name}商量见家长/谈婚论嫁的事`, { linkedNpcId: target.id, love: true });
      }
    }
  }
  const social = aliveNpcs.filter(n => n.level >= 1 && !(loveCondition && candidates.includes(n)));
  const s1 = pickN(social, Math.min(2, social.length), rand);
  if (s1[0]) push('社交经营', '社交·维系', `${s1[0].name}很久没联系了，约出来叙叙旧`, { linkedNpcId: s1[0].id });
  if (s1[1]) push('社交经营', '社交·深入', `和${s1[1].name}深入聊聊，也许能成为更亲密的朋友`, { linkedNpcId: s1[1].id });
  push('社交经营', '社交·拓展', '参加行业交流活动，认识新朋友');

  /* ── 5. 生活事务 ── */
  push('生活事务', '生活·健康', '最近状态一般，去医院做一次全面体检', { duration: 1 });
  push('生活事务', '生活·住房', '研究周边房源，考虑搬去更合适的区域');
  push('生活事务', '生活·证件', '整理个人事务：证件、社保、保险等杂事');
  if (state.character!.age > 65) push('生活事务', '生活·健康', '⚠ 定期复查慢性病指标（限时·本月）', { urgency: '⚠ 限时·本月', duration: 1 });

  /* ── 6. 自由探索 ── */
  push('自由探索', '探索·偶遇', '周末去新开的书店/咖啡馆逛逛，也许有意外收获');
  push('自由探索', '探索·投资', '研究理财与股票市场，小额试水投资');
  push('自由探索', '探索·兴趣', '报名一个感兴趣的体验课（摄影/绘画/陶艺/乐器）');

  /* ── 7. 商店购物（4-8 项） ── */
  offers.forEach(o => {
    if (o.buyMode === '全款') {
      push('商店购物', `购物·${o.kind}·全款`, `${o.name}（${fmtOffer(o.price)} 元${o.effectsText ? `，${o.effectsText}` : ''}）`, { shopKind: o.kind, shopItemId: o.id, duration: 1 });
    } else if (o.buyMode === '分期') {
      push('商店购物', `购物·${o.kind}·分期`, `${o.name}（首付 ${fmtOffer(o.data.down)} 元，月供 ${fmtOffer(o.data.monthly)} 元×${o.data.months}）`, { shopKind: o.kind, shopItemId: o.id, duration: 1 });
    } else {
      push('商店购物', `购物·${o.kind}·月租`, `${o.name}（月租 ${fmtOffer(o.price)} 元，押一付三）`, { shopKind: o.kind, shopItemId: o.id, duration: 1 });
    }
  });

  // 截断至 26 项
  const capped = options.slice(0, 26);
  return { options: capped, offers };
}

function fmtOffer(n: number): string {
  return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(Math.round(n));
}

/* ═══ 商店货架生成（第六章 · 每月 4 件） ═══════ */
function generateShopOffers(state: GameState, rand: () => number): ShopOffer[] {
  const offers: ShopOffer[] = [];
  const city = cityById(state.character!.city);

  // 载具 1-2 件：一线城市有低概率上架顶级物品（2%）
  const topAllowed = ['北京', '上海', '广州', '深圳', '纽约', '伦敦', '新加坡', '洛杉矶'].includes(city.name);
  const vehiclePool = topAllowed ? VEHICLE_POOL : VEHICLE_POOL.filter(v => v.price[0] < 5000000);
  const vCount = rand() < 0.4 ? 2 : 1;
  const vehs = pickN(vehiclePool, Math.min(vCount, vehiclePool.length), rand);
  vehs.forEach(v => {
    const price = randInt(v.price[0], v.price[1], rand);
    const eff = [
      v.effects.commute < 0 ? `通勤-${-v.effects.commute}%` : '',
      v.effects.social > 0 ? `社交+${v.effects.social}` : '',
      v.effects.emotion > 0 ? `情绪+${v.effects.emotion}` : '',
    ].filter(Boolean).join('，');
    offers.push({
      id: uid('offer'), kind: '载具', name: v.name, price, detail: v.tier, buyMode: '全款', effectsText: eff,
      data: { def: v, price, eff },
    });
    if (v.installment && price >= 80000) {
      const down = Math.round(price * 0.2);
      const monthly = Math.round((price - down) / 36 * 1.06);
      offers.push({
        id: uid('offer'), kind: '载具', name: v.name, price, detail: v.tier, buyMode: '分期', effectsText: eff,
        data: { def: v, price, eff, down, monthly, months: 36 },
      });
    }
  });

  // 服饰 1-2 件
  const clothCount = rand() < 0.5 ? 2 : 1;
  const cloths = pickN(CLOTHING_POOL, clothCount, rand);
  cloths.forEach(c => {
    const price = randInt(c.price[0], c.price[1], rand);
    const look = randInt(c.look[0], c.look[1], rand);
    offers.push({
      id: uid('offer'), kind: '服饰', name: c.name, price, detail: c.tier, buyMode: '全款',
      effectsText: `外貌+${look}`,
      data: { def: c, price, look },
    });
  });

  // 房产 1 件（月租 / 或购房）
  const tierDef = pick(PROPERTY_POOL, rand);
  const size = 70;
  const basePrice = Math.round((randInt(tierDef.unit[0], tierDef.unit[1], rand) * size));
  const price = Math.round(basePrice * city.priceFactor);
  const monthlyRent = Math.round(randInt(tierDef.rent[0], tierDef.rent[1], rand) * city.rentFactor);
  const fee = randInt(tierDef.fee[0], tierDef.fee[1], rand);
  const pName = pick(PROPERTY_NAMES[tierDef.tier] ?? ['普通住宅'], rand);
  offers.push({
    id: uid('offer'), kind: '房产', name: `${city.name}${pName}（${tierDef.tier}）`, price: monthlyRent, detail: tierDef.tier,
    buyMode: '月租', effectsText: `月租 ${fmtOffer(monthlyRent)} 元，押一付三`,
    data: { def: tierDef, price, monthlyRent, fee, size, name: pName, tier: tierDef.tier },
  });

  // 其他物品 1 件
  const other = pick(OTHER_POOL, rand);
  const oPrice = randInt(other.price[0], other.price[1], rand);
  const oEff = [other.attr ? Object.entries(other.attr).map(([k, v]) => `${k}+${v}`).join('，') : '', other.note ?? ''].filter(Boolean).join('，');
  offers.push({
    id: uid('offer'), kind: '其他', name: other.name, price: oPrice, detail: other.sub, buyMode: '全款',
    effectsText: oEff,
    data: { def: other, price: oPrice },
  });

  return offers;
}

/* ═══ 目标初始化 ═══════════════════════════ */
export function templateGoals(): Array<{ title: string; type: any; description: string; current?: number; target?: number; unit?: string }> {
  return GOAL_TEMPLATES;
}

/* ═══ 家庭背景判定（第二章） ═════════════════ */
export function familyBackgroundOf(famAttr: number): { label: string; cash: number; deposit: [number, number] } {
  if (famAttr <= 19) return { label: '贫困家庭', cash: randInt(500, 5000), deposit: [500, 5000] };
  if (famAttr <= 39) return { label: '工薪家庭', cash: randInt(5000, 20000), deposit: [5000, 20000] };
  if (famAttr <= 59) return { label: '小康家庭', cash: randInt(20000, 50000), deposit: [20000, 50000] };
  if (famAttr <= 79) return { label: '中产家庭', cash: randInt(50000, 200000), deposit: [50000, 200000] };
  return { label: '富裕家庭', cash: randInt(200000, 1000000), deposit: [200000, 1000000] };
}

export { CITIES };
