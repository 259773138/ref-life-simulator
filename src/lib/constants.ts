/**
 * Ref 现代人生模拟器 · 世界常量库
 * 城市 / 天赋 / 职业 / 物品池 / NPC 素材 / 目标模板 / 季节天气
 */
import type { CityDef, TalentDef, Job, Vehicle, ClothingItem, OtherItem, LifeGoal } from '../types/game';
import { mulberry32, hashString, randInt } from './rng';

/* ═══ 城市模板（第二章 / 第七章） ═══════════════ */
export const CITIES: CityDef[] = [
  { id: 'bj', name: '北京', region: 'CN', tier: '一线', houseIndex: 95, avgSalary: 12000, costIndex: 90, jobs: '极多', tags: ['体制机会多', '落户难', '央企总部集中'], migrateBarrier: '需落户指标或长期工作', priceFactor: 0.95, rentFactor: 0.95, industry: ['体制内', '互联网', '金融', '央企'], commuteNote: '地铁 40 分钟至国贸' },
  { id: 'sh', name: '上海', region: 'CN', tier: '一线', houseIndex: 92, avgSalary: 12500, costIndex: 92, jobs: '极多', tags: ['外企集中', '国际化程度高', '金融中心'], migrateBarrier: '需积分落户或人才引进', priceFactor: 0.92, rentFactor: 0.95, industry: ['金融', '外企', '时尚'], commuteNote: '地铁 35 分钟至陆家嘴' },
  { id: 'gz', name: '广州', region: 'CN', tier: '一线', houseIndex: 82, avgSalary: 10500, costIndex: 82, jobs: '极多', tags: ['商贸中心', '开放包容', '美食之都'], migrateBarrier: '较容易', priceFactor: 0.82, rentFactor: 0.85, industry: ['商贸', '制造', '电商'], commuteNote: '地铁 30 分钟至珠江新城' },
  { id: 'sz', name: '深圳', region: 'CN', tier: '一线', houseIndex: 88, avgSalary: 11500, costIndex: 85, jobs: '极多', tags: ['互联网科技中心', '创业补贴多', '落户相对宽松'], migrateBarrier: '较容易', priceFactor: 0.88, rentFactor: 0.85, industry: ['互联网', '硬件', '创业'], commuteNote: '地铁 30 分钟至科技园' },
  { id: 'cd', name: '成都', region: 'CN', tier: '新一线', houseIndex: 55, avgSalary: 8000, costIndex: 65, jobs: '多', tags: ['生活舒适', '新兴产业', '幸福感高'], migrateBarrier: '低', priceFactor: 0.55, rentFactor: 0.65, industry: ['文创', '游戏', '餐饮'], commuteNote: '地铁 25 分钟至天府广场' },
  { id: 'wh', name: '武汉', region: 'CN', tier: '二线', houseIndex: 40, avgSalary: 7000, costIndex: 58, jobs: '中', tags: ['制造业教育重镇', '大学生多'], migrateBarrier: '低', priceFactor: 0.4, rentFactor: 0.5, industry: ['制造', '光电子', '教育'], commuteNote: '地铁 30 分钟至光谷' },
  { id: 'cq', name: '重庆', region: 'CN', tier: '二线', houseIndex: 35, avgSalary: 6500, costIndex: 55, jobs: '中', tags: ['成本低', '服务业发达', '地形特殊'], migrateBarrier: '低', priceFactor: 0.4, rentFactor: 0.5, industry: ['文旅', '餐饮', '制造'], commuteNote: '轻轨 30 分钟至解放碑' },
  { id: 'dl', name: '大连', region: 'CN', tier: '三线', houseIndex: 25, avgSalary: 5000, costIndex: 48, jobs: '少', tags: ['节奏慢', '港口城市', '老龄化明显'], migrateBarrier: '低', priceFactor: 0.25, rentFactor: 0.35, industry: ['港口', '软件外包'], commuteNote: '公交 25 分钟至星海广场' },
  { id: 'dd', name: '丹东', region: 'CN', tier: '四线', houseIndex: 15, avgSalary: 3500, costIndex: 38, jobs: '极少', tags: ['边境小城', '熟人社会', '物价极低'], migrateBarrier: '低', priceFactor: 0.15, rentFactor: 0.25, industry: ['边贸', '旅游'], commuteNote: '步行 15 分钟可达全城' },
  { id: 'ny', name: '纽约', region: 'OVS', tier: '海外一线', houseIndex: 120, avgSalary: 45000, costIndex: 120, jobs: '极多', tags: ['全球金融中心', '竞争极激烈', '签证难'], migrateBarrier: '需工作签证/绿卡', priceFactor: 1.4, rentFactor: 1.5, industry: ['金融', '传媒', '科技'], commuteNote: '地铁 45 分钟至曼哈顿' },
  { id: 'ld', name: '伦敦', region: 'OVS', tier: '海外一线', houseIndex: 110, avgSalary: 38000, costIndex: 115, jobs: '多', tags: ['金融与教育中心', '文化多元'], migrateBarrier: '需工作签证', priceFactor: 1.3, rentFactor: 1.4, industry: ['金融', '教育', '文化'], commuteNote: '地铁 40 分钟至金融城' },
  { id: 'ty', name: '东京', region: 'OVS', tier: '海外二线', houseIndex: 90, avgSalary: 25000, costIndex: 85, jobs: '多', tags: ['科技与文化中心', '秩序感强', '语言门槛高'], migrateBarrier: '需工作签证', priceFactor: 0.95, rentFactor: 1.0, industry: ['科技', '游戏', '制造'], commuteNote: '电车 35 分钟至新宿' },
  { id: 'sg', name: '新加坡', region: 'OVS', tier: '海外一线', houseIndex: 130, avgSalary: 32000, costIndex: 100, jobs: '多', tags: ['亚洲金融枢纽', '低税', '生活极贵'], migrateBarrier: '需工作签证', priceFactor: 1.5, rentFactor: 1.6, industry: ['金融', '航运', '科技'], commuteNote: '地铁 25 分钟至滨海湾' },
  { id: 'la', name: '洛杉矶', region: 'OVS', tier: '海外二线', houseIndex: 105, avgSalary: 38000, costIndex: 100, jobs: '多', tags: ['娱乐产业中心', '创意行业多'], migrateBarrier: '需工作签证/绿卡', priceFactor: 1.05, rentFactor: 1.1, industry: ['娱乐', '创意', '科技'], commuteNote: '驾车 40 分钟至市中心' },
  { id: 'db', name: '迪拜', region: 'OVS', tier: '海外三线', houseIndex: 70, avgSalary: 30000, costIndex: 75, jobs: '中', tags: ['奢华消费', '零个税', '文化差异大'], migrateBarrier: '需工作签证', priceFactor: 0.7, rentFactor: 0.7, industry: ['地产', '旅游', '贸易'], commuteNote: '地铁 25 分钟至哈利法塔' },
  { id: 'xn', name: '悉尼', region: 'OVS', tier: '海外三线', houseIndex: 95, avgSalary: 30000, costIndex: 90, jobs: '中', tags: ['生活质量高', '节奏较慢'], migrateBarrier: '需工作签证', priceFactor: 1.0, rentFactor: 1.0, industry: ['金融', '教育', '旅游'], commuteNote: '火车 30 分钟至歌剧院' },
  { id: 'bl', name: '柏林', region: 'OVS', tier: '海外三线', houseIndex: 60, avgSalary: 22000, costIndex: 65, jobs: '中', tags: ['创业氛围好', '生活成本相对低'], migrateBarrier: '需工作签证', priceFactor: 0.7, rentFactor: 0.7, industry: ['创业', '科技', '文化'], commuteNote: '地铁 25 分钟至亚历山大广场' },
];

