/**
 * Ref 现代人生模拟器 V9.0.13 · 全局类型定义
 * =========================================================
 * 覆盖：角色 / 时间 / 行动点 / 经济 / 资产 / NPC / 城市 /
 *       决策罗盘 / 城市简报 / AI 结算 / 存档 全量类型。
 */

export type Gender = 'male' | 'female';

export type AttributeKey = '智力' | '情商' | '意志' | '外貌' | '体质' | '家境' | '运气' | '健康';
export type Attributes = Record<AttributeKey, number>;

export type EmotionValue = number; // 0-100 情绪

export interface TalentDef {
  id: string;
  name: string;
  icon: string;
  effect: string;
  bonus: Partial<Record<AttributeKey, number>> | Record<string, number>; // 判定加成 %
  unlock: string;
}

export interface CharacterBase {
  name: string;
  gender: Gender;
  age: number;             // 当前年龄
  startAge: number;        // 开局年龄
  birthCity: string;
  city: string;            // 当前所在城市
  district: string;        // 当前居住区域（叙事层）
  familyBackground: string; // 贫困家庭 / 工薪家庭 / ...
  attrs: Attributes;       // 8 项基础属性（含健康）
  talents: string[];       // 先天特质 id 列表
  emotion: number;         // 情绪 0-100
  narrativeDepth: '精简' | '标准' | '沉浸';
}

/* ── 人生目标 ─────────────────────────────────── */
export interface LifeGoal {
  id: string;
  title: string;                      // 显示标题
  type: '财务' | '事业' | '家庭' | '健康' | '技能' | '旅行' | '社交';
  description: string;
  current?: number;                   // 当前进度值
  target?: number;                    // 达成目标值
  unit?: string;                      // 进度单位（元 / 岁 / 人）
  achieved: boolean;
  achievedAt?: string;                // '2026-08'
}

/* ── 职业 ─────────────────────────────────────── */
export interface Job {
  title: string;
  company?: string;
  salary: number;      // 税前月薪
  takeHome: number;    // 到手月薪
  workYears: number;
  level?: string;      // 岗位层级（如 专员 / 主管 / 经理 / 总监）
  industry?: string;
  stable?: boolean;
}

/* ── 收支明细 ─────────────────────────────────── */
export interface CashFlowItem {
  id: string;
  kind: 'income' | 'expense';
  category: string;    // 月薪 / 兼职 / 房租 / 餐饮 / ...
  detail: string;      // 补充说明
  amount: number;      // 正数；方向由 kind 决定
  month: string;       // '2026-08'
}

/* ── 物品池：载具 / 服饰 / 房产 / 其他 ─────────── */
export type ItemType = '载具' | '服饰' | '房产' | '其他';

export interface Vehicle {
  id: string;
  name: string;
  tier: string;                  // 基础代步 / 经济实用 / ...
  price: number;
  upkeep: number;                // 每月维护成本
  effects: { commute: number; social: number; emotion: number };
  buyMode: 'full' | 'installment';
  installment?: { down: number; monthly: number; months: number; paid: number };
}

export type ClothingSlot = '上装' | '下装' | '外套' | '鞋履' | '配饰';

export interface ClothingItem {
  id: string;
  name: string;
  tier: string;                  // 快时尚 / 轻奢 / ...
  price: number;
  slot: ClothingSlot;
  lookBonus: number;             // 外貌加成
  socialBonus: number;           // 社交判定加成（溢出转化）
}

export interface PropertyItem {
  id: string;
  name: string;
  tier: string;                  // 老破小 / 普通住宅 / ...
  usage: '租房' | '自住' | '出租';
  price: number;                 // 总价（已含城市系数）
  basePrice: number;             // 原始总价
  monthlyRent: number;           // 月租金（出租/租住）
  propertyFee: number;           // 每月物业费
  owned: boolean;
  deposit?: number;              // 押金（租住时）
}

