/**
 * LLM 提示词组装与响应解析（lib/prompt.ts）
 * - buildSystemPrompt：注入设定文档第一章核心规则
 * - buildUserPayload：角色 JSON + 城市简报 + 用户行动
 * - parseAiResponse：提取【叙事剧情】与 JSON diff，带多层容错
 */
import type { CompassOption, GameState, AIDiff, AIParsedResult, NPC } from '../types/game';
import { ATTR_LABELS } from './constants';

const SYSTEM_RULES = `你正在运行《Ref 现代人生模拟器 V9.0.13》——一个单人月令回合制·开放世界人生模拟器。

【你的身份】你是这个现代都市人生模拟器的世界系统。玩家向你提交「本月行动」，你负责展开叙事并结算数值。

【核心规则（必须严格遵守）】
1. 绝不替玩家做决定。你可以提供选项、提示后果、展示世界反馈，但最终选择权永远在玩家手中。叙事中不要替玩家做出玩家未选择的选择。
2. 叙事由行动驱动。只有玩家明确选择或描述某个行动后，你才能展开详细叙事补充。未选择的事件线保持静止。
3. 世界独立运转。每月城市与 NPC 在后台自行演化（已在城市简报中体现），你的叙事要体现世界的自主性。
4. 现代感与真实性。叙事基于现代中国/海外真实城市，自然融入通勤、外卖、短视频、网购、加班、租房等现代生活细节。
5. 数值克制与因果。数值变动必须与叙事合理对应，不滥发福利、不无理由惩罚。属性变动幅度建议每次 0~3 点（重大事件可到 5+），并在叙事或备注中解释原因。
6. 响应格式。必须严格按下方「输出格式」返回，叙事部分用中文，JSON 部分必须是合法 JSON。

【输出格式】（只输出以下两块内容，不要输出任何额外解释或代码块围栏之外的文字）
【叙事剧情】
（2-4 段本月叙事：围绕玩家选择的行动展开，包含场景、对话或心理细节；若玩家本月无所作为也请描写生活常态）

【数值变动】
{JSON}

【JSON 字段说明】
{
  "cash": 0,            // 存款净变动（含全部收支的净额，可省略由 income/expenses 推导）
  "income": [{"item":"兼职","detail":"周末文案","amount":800}],   // 额外收入（不含系统自动的月薪/分红）
  "expenses": [{"item":"娱乐","detail":"聚餐 2 次","amount":600}], // 额外支出（不含系统自动的房租/餐饮/交通）
  "attributes": {"智力": 1, "情商": 0, "意志": 0, "外貌": 0, "体质": 0, "家境": 0, "运气": 0, "健康": 0},
  "emotion": 2,         // 情绪变动 -20~+15
  "lookBuffs": [{"name":"理发","value":2,"duration":1,"cost":150}], // 临时外貌 buff
  "relationships": {"王强": {"intimacy": 5, "heart": 0, "note":"帮搬家后关系更近"}},
  "newNPCs": [{"name":"苏晚","gender":"female","job":"插画师","city":"上海","age":23,"traits":["温柔","理想"],"appearance":"齐肩短发","location":"咖啡馆","intimacy":20,"heart":0}],
  "events": ["升职", "生病"],   // 事件标签，用于资产/关系变动摘要
  "items": [],                 // 特殊物品（一般用不到）
  "debt": 0,                   // 负债净变动
  "job": null,                 // 若换工作：{"title":"程序员","salary":18000,"company":"某互联网公司"}；无变化则 null
  "cityChange": null,          // 若迁移城市：城市中文名（如"上海"）
  "reminders": ["下月房租合同到期，需提前续签"],
  "memory": "第一次拿到升职通知的深夜，你盯着邮件看了很久。"   // 本月记忆碎片（供"上月余温"使用）
}
注意：attributes 中只列出发生变化的键即可；其余省略。relationships 的 key 必须是玩家 NPC 列表中的真实姓名。`;

export function buildSystemPrompt(): string {
  return SYSTEM_RULES;
}

/** NPC 简档（供 LLM 引用） */
function npcBrief(npc: NPC): string {
  return `${npc.name}（${npc.gender === 'male' ? '男' : '女'}，${npc.age}岁，${npc.city}·${npc.job}，性格：${npc.traits.join('/')}，亲密度${npc.intimacy}${npc.heart ? `，心动值${npc.heart}` : ''}，关系：Lv.${npc.level}${npc.romanceStage ? `（${npc.romanceStage}）` : ''}）`;
}