export const cityById = (id: string) => CITIES.find(c => c.id === id) ?? CITIES.find(c => c.name === id) ?? createCustomCity(id);

/* ═══ 自定义城市（用户可自由输入任意城市名） ═══ */
export interface CustomTierDef {
  key: string;
  label: string;
  region: 'CN' | 'OVS';
  tier: string;
  houseIndex: number;
  avgSalary: number;
  costIndex: number;
  jobs: string;
  priceFactor: number;
  rentFactor: number;
  tags: string[];
  industry: string[];
}

export const CUSTOM_TIERS: CustomTierDef[] = [
  { key: 'cn1', label: '国内一线', region: 'CN', tier: '一线', houseIndex: 86, avgSalary: 11500, costIndex: 88, jobs: '极多', priceFactor: 0.9, rentFactor: 0.9, tags: ['新兴都市', '机会多'], industry: ['综合', '互联网'] },
  { key: 'cn15', label: '国内新一线', region: 'CN', tier: '新一线', houseIndex: 55, avgSalary: 8000, costIndex: 65, jobs: '多', priceFactor: 0.55, rentFactor: 0.65, tags: ['宜居', '新兴产业'], industry: ['文创', '制造'] },
  { key: 'cn2', label: '国内二线', region: 'CN', tier: '二线', houseIndex: 40, avgSalary: 7000, costIndex: 58, jobs: '中', priceFactor: 0.4, rentFactor: 0.5, tags: ['性价比高', '节奏适中'], industry: ['制造', '教育'] },
  { key: 'cn3', label: '国内三线', region: 'CN', tier: '三线', houseIndex: 25, avgSalary: 5000, costIndex: 48, jobs: '少', priceFactor: 0.25, rentFactor: 0.35, tags: ['安逸', '熟人社会'], industry: ['旅游', '本地服务'] },
  { key: 'cn4', label: '国内四线及小城', region: 'CN', tier: '四线', houseIndex: 15, avgSalary: 3500, costIndex: 38, jobs: '极少', priceFactor: 0.15, rentFactor: 0.25, tags: ['物价极低', '节奏慢'], industry: ['边贸', '农业'] },
  { key: 'ovs1', label: '海外一线', region: 'OVS', tier: '海外一线', houseIndex: 120, avgSalary: 40000, costIndex: 115, jobs: '极多', priceFactor: 1.4, rentFactor: 1.5, tags: ['全球都市', '竞争激烈'], industry: ['金融', '科技'] },
  { key: 'ovs2', label: '海外二线', region: 'OVS', tier: '海外二线', houseIndex: 95, avgSalary: 30000, costIndex: 95, jobs: '多', priceFactor: 1.0, rentFactor: 1.05, tags: ['宜居海外', '多元'], industry: ['教育', '旅游'] },
  { key: 'ovs3', label: '海外三线', region: 'OVS', tier: '海外三线', houseIndex: 70, avgSalary: 25000, costIndex: 75, jobs: '中', priceFactor: 0.7, rentFactor: 0.7, tags: ['异国风情', '生活安逸'], industry: ['旅游', '贸易'] },
];

export const customTierByKey = (key: string): CustomTierDef => CUSTOM_TIERS.find(t => t.key === key) ?? CUSTOM_TIERS[2];