export interface OtherItem {
  id: string;
  name: string;
  sub: string;                   // 子类
  price: number;
  attrBonus?: Partial<Attributes>;
  emotionBonus?: number;
  socialBonus?: number;
  note?: string;
}

/* 外貌临时 buff */
export interface LookBuff {
  id: string;
  name: string;
  value: number;                 // 外貌加成
  remaining: number;             // 剩余月份
  source: '理发' | '美容' | '健身' | '医美' | '护肤' | '事件';
}

/* ── NPC ──────────────────────────────────────── */
export type RelationLevel = 0 | 1 | 2 | 3 | 4;
export type RomanceStage = '普通朋友' | '暧昧期' | '恋人' | '订婚/谈婚论嫁' | '伴侣/夫妻' | '前任';

export interface NPC {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  city: string;
  job: string;
  incomeBand: '高' | '中' | '低';
  appearance: string;            // 外貌特征描述
  traits: string[];              // 性格标签 2-3 个
  lifestyle: string;
  family: string;
  goal: string;
  preference: string[];          // 择偶偏好
  intimacy: number;              // 亲密度 0-100
  heart: number;                 // 心动值 0-100（仅异性）
  level: RelationLevel;          // Lv.0 ~ Lv.4
  location: string;              // 所在场景
  interactions: number;          // 往来次数
  lastContactMonth?: string;
  alive: boolean;
  romanceStage?: RomanceStage;
  spouseId?: string;
  isChild?: boolean;             // 是否为玩家子女
  parentIds?: string[];
  ageMonths?: number;            // 子女年龄（月）
  memories?: string[];
}

/* ── 城市 ─────────────────────────────────────── */
export interface CityDef {
  id: string;
  name: string;
  region: 'CN' | 'OVS';
  tier: string;                  // 一线 / 新一线 / 二线 / 三线 / 四线 / 海外一线 ...
  houseIndex: number;            // 房价指数（北京=100 基准）
  avgSalary: number;             // 平均月薪（税前，人民币）
  costIndex: number;             // 生活成本指数
  jobs: string;                  // 就业机会描述
  tags: string[];                // 城市标签
  migrateBarrier: string;
  priceFactor: number;           // 房价修正系数（第六章）
  rentFactor: number;            // 租金修正系数
  industry: string[];            // 优势产业
  commuteNote: string;
}

/* ── 决策罗盘 ─────────────────────────────────── */
export type CompassCategory =
  | '目标推进'
  | '因缘际会'
  | '职业发展'
  | '社交经营'
  | '生活事务'
  | '自由探索'
  | '商店购物';

export interface CompassOption {
  id: string;                    // 唯一 id
  no: number;                    // 编号 1..26（渲染为 ①..㉖）
  category: CompassCategory;
  sub: string;                   // 子类型标签，如 目标·存款 / 社交·约会
  text: string;
  cost: number;                  // 行动点消耗
  urgency?: '⚠ 限时·本月' | string;   // ⚠ / ⏳ 前缀标签
  duration?: number;             // 剩余有效月数（undefined=长期）
  linkedNpcId?: string;
  shopKind?: ItemType;
  shopItemId?: string;
  love?: boolean;
}

/* ── 城市简报 ─────────────────────────────────── */
export interface CityBriefing {
  dynamics: string[];
  policies: string[];
  people: string[];
  economy: string[];
}

/* ── 天气与季节 ───────────────────────────────── */
export interface WeatherInfo {
  season: string;    // 春 / 夏 / 秋 / 冬
  seasonKeys: string[];
  weather: string;   // 晴 / 阴 / 小雨 / ...
  weatherIcon: string;
  mood: string;      // 氛围一句话
}