export function buildUserPayload(state: GameState, actions: string[], freeText: string, selected: CompassOption[]): string {
  const c = state.character!;
  const attrs = ATTR_LABELS.map(l => `${l.name}${(c.attrs as any)[l.key] ?? 0}`).join('、');

  const briefing = [
    '【城市简报】',
    '· 城市动态：' + (state.cityBriefing.dynamics.join('；') || '无'),
    '· 政策变化：' + (state.cityBriefing.policies.join('；') || '无'),
    '· 人物消息：' + (state.cityBriefing.people.join('；') || '无'),
    '· 经济行情：' + (state.cityBriefing.economy.join('；') || '无'),
  ].join('\n');

  const goals = state.goals.map((g, i) => `${i + 1}. ${g.title}（${g.achieved ? '已达成' : `进度 ${g.current ?? 0}/${g.target ?? '—'}${g.unit ?? ''}`}）`).join('\n');

  const npcs = state.npcs.filter(n => n.alive).slice(0, 20).map(npcBrief).join('\n');

  const selections = selected.map(o => `${o.no}号【${o.category}·${o.sub}】${o.text}`).join('\n');

  const focusNote = state.focusBonus > 0 ? `（当前专注加成 ${state.focusBonus}%，连续专注同一目标的效果）` : '';

  const active = [
    `当前时间：${state.year} 年 ${state.month} 月（总第 ${state.totalMonths} 回合），年龄 ${c.age} 岁，预期寿命 ${state.lifeExpectancy} 岁`,
    `所在城市：${c.city}（${c.city}${state.weather?.weather ? `，本月天气：${state.weather.weather} ${state.weather.mood}` : ''}）`,
    `职业：${state.job ? `${state.job.title}（税前 ${state.job.salary} 元/月）` : '无业'}`,
    `存款：${Math.round(state.cash)} 元；负债：${Math.round(state.debt)} 元`,
    `住房：${state.properties.find(p => p.usage !== '出租' && !p.owned) ? '租房' : state.properties.some(p => p.owned && p.usage === '自住') ? '自有住房' : '租房'}`,
    `基础属性：${attrs}；情绪：${c.emotion}；天赋：${c.talents.map(t => t).join('/')}`,
    `外貌有效值：${effectiveAppearance(state)}（基础 ${c.attrs.外貌} + 服饰 ${clothingBonus(state)} + 临时 ${buffBonus(state)}）`,
  ].join('\n');

  const loveLine = spouseLine(state);

  return `【角色与状态】
${active}

【人生目标】
${goals}

【本月玩家行动（决策罗盘选择）】
${selections || '（未选择编号选项）'}
【自由描述】
${freeText.trim() || '（无）'}

${briefing}

【关系网 NPC】
${npcs}
${loveLine}

请基于以上内容，围绕玩家选择的行动展开本月叙事并结算数值。严格执行输出格式。`;
}

function spouseLine(state: GameState): string {
  if (state.spouseId) {
    const sp = state.npcs.find(n => n.id === state.spouseId);
    if (sp) return `【伴侣】${sp.name}（${sp.romanceStage ?? '伴侣/夫妻'}，亲密度 ${sp.intimacy}，心动值 ${sp.heart}）`;
  }
  const crushes = state.npcs.filter(n => n.alive && n.heart >= 30);
  if (crushes.length) {
    return `【潜在恋爱对象】${crushes.map(n => `${n.name}（心动值 ${n.heart}）`).join('、')}`;
  }
  return '';
}

function effectiveAppearance(state: GameState): number {
  return Math.min(100, state.character!.attrs.外貌 + clothingBonus(state) + buffBonus(state));
}
function clothingBonus(state: GameState): number {
  return state.clothing.reduce((s, it) => s + it.lookBonus, 0);
}
function buffBonus(state: GameState): number {
  return state.lookBuffs.reduce((s, b) => s + b.value, 0);
}

/* ═══ 响应解析 ═══════════════════════════════ */

export function parseAiResponse(raw: string): AIParsedResult {
  let narrative = raw;
  let diff: AIDiff | null = null;

  // 1) 分离【叙事剧情】与【数值变动】
  const narrMatch = raw.match(/【\s*叙事剧情\s*】([\s\S]*?)(?=【\s*数值变动\s*】|$)/);
  if (narrMatch && narrMatch[1].trim()) {
    narrative = narrMatch[1].trim();
  } else {
    // 尝试 JSON 围栏之前的文本
    const before = raw.split(/```json|```/)[0].trim();
    if (before) narrative = before;
  }

  // 2) 提取 JSON
  const jsonText = extractJsonBlock(raw);
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      diff = sanitizeDiff(parsed);
    } catch {
      // 尝试修复常见问题：尾逗号、中文引号、单引号
      const fixed = jsonText
        .replace(/，/g, ',')
        .replace(/：/g, ':')
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/'/g, '"');
      try {
        diff = sanitizeDiff(JSON.parse(fixed));
      } catch {
        diff = null;
      }
    }
  }

  return { narrative, diff, raw };
}