/**
 * 生成自定义城市（id 编码：custom-<tierKey>-<城市名>）
 * 参数由城市名哈希确定性生成，同名城市每次创建结果一致。
 */
export function createCustomCity(id: string): CityDef {
  const m = id.match(/^custom-(cn1|cn15|cn2|cn3|cn4|ovs1|ovs2|ovs3)-(.+)$/);
  const tier = m ? customTierByKey(m[1]) : CUSTOM_TIERS[2];
  const name = m ? m[2] : id;
  const rand = mulberry32(hashString('city-' + name));
  return {
    id,
    name,
    region: tier.region,
    tier: tier.tier,
    houseIndex: tier.houseIndex + randInt(-3, 3, rand),
    avgSalary: tier.avgSalary + randInt(-500, 800, rand),
    costIndex: tier.costIndex + randInt(-3, 3, rand),
    jobs: tier.jobs,
    tags: [...tier.tags],
    migrateBarrier: '按当地政策',
    priceFactor: tier.priceFactor,
    rentFactor: tier.rentFactor,
    industry: tier.industry,
    commuteNote: `地铁 ${randInt(20, 60, rand)} 分钟至市中心`,
  };
}

/* ═══ 先天特质（第二章 · 10 选 1） ═════════════ */
export const TALENTS: TalentDef[] = [
  { id: 'memory', name: '记忆力超群', icon: '🧠', effect: '学习速度 +20%，考试通过率 +10%', bonus: { 智力: 20 }, unlock: '初始可选 / 持续学习积累' },
  { id: 'social', name: '社交达人', icon: '🎭', effect: '情商判定 +20%，破冰更快', bonus: { 情商: 20 }, unlock: '初始可选 / 大量社交经验' },
  { id: 'iron', name: '意志如铁', icon: '⛰️', effect: '意志判定 +20%，坚持计划不易放弃', bonus: { 意志: 20 }, unlock: '初始可选 / 长期自律' },
  { id: 'beauty', name: '天生丽质', icon: '🌸', effect: '外貌判定 +20%，部分职业更容易', bonus: { 外貌: 20 }, unlock: '初始可选 / 医美·健身' },
  { id: 'sturdy', name: '强健体魄', icon: '💪', effect: '体质判定 +20%，生病概率降低', bonus: { 体质: 20 }, unlock: '初始可选 / 长期锻炼' },
  { id: 'business', name: '商业嗅觉', icon: '💼', effect: '识别商机、投资判断 +20%', bonus: { 运气: 10, 智力: 10 }, unlock: '初始可选 / 经商实践' },
  { id: 'instinct', name: '危机直觉', icon: '🛡️', effect: '危险预警 +20%，减少意外损失', bonus: { 运气: 20 }, unlock: '初始可选 / 经历危险' },
  { id: 'art', name: '艺术天赋', icon: '🎨', effect: '文艺类工作/副业成功率 +20%', bonus: { 情商: 10, 智力: 10 }, unlock: '初始可选 / 艺术训练' },
  { id: 'lang', name: '语言天赋', icon: '🗣️', effect: '外语学习速度 +30%', bonus: { 智力: 15 }, unlock: '初始可选 / 持续使用外语' },
  { id: 'number', name: '数字敏感', icon: '🔢', effect: '数学、会计、编程类 +20%', bonus: { 智力: 20 }, unlock: '初始可选 / 相关训练' },
];

export const talentById = (id: string) => TALENTS.find(t => t.id === id);

/* ═══ 职业池（第八章） ════════════════════════ */
export interface JobDef extends Job {
  gate: string;           // 入职门槛
  intensity: '低' | '中' | '中高' | '高' | '极高' | '自定';
  stability: '低' | '中' | '中低' | '高' | '极高' | '极低';
  growth: '小' | '中' | '大' | '无限';
}