/* ── AI 结算 diff ─────────────────────────────── */
export interface AIDiff {
  cash?: number;                               // 存款净变动
  income?: { item: string; detail: string; amount: number }[];
  expenses?: { item: string; detail: string; amount: number }[];
  attributes?: Partial<Record<AttributeKey, number>>;
  emotion?: number;
  lookBuffs?: { name: string; value: number; duration: number; cost?: number }[];
  relationships?: Record<string, { intimacy?: number; heart?: number; note?: string }>;
  newNPCs?: Array<Partial<NPC> & { name: string; gender: Gender }>;
  events?: string[];                           // 事件标签：升职 / 生病 / ...
  items?: Array<{ kind: ItemType; name: string; price: number; detail?: string }>;
  debt?: number;                               // 负债净变动
  job?: { title: string; salary: number; company?: string } | null;
  cityChange?: string | null;
  reminders?: string[];
  memory?: string;                             // 记忆碎片 / 上月余温素材
}

export interface AIParsedResult {
  narrative: string;
  diff: AIDiff | null;
  raw: string;
}

/* ── 月末结算 ─────────────────────────────────── */
export interface Settlement {
  month: string;               // '2026-08'
  narrative: string;
  flows: CashFlowItem[];
  cashStart: number;
  cashEnd: number;
  debtAfter: number;
  assetNotes: string[];
  relationNotes: string[];
  attrNotes: string[];
  goalNotes: string[];
  reminders: string[];
  events: string[];
  saveCode: string;
  memory: string;
  summaryLines: string[];      // 简要要点
}

/* ── API 设置 ─────────────────────────────────── */
export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/* ── 商店货架 ─────────────────────────────────── */
export interface ShopOfferData {
  id: string;
  kind: ItemType;
  name: string;
  price: number;
  detail: string;
  buyMode: '全款' | '分期' | '月租';
  effectsText: string;
  data: any;
}

/* ── 游戏全局状态 ─────────────────────────────── */
export interface GameState {
  version: string;
  screen: 'create' | 'playing' | 'settlement' | 'review' | 'restore';
  character: CharacterBase | null;

  // 时间
  year: number;
  month: number;               // 1-12
  totalMonths: number;
  lifeExpectancy: number;

  // 行动点
  actionPoints: { total: number; used: number };
  focus: Record<string, number>;   // 分类 -> 连续专注月数
  focusBonus: number;              // 当前专注加成 %（上限 30）

  // 经济
  cash: number;
  debt: number;
  liabilities: { id: string; name: string; monthly: number; remaining: number; total: number }[];
  flows: CashFlowItem[];
  job: Job | null;
  partTime?: string;

  // 资产
  vehicles: Vehicle[];
  clothing: ClothingItem[];
  properties: PropertyItem[];
  otherItems: OtherItem[];
  lookBuffs: LookBuff[];

  // NPC
  npcs: NPC[];
  spouseId?: string;
  childrenIds: string[];

  // 人生目标
  goals: LifeGoal[];

  // 世界
  cityBriefing: CityBriefing;
  weather: WeatherInfo;
  compass: CompassOption[];
  shopOffers: ShopOfferData[];
  compassMonth: string;

  // 彩蛋
  eggTriggered: boolean;
  eggMonthsLeft: number;       // 抖音账号剩余月份
  eggDividend: number;         // 每月分红（10 万）

  // 结算
  settlement: Settlement | null;
  pendingTurn: { selectedIds: string[]; freeText: string; month: string } | null;
  busy: boolean;
  lastError: string | null;

  // 记忆
  memories: string[];
  lastWarmth: string[];        // 上月余温 1-2 条

  // 系统
  log: string[];
  saveCode: string;
  deaths: number;
  dead: boolean;
  deathReason: string;
  silenceCounter: number;      // 连续未选目标/事件选项月数
}

/* 角色创建载荷 */
export interface CreatePayload {
  name: string;
  gender: Gender;
  startAge: number;
  cityId: string;
  attrs: Attributes;           // 分配后的最终属性
  talentIds: string[];
  goals: LifeGoal[];
  narrativeDepth: '精简' | '标准' | '沉浸';
}