function extractJsonBlock(raw: string): string | null {
  // a) ```json ... ```
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return tryBalance(fence[1]);

  // b) 【数值变动】之后的内容
  const after = raw.split(/【\s*数值变动\s*】/);
  if (after.length > 1) {
    const tail = after[after.length - 1];
    const cleaned = tail.replace(/```/g, '').trim();
    const bal = tryBalance(cleaned);
    if (bal) return bal;
  }

  // c) 全文第一个 { ... } 平衡块
  return tryBalance(raw);
}

function tryBalance(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

const ATTR_KEYS = ['智力', '情商', '意志', '外貌', '体质', '家境', '运气', '健康'] as const;

function sanitizeDiff(parsed: any): AIDiff | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const d: AIDiff = {};

  if (typeof parsed.cash === 'number' && Number.isFinite(parsed.cash)) d.cash = parsed.cash;

  if (Array.isArray(parsed.income)) {
    d.income = parsed.income
      .filter((x: any) => x && typeof x.amount === 'number')
      .map((x: any) => ({ item: String(x.item ?? '收入'), detail: String(x.detail ?? ''), amount: Math.abs(x.amount) }));
  }
  if (Array.isArray(parsed.expenses)) {
    d.expenses = parsed.expenses
      .filter((x: any) => x && typeof x.amount === 'number')
      .map((x: any) => ({ item: String(x.item ?? '支出'), detail: String(x.detail ?? ''), amount: Math.abs(x.amount) }));
  }

  if (parsed.attributes && typeof parsed.attributes === 'object') {
    const attrs: Partial<Record<string, number>> = {};
    for (const k of ATTR_KEYS) {
      const v = parsed.attributes[k];
      if (typeof v === 'number' && Number.isFinite(v)) attrs[k] = v;
    }
    if (Object.keys(attrs).length) d.attributes = attrs;
  }

  if (typeof parsed.emotion === 'number' && Number.isFinite(parsed.emotion)) d.emotion = parsed.emotion;

  if (Array.isArray(parsed.lookBuffs)) {
    d.lookBuffs = parsed.lookBuffs
      .filter((x: any) => x && typeof x.value === 'number')
      .map((x: any) => ({
        name: String(x.name ?? '外貌增益'),
        value: Math.min(10, Math.abs(x.value)),
        duration: Math.max(1, Math.min(12, Math.round(x.duration ?? 1))),
        cost: typeof x.cost === 'number' ? Math.abs(x.cost) : undefined,
      }));
  }

  if (parsed.relationships && typeof parsed.relationships === 'object') {
    const rel: AIDiff['relationships'] = {};
    for (const [name, v] of Object.entries(parsed.relationships) as [string, any][]) {
      if (!v || typeof v !== 'object') continue;
      const item: { intimacy?: number; heart?: number; note?: string } = {};
      if (typeof v.intimacy === 'number') item.intimacy = Math.round(v.intimacy);
      if (typeof v.heart === 'number') item.heart = Math.round(v.heart);
      if (typeof v.note === 'string') item.note = v.note.slice(0, 80);
      if (Object.keys(item).length) rel[name] = item;
    }
    if (Object.keys(rel).length) d.relationships = rel;
  }

  if (Array.isArray(parsed.newNPCs)) {
    d.newNPCs = parsed.newNPCs.filter((x: any) => x && typeof x.name === 'string' && (x.gender === 'male' || x.gender === 'female'));
  }

  if (Array.isArray(parsed.events)) d.events = parsed.events.map(String);

  if (typeof parsed.debt === 'number' && Number.isFinite(parsed.debt)) d.debt = parsed.debt;

  if (parsed.job === null) d.job = null;
  else if (parsed.job && typeof parsed.job === 'object' && typeof parsed.job.title === 'string' && typeof parsed.job.salary === 'number') {
    d.job = { title: parsed.job.title, salary: Math.round(parsed.job.salary), company: parsed.job.company ? String(parsed.job.company) : undefined };
  }

  if (parsed.cityChange === null) d.cityChange = null;
  else if (typeof parsed.cityChange === 'string' && parsed.cityChange.trim()) d.cityChange = parsed.cityChange.trim();

  if (Array.isArray(parsed.reminders)) d.reminders = parsed.reminders.map(String).slice(0, 6);

  if (typeof parsed.memory === 'string' && parsed.memory.trim()) d.memory = parsed.memory.trim();

  if (Array.isArray(parsed.items)) d.items = parsed.items;

  // 若完全没有有效字段，返回 null
  const keys = Object.keys(d).filter(k => {
    const v = (d as any)[k];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null;
  });
  return keys.length ? d : null;
}