export const JOBS: JobDef[] = [
  { title: '外卖骑手', gate: '无', salary: 6500, takeHome: 5200, workYears: 0, intensity: '极高', stability: '低', growth: '小' },
  { title: '快递员', gate: '无', salary: 6500, takeHome: 5200, workYears: 0, intensity: '高', stability: '低', growth: '小' },
  { title: '工厂普工', gate: '无', salary: 5500, takeHome: 4600, workYears: 0, intensity: '高', stability: '中', growth: '小' },
  { title: '销售代表', gate: '无', salary: 8000, takeHome: 6400, workYears: 0, intensity: '高', stability: '低', growth: '大' },
  { title: '房产中介', gate: '无', salary: 8000, takeHome: 6400, workYears: 0, intensity: '高', stability: '低', growth: '中' },
  { title: '保险代理', gate: '无', salary: 7500, takeHome: 6000, workYears: 0, intensity: '高', stability: '低', growth: '中' },
  { title: '程序员', gate: '本科/培训', salary: 18000, takeHome: 14400, workYears: 0, intensity: '中高', stability: '中', growth: '大' },
  { title: '产品经理', gate: '本科+经验', salary: 22000, takeHome: 17600, workYears: 0, intensity: '中高', stability: '中', growth: '大' },
  { title: 'UI/UX 设计师', gate: '本科/作品集', salary: 13000, takeHome: 10400, workYears: 0, intensity: '中', stability: '中', growth: '中' },
  { title: '新媒体运营', gate: '无/相关经验', salary: 9500, takeHome: 7600, workYears: 0, intensity: '中', stability: '中低', growth: '中' },
  { title: '公务员', gate: '本科+考试', salary: 10000, takeHome: 8500, workYears: 0, intensity: '中', stability: '极高', growth: '中' },
  { title: '事业单位员工', gate: '本科+考试', salary: 8500, takeHome: 7200, workYears: 0, intensity: '低', stability: '极高', growth: '小' },
  { title: '教师', gate: '本科+资格证', salary: 9500, takeHome: 7800, workYears: 0, intensity: '中', stability: '高', growth: '中' },
  { title: '医生', gate: '医学本科+规培', salary: 15000, takeHome: 12000, workYears: 0, intensity: '极高', stability: '高', growth: '大' },
  { title: '护士', gate: '专科+执照', salary: 8000, takeHome: 6500, workYears: 0, intensity: '高', stability: '高', growth: '中' },
  { title: '律师', gate: '法学本科+司考', salary: 15000, takeHome: 12000, workYears: 0, intensity: '高', stability: '中', growth: '大' },
  { title: '会计', gate: '本科+证书', salary: 10000, takeHome: 8000, workYears: 0, intensity: '中', stability: '高', growth: '中' },
  { title: '银行柜员', gate: '本科', salary: 9500, takeHome: 7600, workYears: 0, intensity: '中', stability: '高', growth: '中' },
  { title: '建筑师', gate: '本科+证书', salary: 15000, takeHome: 12000, workYears: 0, intensity: '高', stability: '中', growth: '大' },
  { title: '自由职业者', gate: '无', salary: 6000, takeHome: 6000, workYears: 0, intensity: '自定', stability: '极低', growth: '无限' },
  { title: '小商贩/店主', gate: '启动资金', salary: 8000, takeHome: 8000, workYears: 0, intensity: '极高', stability: '极低', growth: '大' },
  { title: '网约车司机', gate: '驾照+车', salary: 8000, takeHome: 6400, workYears: 0, intensity: '高', stability: '低', growth: '小' },
  { title: '健身教练', gate: '证书', salary: 10000, takeHome: 8000, workYears: 0, intensity: '中', stability: '中低', growth: '中' },
  { title: '翻译', gate: '语言能力', salary: 11000, takeHome: 8800, workYears: 0, intensity: '中', stability: '低', growth: '中' },
  { title: '记者/编辑', gate: '本科', salary: 10000, takeHome: 8000, workYears: 0, intensity: '中高', stability: '中低', growth: '中' },
  { title: '科研人员', gate: '硕博', salary: 14000, takeHome: 11200, workYears: 0, intensity: '高', stability: '中', growth: '中' },
  { title: '工程师（机械/电气）', gate: '本科', salary: 12000, takeHome: 9600, workYears: 0, intensity: '中', stability: '中', growth: '中' },
  { title: '厨师', gate: '技能', salary: 9000, takeHome: 7200, workYears: 0, intensity: '高', stability: '中', growth: '中' },
  { title: '司机/物流', gate: '驾照', salary: 7500, takeHome: 6000, workYears: 0, intensity: '高', stability: '中低', growth: '小' },
  { title: '安保人员', gate: '无', salary: 4800, takeHome: 4200, workYears: 0, intensity: '中', stability: '中', growth: '小' },
];

/* ═══ 载具池（第六章） ════════════════════════ */
export interface VehicleDef {
  name: string;
  tier: string;
  price: [number, number];
  upkeep: [number, number];
  effects: { commute: number; social: number; emotion: number };
  installment?: boolean;
}

export const VEHICLE_POOL: VehicleDef[] = [
  { name: '雅迪电动车', tier: '基础代步', price: [3000, 5000], upkeep: [50, 100], effects: { commute: -8, social: 0, emotion: 0 } },
  { name: '捷安特自行车', tier: '基础代步', price: [2000, 4000], upkeep: [50, 100], effects: { commute: -5, social: 0, emotion: 0 } },
  { name: '五菱宏光 MINI EV', tier: '基础代步', price: [35000, 50000], upkeep: [300, 500], effects: { commute: -20, social: 0, emotion: 0 } },
  { name: '比亚迪·秦 PLUS', tier: '经济实用', price: [98000, 120000], upkeep: [500, 900], effects: { commute: -30, social: 1, emotion: 0 }, installment: true },
  { name: '吉利·星瑞', tier: '经济实用', price: [90000, 130000], upkeep: [500, 1000], effects: { commute: -30, social: 1, emotion: 0 }, installment: true },
  { name: '本田·思域', tier: '经济实用', price: [120000, 160000], upkeep: [600, 1100], effects: { commute: -30, social: 1, emotion: 0 }, installment: true },
  { name: '丰田·卡罗拉', tier: '经济实用', price: [110000, 150000], upkeep: [500, 1000], effects: { commute: -30, social: 1, emotion: 0 }, installment: true },
  { name: '丰田·凯美瑞', tier: '中端商务', price: [200000, 260000], upkeep: [1500, 2200], effects: { commute: -50, social: 2, emotion: 1 }, installment: true },
  { name: '大众·迈腾', tier: '中端商务', price: [200000, 250000], upkeep: [1500, 2000], effects: { commute: -50, social: 2, emotion: 1 }, installment: true },
  { name: '特斯拉·Model 3', tier: '中端商务', price: [230000, 300000], upkeep: [1200, 2000], effects: { commute: -50, social: 2, emotion: 1 }, installment: true },
  { name: '奥迪·A4L', tier: '中端商务', price: [260000, 320000], upkeep: [1800, 2600], effects: { commute: -50, social: 2, emotion: 1 }, installment: true },
  { name: '奔驰·C 级', tier: '豪华入门', price: [350000, 420000], upkeep: [3000, 4500], effects: { commute: -50, social: 4, emotion: 2 }, installment: true },
  { name: '宝马·3 系', tier: '豪华入门', price: [330000, 400000], upkeep: [3000, 4500], effects: { commute: -50, social: 4, emotion: 2 }, installment: true },
  { name: '保时捷·Panamera', tier: '超豪华', price: [1100000, 1500000], upkeep: [8000, 15000], effects: { commute: -50, social: 8, emotion: 3 }, installment: true },
  { name: '奔驰·S 级', tier: '超豪华', price: [1000000, 1400000], upkeep: [8000, 15000], effects: { commute: -50, social: 8, emotion: 3 }, installment: true },
  { name: '法拉利·SF90', tier: '顶级超跑', price: [5000000, 8000000], upkeep: [50000, 120000], effects: { commute: -50, social: 15, emotion: 5 } },
  { name: '兰博基尼·Aventador', tier: '顶级超跑', price: [6000000, 9000000], upkeep: [50000, 120000], effects: { commute: -50, social: 15, emotion: 5 } },
  { name: '劳斯莱斯·幻影', tier: '顶级超跑', price: [8000000, 15000000], upkeep: [80000, 150000], effects: { commute: -50, social: 15, emotion: 5 } },
  { name: '罗宾逊 R66 私人直升机', tier: '特殊载具', price: [22000000, 30000000], upkeep: [300000, 800000], effects: { commute: -90, social: 25, emotion: 8 } },
  { name: '阿兹慕 50 豪华游艇', tier: '特殊载具', price: [20000000, 30000000], upkeep: [250000, 700000], effects: { commute: -70, social: 25, emotion: 8 } },
];

