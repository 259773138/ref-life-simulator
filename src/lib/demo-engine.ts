/**
 * 本地推演引擎（lib/demo-engine.ts）
 * 当未配置 API Key（或用户选择"本地推演模式"）时，由本地引擎生成叙事与数值变动，
 * 保证游戏循环完整可玩。叙事为模板生成，数值规则遵循设定文档。
 */
import type { AIDiff, CompassOption, GameState, NPC } from '../types/game';
import { cityById, CONTINUITY_VARIANTS } from './constants';
import { clamp, mulberry32, pick, pickN, randInt, hashString } from './rng';

export interface LocalTurnResult {
  narrative: string;
  diff: AIDiff;
}

export function runLocalTurn(state: GameState, selected: CompassOption[], freeText: string): LocalTurnResult {
  const rand = mulberry32(hashString(`${state.year}-${state.month}-${state.character!.name}-${state.totalMonths}-${state.cash}`));
  const c = state.character!;
  const city = cityById(c.city);
  const paragraphs: string[] = [];

  // ── 开篇：季节 + 天气 + 城市氛围 ──
  const weather = state.weather;
  const seasonWord = weather.season === '春' ? '春天' : weather.season === '夏' ? '夏天' : weather.season === '秋' ? '秋天' : '冬天';
  paragraphs.push(`${c.city}的${seasonWord}。${weather.mood}${weather.weatherIcon}`);

  // ── 行动叙事 ──
  const actions = [...selected];
  if (freeText.trim()) actions.push({ category: '自由探索', sub: '自由描述', text: freeText.trim(), cost: 1 } as CompassOption);

  const attrDelta: AIDiff['attributes'] = {};
  let emotionDelta: AIDiff['emotion'] = 0;
  const relDelta: AIDiff['relationships'] = {};
  const extraIncome: AIDiff['income'] = [];
  const extraExpenses: AIDiff['expenses'] = [];
  const events: string[] = [];
  const reminders: string[] = [];

  if (actions.length === 0) {
    paragraphs.push('这个月你没有安排特别的行动，日子像往常一样流过。上班、吃饭、通勤、刷手机，偶尔发呆。平淡也是一种生活。');
  }

  for (const act of actions.slice(0, 7)) {
    const cat = act.category;
    const npc = act.linkedNpcId ? state.npcs.find(n => n.id === act.linkedNpcId) : null;

    if (cat === '目标推进') {
      const variant = pick(CONTINUITY_VARIANTS['学习'], rand);
      paragraphs.push(`你按计划推进${state.goals.filter(g => !g.achieved)[0]?.title ?? '人生目标'}。${variant}`);
      attrDelta['意志'] = (attrDelta['意志'] ?? 0) + 1;
      if (act.sub.includes('存款')) {
        const saved = randInt(500, 3000);
        extraIncome.push({ item: '储蓄', detail: '压缩开支省下的钱', amount: 0 });
        attrDelta['意志'] = (attrDelta['意志'] ?? 0) + 1;
        events.push('自律');
      }
      attrDelta['智力'] = (attrDelta['智力'] ?? 0) + 1;
      attrDelta['健康'] = (attrDelta['健康'] ?? 0) + 1;
      emotionDelta += 1;
    } else if (cat === '因缘际会') {
      if (npc) {
        const delta = act.urgency ? 8 : 5;
        relDelta[npc.name] = { intimacy: delta, note: act.urgency ? '你帮了忙，关系更近了' : '聚了一次，聊得很开心' };
        paragraphs.push(`${npc.name}那边${act.text}。你们${act.urgency ? '约在周末碰面，搬完家一起去吃了顿火锅' : '约着见了一面'}，${
          npc.traits.includes('开朗') ? 'ta 说起话来眉飞色舞' : npc.traits.includes('内向') ? 'ta 话不多，但看得出很感激' : '气氛不错'
        }。`);
        emotionDelta += 2;
      } else {
        const bonus = rand() < 0.3;
        paragraphs.push(bonus
          ? '聚会上你认识了几个有意思的新朋友，还互加了微信。'
          : '活动办得一般，你提前离场，在街边买了杯热饮慢慢走回家。');
        emotionDelta += bonus ? 2 : -1;
        if (bonus) events.push('新朋友');
      }
    } else if (cat === '职业发展') {
      const job = state.job;
      if (!job) {
        if (act.sub.includes('兼职')) {
          const income = randInt(1500, 4000);
          extraIncome.push({ item: '兼职', detail: '临时兼职收入', amount: income });
          paragraphs.push('你找了份临时兼职，忙了半个多月，拿到了一笔收入。虽然辛苦，但至少有了现金流。');
          emotionDelta -= 1;
        } else {
          paragraphs.push('你整理简历，投了几家公司，收到两三个面试邀请。求职季的竞争比想象中激烈。');
          attrDelta['智力'] = (attrDelta['智力'] ?? 0) + 1;
        }
      } else {
        if (act.sub.includes('晋升')) {
          const chance = 0.35 + (c.attrs.情商 + c.attrs.智力) / 400 + (state.focusBonus || 0) / 100;
          if (rand() < chance) {
            const raise = Math.round(job.salary * (0.1 + rand() * 0.2));
            extraIncome.push({ item: '加薪', detail: '绩效突出获得加薪', amount: Math.round(raise * 0.8) });
            events.push('加薪');
            emotionDelta += 5;
            paragraphs.push(`你主动找领导沟通，拿出最近的成果。领导沉吟片刻，答应了你的加薪申请——从下个月起月薪 +${raise} 元。`);
          } else {
            paragraphs.push('你争取晋升机会，但领导说名额有限，让你再沉淀半年。你表面平静，心里有些失落。');
            emotionDelta -= 2;
          }
        } else if (act.sub.includes('技能')) {
          attrDelta['智力'] = (attrDelta['智力'] ?? 0) + 2;
          paragraphs.push('你报名了专业课程，工作日晚上和周末都在上课。笔记记了厚厚一本，累但充实。');
        } else {
          paragraphs.push('你关注了几家心仪公司的招聘，投出了简历。等待回音的日子，说不忐忑是假的。');
        }
      }
    } else if (cat === '社交经营') {
      if (npc) {
        if (act.love) {
          const heartDelta = randInt(3, 8);
          relDelta[npc.name] = { intimacy: 5, heart: heartDelta, note: act.sub.includes('表白') ? '表白：心意已传达' : '一次愉快的约会' };
          paragraphs.push(`你和${npc.name}${act.sub.includes('约会') ? '约在周末见面' : '约了时间单独见面'}。${
            act.sub.includes('表白')
              ? '你鼓起勇气把话说出了口。空气安静了几秒，然后她/他的眼睛弯了起来。' + (heartDelta >= 6 ? '「我也是。」' : '「我…需要想想。」她/他低下头。')
              : '你们聊了很久，从工作聊到生活，散场时天已经黑了。'
          }`);
          emotionDelta += 3;
        } else {
          relDelta[npc.name] = { intimacy: randInt(4, 8), note: '叙旧聊天，关系回暖' };
          paragraphs.push(`你和${npc.name}约出来吃饭。${npc.lifestyle}，席间说起近况，互相吐槽了几句生活的琐碎。`);
          emotionDelta += 2;
        }
      } else {
        paragraphs.push('你参加了一场行业交流活动，交换了一叠名片，也加了几个新朋友的微信。');
        attrDelta['情商'] = (attrDelta['情商'] ?? 0) + 1;
      }
    } else if (cat === '生活事务') {
      if (act.sub.includes('健康')) {
        if (rand() < 0.5) {
          paragraphs.push('体检报告出来了，各项指标基本正常，医生说注意作息就行。你松了口气。');
          attrDelta['健康'] = (attrDelta['健康'] ?? 0) + 2;
        } else {
          paragraphs.push('体检发现你有点亚健康：血脂偏高，颈椎劳损。医生开了药，叮嘱你少熬夜。');
          attrDelta['健康'] = (attrDelta['健康'] ?? 0) - 1;
          extraExpenses.push({ item: '医疗', detail: '体检与药品', amount: randInt(300, 1200) });
          reminders.push('下月复查，注意作息');
        }
      } else if (act.sub.includes('住房')) {
        const rent = randInt(500, 1500);
        extraExpenses.push({ item: '搬家', detail: '搬家与杂费', amount: rent });
        paragraphs.push('你研究了一圈房源，看中一间采光更好的房间，果断搬了过去。新家的第一晚，睡得特别香。');
        emotionDelta += 2;
      } else {
        paragraphs.push('你抽空把身份证、社保、保险这些杂事整理了一遍，办完几件拖了很久的事，心里清爽了不少。');
        emotionDelta += 1;
      }
    } else if (cat === '自由探索') {
      const r = rand();
      if (r < 0.4) {
        paragraphs.push('你在书店/咖啡馆消磨了一个下午，偶遇一本有意思的书，还和一个陌生人聊了几句。');
        attrDelta['智力'] = (attrDelta['智力'] ?? 0) + 1;
        emotionDelta += 1;
      } else if (r < 0.75) {
        const invest = randInt(1000, 5000);
        const gain = rand() < 0.6 ? Math.round(invest * (0.02 + rand() * 0.1)) : -Math.round(invest * (0.02 + rand() * 0.06));
        extraIncome.push({ item: '投资收益', detail: '小额理财', amount: Math.abs(gain) });
        paragraphs.push(gain >= 0
          ? `你拿 ${invest} 元小额试水了理财，运气不错，赚了 ${gain} 元。`
          : `你拿 ${invest} 元试水投资，行情波动，亏了 ${Math.abs(gain)} 元。小亏当交学费。`);
        emotionDelta += gain >= 0 ? 2 : -2;
        if (gain < 0) reminders.push('投资有风险，量力而行');
      } else {
        paragraphs.push('你报了一门兴趣体验课，笨手笨脚但乐在其中，认识了几个同好。');
        attrDelta['情商'] = (attrDelta['情商'] ?? 0) + 1;
        emotionDelta += 2;
      }
    } else if (cat === '商店购物') {
      // 商店选项在提交前已被 store 立即执行，这里只做叙事兜底
      paragraphs.push('你为这个月的购物计划花了不少时间挑选对比。');
    }
  }

  // ── 自由描述 ──
  if (freeText.trim() && !freeText.includes('拜访作者')) {
    paragraphs.push(`你描述的行动：「${freeText.trim().slice(0, 60)}」——生活因此多了一段小小的插曲。`);
  }

  // ── 工作状态 ──
  if (state.job) {
    const j = state.job;
    const overtime = rand() < 0.45;
    paragraphs.push(overtime
      ? `${j.title}的工作依旧忙碌，这个月加了几次班。写字楼的灯，凌晨还亮着几盏。`
      : `${j.title}的工作按部就班，这个月节奏正常，周末还能有自己的时间。`);
    if (overtime) {
      attrDelta['健康'] = (attrDelta['健康'] ?? 0) - 1;
      emotionDelta -= 1;
    }
  }

  // ── 关系网络 ──
  const stable = state.npcs.filter(n => n.alive && n.level >= 1 && !selected.some(o => o.linkedNpcId === n.id));
  if (stable.length && rand() < 0.4) {
    const n = pick(stable, rand);
    paragraphs.push(`${n.name}这个月${n.goal}，在朋友圈发了一条动态。你点了个赞，没有评论。`);
  }

  // ── 尾声 ──
  paragraphs.push('月末的晚上，你躺在床上复盘这个月。窗外是这个城市的灯火，你想起一句话：日子是过出来的。');

  // 综合情绪修正（上限控制由 store 处理）
  emotionDelta = clamp(Math.round(emotionDelta), -10, 12);

  const diff: AIDiff = {};
  if (attrDelta && Object.keys(attrDelta).length) diff.attributes = attrDelta;
  if (emotionDelta) diff.emotion = emotionDelta;
  if (relDelta && Object.keys(relDelta).length) diff.relationships = relDelta;
  if (extraIncome.length) diff.income = extraIncome.filter(x => x.amount > 0);
  if (extraExpenses.length) diff.expenses = extraExpenses;
  if (events.length) diff.events = events;
  if (reminders.length) diff.reminders = reminders;

  return { narrative: paragraphs.join('\n\n'), diff };
}

/** 生成"上月余温"（第十八章 · 月中片段） */
export function localWarmth(state: GameState): string[] {
  const rand = mulberry32(hashString(`${state.year}-${state.month}-warm`));
  const pool = [
    '深夜加完班，你在便利店买了杯关东煮，店员多送了你一颗蛋。',
    '路过花店，你鬼使神差地买了一支向日葵，插在桌上的矿泉水瓶里。',
    '某个雨天的傍晚，你在屋檐下躲雨，和陌生人大笑着分了一把伞。',
    '你翻到手机里一张旧照片，突然想起很久以前的一个下午。',
    '楼下新开的早餐铺子，老板记住了你"不要香菜"的备注。',
  ];
  return pickN(pool, rand() < 0.5 ? 2 : 1, rand);
}