/* ═══ 服饰池 ═════════════════════════════════ */
export interface ClothingDef {
  name: string;
  tier: string;
  price: [number, number];
  slot: '上装' | '下装' | '外套' | '鞋履' | '配饰';
  look: [number, number];
}

export const CLOTHING_POOL: ClothingDef[] = [
  { name: '优衣库基础白 T', tier: '快时尚', price: [79, 149], slot: '上装', look: [1, 1] },
  { name: 'ZARA 休闲衬衫', tier: '快时尚', price: [299, 599], slot: '上装', look: [1, 2] },
  { name: 'UR 简约连衣裙', tier: '快时尚', price: [299, 699], slot: '上装', look: [2, 2] },
  { name: 'H&M 修身牛仔裤', tier: '快时尚', price: [199, 399], slot: '下装', look: [1, 1] },
  { name: '优衣库春季外套', tier: '快时尚', price: [399, 799], slot: '外套', look: [1, 2] },
  { name: '耐克 Air Force 1', tier: '运动潮流', price: [699, 1099], slot: '鞋履', look: [1, 2] },
  { name: '李宁云科技跑鞋', tier: '运动潮流', price: [399, 699], slot: '鞋履', look: [1, 1] },
  { name: '阿迪达斯三叶草卫衣', tier: '运动潮流', price: [499, 899], slot: '上装', look: [1, 2] },
  { name: 'COS 极简羊毛大衣', tier: '轻奢时尚', price: [1800, 3200], slot: '外套', look: [3, 4] },
  { name: 'Massimo Dutti 西装外套', tier: '轻奢时尚', price: [1500, 2600], slot: '外套', look: [3, 4] },
  { name: 'Coach 经典托特包', tier: '轻奢时尚', price: [2500, 4500], slot: '配饰', look: [3, 4] },
  { name: 'Michael Kors 腕表', tier: '轻奢时尚', price: [1200, 2500], slot: '配饰', look: [2, 3] },
  { name: 'Burberry 经典风衣', tier: '高端设计师', price: [9000, 15000], slot: '外套', look: [6, 7] },
  { name: 'Gucci 双 G 腰带', tier: '高端设计师', price: [3500, 6500], slot: '配饰', look: [4, 5] },
  { name: 'Dior 高跟鞋', tier: '高端设计师', price: [5500, 9000], slot: '鞋履', look: [4, 5] },
  { name: 'Prada 尼龙包', tier: '高端设计师', price: [12000, 18000], slot: '配饰', look: [5, 6] },
  { name: 'Louis Vuitton 老花邮差包', tier: '奢侈品牌', price: [18000, 30000], slot: '配饰', look: [8, 9] },
  { name: 'Chanel 经典外套', tier: '奢侈品牌', price: [40000, 80000], slot: '外套', look: [9, 10] },
  { name: 'Hermès 丝巾', tier: '奢侈品牌', price: [4000, 8000], slot: '配饰', look: [6, 7] },
  { name: '百达翡丽 Calatrava', tier: '奢侈品', price: [250000, 450000], slot: '配饰', look: [9, 10] },
];

/* ═══ 房产池（第六章） ════════════════════════ */
export interface PropertyDef {
  tier: string;
  unit: [number, number];        // 单价（元/㎡）
  rent: [number, number];        // 月租金
  fee: [number, number];         // 物业费
}

export const PROPERTY_POOL: PropertyDef[] = [
  { tier: '老破小', unit: [20000, 40000], rent: [3000, 5000], fee: [100, 300] },
  { tier: '普通住宅', unit: [40000, 60000], rent: [4000, 7000], fee: [200, 500] },
  { tier: '改善住宅', unit: [60000, 90000], rent: [6000, 10000], fee: [500, 1000] },
  { tier: '高端住宅', unit: [90000, 150000], rent: [10000, 20000], fee: [1000, 3000] },
  { tier: '豪宅', unit: [150000, 250000], rent: [20000, 40000], fee: [3000, 8000] },
  { tier: '顶级豪宅', unit: [250000, 500000], rent: [40000, 100000], fee: [8000, 20000] },
];

export const PROPERTY_NAMES = {
  '老破小': ['老城区 60㎡ 两居室', '城中村回迁房 55㎡', '老小区顶层 65㎡'],
  '普通住宅': ['近郊 70㎡ 两居室', '新城 85㎡ 三居室', '大学城旁 65㎡ 一居'],
  '改善住宅': ['市区 100㎡ 三居室', '滨江 110㎡ 大三居', '地铁口 95㎡ 三居'],
  '高端住宅': ['核心区 120㎡ 大平层', '江景 130㎡ 四居室', '地标旁 110㎡ 高层'],
  '豪宅': ['顶级地段 200㎡ 复式', '半山 260㎡ 独栋', '江畔 180㎡ 大平层'],
  '顶级豪宅': ['城市地标 300㎡ 顶层复式', '稀缺景观 350㎡ 独栋', '地标云端 400㎡ 大宅'],
} as Record<string, string[]>;

/* ═══ 其他物品池 ═════════════════════════════ */
export interface OtherDef {
  name: string;
  sub: string;
  price: [number, number];
  attr?: Partial<Record<string, number>>;
  emotion?: number;
  social?: number;
  note?: string;
}

export const OTHER_POOL: OtherDef[] = [
  { name: 'iPhone Pro Max', sub: '电子产品', price: [9000, 12000], attr: { 智力: 1, 情绪: 1 }, social: 1, note: '工作效率 +10%' },
  { name: 'MacBook Pro', sub: '电子产品', price: [15000, 25000], attr: { 智力: 2 }, note: '工作效率 +10%' },
  { name: '索尼 A1 相机', sub: '电子产品', price: [25000, 40000], attr: { 智力: 1, 情绪: 1 }, note: '可发展摄影爱好' },
  { name: '家用跑步机', sub: '健身器材', price: [2000, 8000], attr: { 体质: 2, 健康: 3 }, note: '健康 +2~5/月' },
  { name: '划船机', sub: '健身器材', price: [3000, 9000], attr: { 体质: 2, 健康: 3 }, note: '健康 +2~5/月' },
  { name: '瑜伽私教课（季度）', sub: '健身器材', price: [3000, 6000], attr: { 体质: 1, 健康: 2 }, note: '健康 +2~5/月' },
  { name: 'SK-II 套装', sub: '美容护肤', price: [1500, 3000], emotion: 1, note: '外貌临时加成 +1~3' },
  { name: '莱珀妮鱼子套装', sub: '美容护肤', price: [12000, 20000], emotion: 1, note: '外貌临时加成 +2~3' },
  { name: '得到 App 年度课程', sub: '书籍课程', price: [365, 1500], attr: { 智力: 1 }, note: '技能提升' },
  { name: 'Coursera 专业证书课', sub: '书籍课程', price: [2000, 6000], attr: { 智力: 2 }, note: '技能提升' },
  { name: 'MBA 线上课程包', sub: '书籍课程', price: [20000, 50000], attr: { 智力: 3 }, note: '技能提升' },
  { name: '高端全身体检', sub: '医疗保健', price: [2000, 6000], attr: { 健康: 3 }, note: '健康 +2~10' },
  { name: '私人医生年度服务', sub: '医疗保健', price: [10000, 30000], attr: { 健康: 4 }, note: '健康 +2~10' },
  { name: '心理咨询（季度）', sub: '医疗保健', price: [3000, 8000], attr: { 健康: 2, 情绪: 2 }, note: '情绪 +1~3' },
  { name: '智能家居套装', sub: '家居用品', price: [5000, 20000], attr: { 健康: 1 }, emotion: 1, note: '情绪 +1~2' },
  { name: '人体工学椅', sub: '家居用品', price: [1000, 5000], attr: { 健康: 2 }, note: '健康 +1' },
  { name: '高端床垫', sub: '家居用品', price: [8000, 20000], attr: { 健康: 2 }, emotion: 1, note: '健康 +1' },
  { name: '卡地亚 Love 手镯', sub: '奢侈品', price: [30000, 60000], social: 2, note: '外貌 +1~5，社交判定 +1~3' },
  { name: '梵克雅宝四叶草项链', sub: '奢侈品', price: [25000, 50000], social: 2, note: '外貌 +1~5' },
  { name: '金条 100g', sub: '投资品', price: [50000, 60000], note: '资产保值，可能增值' },
  { name: '纪念金币套装', sub: '投资品', price: [15000, 40000], note: '资产保值' },
];

/* ═══ NPC 素材库 ═════════════════════════════ */
export const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '罗', '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹', '彭', '曾', '萧', '田', '董', '潘', '袁', '蔡', '蒋', '余', '杜', '叶', '程', '苏', '魏', '吕', '丁', '任', '沈'];
export const GIVEN_M = ['伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '超', '鹏', '鑫', '浩', '斌', '宇', '轩', '晨', '哲', '俊', '帆', '博', '然', '凯', '毅', '铭', '航'];
export const GIVEN_F = ['芳', '娜', '敏', '静', '丽', '艳', '燕', '玲', '娟', '婷', '雪', '琳', '璐', '颖', '婷', '慧', '悦', '欣', '雨', '琪', '欣怡', '佳', '梦', '悦', '涵', '妍', '思', '璇'];

export const PERSONALITIES = ['开朗', '内向', '豪爽', '阴鸷', '抠门', '慷慨', '稳重', '冲动', '真诚', '虚伪', '势利', '高傲', '谦和', '温柔', '冷漠', '急躁', '耐心', '独立', '依赖', '物质', '理想'];

export const NPC_JOBS = ['程序员', '产品经理', '新媒体运营', '教师', '医生', '护士', '律师', '会计', '销售代表', '银行柜员', '设计师', '公务员', '摄影师', '健身教练', '厨师', '自由职业者', '记者', '翻译', '工程师', '主播', '奶茶店主', '房产中介'];

export const NPC_LOCATIONS = ['公司', '健身房', '咖啡馆', '大学城', '社区', '书店', '医院', '创业园区', '网红餐厅', '公园', '商场', '地铁站', '相亲角', '行业峰会'];

export const NPC_GOALS = ['攒钱买房', '升职加薪', '环游世界', '创业开公司', '考取证书', '结婚生子', '保持健康', '学习新技能', '跳槽到大厂', '买一辆好车'];

export const PREFERENCE_POOL = ['外貌', '经济', '性格', '家庭', '才华'];

export const FAMILY_POOL = ['普通工薪家庭', '书香门第', '经商家庭', '单亲家庭', '体制内家庭', '农村家庭', '医生家庭'];

/* ═══ 人生目标模板（第十一章） ════════════════ */
export const GOAL_TEMPLATES: Array<Omit<LifeGoal, 'id' | 'achieved'>> = [
  { title: '存款达到 100 万', type: '财务', description: '积累人生第一桶金', current: 0, target: 1000000, unit: '元' },
  { title: '买房安家', type: '财务', description: '在所在城市拥有自己的房产', unit: '套' },
  { title: '财务自由', type: '财务', description: '被动收入 ≥ 日常支出 × 2', unit: '倍' },
  { title: '晋升到总监', type: '事业', description: '职业生涯到达管理层', unit: '级' },
  { title: '创业成功', type: '事业', description: '公司年利润 ≥ 50 万', current: 0, target: 500000, unit: '元' },
  { title: '考取公务员', type: '事业', description: '通过考试获得编制', unit: '份' },
  { title: '结婚生子', type: '家庭', description: '组建自己的家庭', unit: '人' },
  { title: '子女考入名校', type: '家庭', description: '子女教育成才', unit: '人' },
  { title: '活到 100 岁', type: '健康', description: '长寿人生', current: 0, target: 100, unit: '岁' },
  { title: '保持规律健身', type: '健康', description: '每月坚持锻炼', unit: '月' },
  { title: '掌握一门外语', type: '技能', description: '外语水平达到流利', unit: '门' },
  { title: '考取职业证书', type: '技能', description: '通过目标证书考试', unit: '本' },
  { title: '环游中国', type: '旅行', description: '到访所有主要城市', unit: '城' },
  { title: '拥有 10 位密友', type: '社交', description: '关系网中密友 ≥ 10', current: 0, target: 10, unit: '人' },
];

/* ═══ 季节与天气（第十八章） ═════════════════ */
export function seasonOf(month: number): { season: string; keys: string[] } {
  if (month >= 3 && month <= 5) return { season: '春', keys: ['回暖', '花开', '柳絮', '春雨'] };
  if (month >= 6 && month <= 8) return { season: '夏', keys: ['炎热', '蝉鸣', '暴雨', '台风'] };
  if (month >= 9 && month <= 11) return { season: '秋', keys: ['凉爽', '落叶', '桂花', '干燥'] };
  return { season: '冬', keys: ['寒冷', '降雪', '冰冻', '雾霾'] };
}

export const WEATHERS: Array<{ name: string; icon: string; mood: string; health?: number; emotion?: number }> = [
  { name: '晴', icon: '☀️', mood: '阳光把街道照得发亮，连行人的脚步都轻快了几分。' },
  { name: '阴', icon: '☁️', mood: '天灰蒙蒙的，空气里有一种安静的压抑。', emotion: -1 },
  { name: '小雨', icon: '🌧️', mood: '细雨落在伞面上，城市的声音变得柔软。' },
  { name: '大雨', icon: '⛈️', mood: '暴雨倾盆，通勤的人潮在站台挤成一团。', emotion: -1 },
  { name: '雪', icon: '❄️', mood: '雪花落满街道，整个城市安静得像一幅画。' },
  { name: '台风', icon: '🌀', mood: '台风过境，许多户外活动取消，人人行色匆匆。', emotion: -1 },
  { name: '雾霾', icon: '🌫️', mood: '雾霾笼罩，街上的人都戴着口罩行色匆匆。', health: -1 },
  { name: '高温', icon: '🥵', mood: '热浪滚滚，柏油路都晒得发软。', emotion: -1 },
  { name: '寒潮', icon: '🥶', mood: '寒潮南下，风刮得脸生疼。', emotion: -1 },
];

/* ═══ 城市事件池（第七章 · 城市标签） ═══════════ */
export const CITY_EVENT_POOL: Record<string, string[]> = {
  '体制机会多': ['【北京】某部委直属单位公开遴选，要求党员', '【北京】央企总部启动校招+社招，编制岗位放出'],
  '外企集中': ['【上海】跨国企业管培生项目开放申请', '【上海】外资投行暑期实习生计划开始投递'],
  '商贸中心': ['【广州】广交会期间商贸岗位大量增加', '【广州】跨境电商新政策落地，小商家活跃'],
  '互联网科技中心': ['【深圳】某大厂大规模招聘，薪资优厚', '【深圳】AI 创业公司获得融资，大量招人'],
  '创业补贴多': ['【深圳】创业补贴申请政策落地，可领 5 万元', '【深圳】新设孵化器入驻补贴'],
  '生活舒适': ['【成都】数字文创产业园建成，新岗位涌现', '【成都】露营经济火热，周边产业兴起'],
  '制造业教育重镇': ['【武汉】新能源车企建厂，大量技术岗位', '【武汉】高校招聘季启动，教育岗位增加'],
  '成本低': ['【重庆】文旅产业复苏，服务业岗位增多', '【重庆】夜市经济扶持政策出台'],
  '边境小城': ['【丹东】边贸政策调整，小商品生意或有变化', '【丹东】边境旅游回暖，游客增多'],
  '金融中心': ['【纽约】投行暑期实习生开放申请', '【伦敦】金融科技公司裁员后重新招人'],
  '科技与文化': ['【东京】游戏公司招聘海外人才，提供签证', '【东京】动漫产业展带动周边行业'],
  '落户难': ['【北京】积分落户新规拟调整', '【上海】人才引进落户新政放宽'],
  '国际化程度高': ['【上海】国际艺术节开幕，文化消费升温'],
  '低税': ['【新加坡】家族办公室税收优惠延续', '【新加坡】金融牌照审批提速'],
  '娱乐产业中心': ['【洛杉矶】流媒体平台大举招聘内容人才', '【洛杉矶】独立制片项目密集立项'],
  '奢华消费': ['【迪拜】高端消费节开幕，奢侈品销量上涨', '【迪拜】旅游签证政策放宽'],
  '生活质量高': ['【悉尼】宜居城市评选上榜，移民咨询增多', '【悉尼】养老产业岗位增加'],
  '创业氛围好': ['【柏林】新创企业孵化器扩容', '【柏林】科技签证政策放宽'],
};

export const ECONOMY_POOL = [
  'CPI 同比上涨 2.1%，生活成本微增。',
  '银行理财收益率下行至 3.2%。',
  '股市震荡，A 股三大指数小幅收跌。',
  '新能源车补贴年底到期，购车需抓紧。',
  '二手房成交量回升，议价空间收窄。',
  '餐饮行业复苏，连锁品牌加速扩张。',
  '房租市场整体平稳，核心区微涨。',
  '汇率波动，进口商品价格略有上涨。',
  '灵活用工规模扩大，兼职岗位增多。',
  'AI 工具普及，部分基础岗位面临调整。',
];

export const POLICY_POOL = [
  '个人所得税起征点或将调整。',
  '公积金贷款额度上调，刚需购房利好。',
  '个人养老金制度扩围，可税前抵扣。',
  '高校毕业生就业补贴政策延续。',
  '医保异地结算范围进一步扩大。',
  '二手房交易税费有望下调。',
  '人才安居住房补贴申请开启。',
  '消费券发放，拉动本地消费。',
];

/* ═══ 叙事相关文案素材 ═══════════════════════ */
export const CONTINUITY_VARIANTS: Record<string, string[]> = {
  '健身': ['你走进健身房，还没跑几步就气喘吁吁。', '你已经能一口气跑完三公里，教练都夸你有进步。', '体脂肉眼可见地下降了，镜子里的自己有了轮廓。', '健身已经成了生活的一部分，你遇见了另一个自己。'],
  '存款': ['这个月开始记账，每一笔都写得清清楚楚。', '省得比想象中多，看着余额你有点安心。', '存款带来的安全感，让你不再为小事焦虑。', '看着数字上涨，你第一次觉得人生有了底气。'],
  '学习': ['学习时手机亮了三次，你忍住了。', '你已经能安安静静坐一下午，笔记写满一页。', '记住的东西越来越多，知识开始连成网。', '学习成了习惯，像吃饭喝水一样自然。'],
  '社交': ['聚会里你还有些拘谨，只和熟悉的人说话。', '你开始主动找人聊天，话题渐渐打开。', '你已经能轻松融入任何圈子，笑声很自然。', '你成了聚会的组织者，大家习惯了有你在。'],
  '恋爱': ['约会的路上你有些紧张，手心微微出汗。', '你开始期待每一次见面，提前想好要说的话。', '相处越来越自然，像相处了很久的老友。', '陪伴成了习惯，你们习惯了彼此的存在。'],
  '加班': ['下班时办公室只剩你一个人，灯还亮着。', '你习惯了凌晨的写字楼，咖啡当水喝。', '咖啡因已经不起作用，你分不清今天是周几。', '你已经很久没在十点前离开过公司。'],
};

/* 标签映射：罗盘分类 → Emoji 锚点 */
export const CATEGORY_EMOJI: Record<string, string> = {
  '目标推进': '🎯',
  '因缘际会': '🎲',
  '职业发展': '💼',
  '社交经营': '🤝',
  '生活事务': '🏠',
  '自由探索': '🧭',
  '商店购物': '🛍️',
};

export const ATTR_LABELS: { key: string; icon: string; name: string }[] = [
  { key: '智力', icon: '🧠', name: '智力' },
  { key: '情商', icon: '💬', name: '情商' },
  { key: '意志', icon: '⛰️', name: '意志' },
  { key: '外貌', icon: '✨', name: '外貌' },
  { key: '体质', icon: '💪', name: '体质' },
  { key: '家境', icon: '🏛️', name: '家境' },
  { key: '运气', icon: '🍀', name: '运气' },
  { key: '健康', icon: '❤️', name: '健康' },
];
