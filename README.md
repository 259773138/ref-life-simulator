# 🌆 Ref 现代人生模拟器 V9.0.13

> ## 🔗 线上地址：**https://259773138.github.io/ref-life-simulator/**（GitHub Pages）
> 源码仓库：https://github.com/259773138/ref-life-simulator （main=源码 / gh-pages=构建产物）

单人月令回合制 · 开放世界人生模拟器 Web 版。严格依据《Ref 现代人生模拟器 · 完整游戏设定 V9.0.13》构建。

每月 7 个行动点，从 16-25 岁开局，经历求学、求职、恋爱、婚姻、生育、买房、创业、养老的完整人生。世界独立运转，叙事由你的行动驱动。

---

## ✨ 核心功能

| 模块 | 说明 |
|---|---|
| 🔌 **API 设置**（最高优先级） | 全局随时可开的弹窗：Base URL / Key / Model / Temperature / Max Tokens / 连通性测试。兼容 OpenAI、DeepSeek、硅基流动、Moonshot、OpenRouter、Ollama。密钥仅存浏览器 `localStorage`，请求直连你的 Endpoint |
| 🎭 **角色创建** | 步进式 4 步：基本信息 → 属性分配（8 项正态分布属性 + 10 点自由分配）→ 天赋（10 选 1）→ 人生目标（1-3 个） |
| 🧭 **决策罗盘** | 7 大一级分类：目标推进 / 因缘际会 / 职业发展 / 社交经营 / 生活事务 / 自由探索 / 商店购物。前 6 类各 3 项，商店 4-8 项，①起编号，行动点实时校验（≤7） |
| 🤖 **LLM 回合引擎** | 组装角色 JSON + 城市简报 + 行动，调用 `/v1/chat/completions`；System Prompt 注入第一章核心规则；解析【叙事剧情】+ JSON 数值 diff 并无缝更新状态机。失败自动回退**本地推演引擎**（无 Key 也能完整体验） |
| 💰 **经济系统** | 月薪/兼职/分红收入，房租/餐饮/交通/维护/分期支出，载具/服饰/房产/其他四大物品池，全款/分期/月租三种购买方式 |
| 💑 **NPC 与恋爱** | 开局按城市+家境生成 17 位 NPC，Lv.0-Lv.4 关系层级、亲密度（0-100）、心动值（0-100）、暧昧/恋人/订婚/伴侣恋爱阶段联动 |
| 🥚 **彩蛋** | 首月自由描述输入「拜访作者」→ 消耗 1 行动点，现金 +1000 万、获「抖音@Ref 的拆解室」12 个月使用权、每月 10 万分红 |
| 💾 **存档** | Zustand persist 自动本地持久化 + 8 位存档码（`XXXX-XXXX`）手动恢复；死亡自动触发一生回顾，可子女继承 / 重开新人生 |
| 📰 **世界简报** | 每月自动生成城市动态 / 政策变化 / 人物消息 / 经济行情；季节天气氛围系统；专注加成（连续同目标 +10%~30%） |

## 🚀 快速开始

```bash
npm install
npm run dev        # 开发（http://localhost:5173）
npm run build      # 生产构建
npm run preview    # 预览构建产物
```

> 首次进入无需 API Key：默认「自动模式」，未配置 Key 时走本地推演引擎；点击右上角「🔌 API 设置」填入任意 OpenAI 兼容服务即可切换为 AI 驱动叙事。

## 🧪 测试

```bash
# 端到端冒烟测试（需先启动 dev server）
npx playwright install chromium
npx playwright test
```

## 📁 项目结构

```
src/
├── types/game.ts          # 全量类型定义（角色/属性/NPC/物品/城市/罗盘/结算/存档）
├── lib/
│   ├── constants.ts       # 城市模板 / 天赋 / 职业池 / 物品池 / NPC 素材 / 目标模板
│   ├── rng.ts             # 确定性随机 / 正态分布 / 金额格式化
│   ├── savecode.ts        # 存档码协议（XXXX-XXXX，32 字符集）
│   ├── ai-client.ts       # OpenAI 兼容客户端 + 连通性测试 + 错误分类
│   ├── prompt.ts          # System Prompt 注入 / 请求组装 / 响应解析（多层容错）
│   ├── world.ts           # NPC 生成 / 天气 / 城市简报 / 决策罗盘 / 商店货架
│   └── demo-engine.ts     # 本地兜底推演引擎（模板叙事 + 数值结算）
├── store/
│   ├── useApiStore.ts     # API 配置（persist 持久化）
│   └── useGameStore.ts    # 游戏状态机（角色创建/行动点/购买/彩蛋/死亡/继承/读档）
└── components/
    ├── ApiSettingsModal.tsx   # API 设置弹窗
    ├── CharacterCreator.tsx   # 角色创建器（4 步）
    ├── MonthlyBoard.tsx       # 每月开局主面板
    ├── CompassPanel.tsx       # 决策罗盘点选器
    ├── SettlementPanel.tsx    # 月末结算面板
    ├── LifeReview.tsx         # 一生回顾 / 存档恢复
    └── ui.tsx                 # 共享排版组件（Emoji 锚点 / Unicode 分隔线 / 圈号）
```

## 🎨 设计规范（第十四章）

- **Emoji 视觉锚点**：每个模块标题配有代表图标（📰 简报 / 🧭 罗盘 / 🎯 目标 / ⚡ 余温…）
- **Unicode 分隔线**：`⚡ ━━━━━━━━━━━━━━━━━━━ ⚡`、`──────────`、`────── ✦ ──────`，全程无 ASCII 拼框
- **表格**：简洁透明的 CSS 网格 / HTML 表格，收支明细带 ➕/➖ 图标
- **风格**：暖纸色底 + 衬线大标题 + 极简信息密度，现代都市感 × 报刊杂志排版感

## 🔑 兼容的 API 示例

| 服务 | Base URL | Model |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openrouter/auto` |
| Ollama（本地） | `http://localhost:11434/v1` | `llama3.1:8b` |

> ⚠ 浏览器直连某些服务可能受 CORS 限制；若报网络错误，可改用允许跨域的服务、本地 Ollama，或将应用跑在本地（`npm run dev`）后访问 `localhost`。

---

## 🚀 部署到 Netlify

本项目是纯前端静态应用（Vite + React + 浏览器 localStorage），非常适合 Netlify 免费托管。任选一种方式：

### 方式一：Netlify Drop（最快，无需命令行）
1. 本地构建产物：`npm run build`（生成 `dist/` 目录）
2. 打开 <https://app.netlify.com/drop>（需登录，免费注册）
3. 把 `dist/` 文件夹直接拖进页面 → 自动部署并生成 `https://xxxx.netlify.app` 网址

### 方式二：连接 Git 仓库（推荐，push 即自动部署）
1. 把项目推送到 GitHub / GitLab / Bitbucket
2. Netlify → **Add new site → Import an existing project** → 选择仓库
3. 构建配置（仓库根目录已带 `netlify.toml`，Netlify 会自动读取，也可手动填）：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. 点击 **Deploy site**，完成后即可在 `https://<site>.netlify.app` 访问

### 方式三：Netlify CLI
```bash
npm i -g netlify-cli
netlify login              # 浏览器授权
netlify init               # 选择 "Create & configure a new site"
netlify deploy --prod --dir=dist
```

### ⚠️ 部署后须知（重要）
- **存档**：存档数据存在**各浏览器的 localStorage**（设计如此——API Key 与存档均绝不上传任何服务器）。换设备/浏览器后，用存档码在另一台设备上恢复即可（新设备在恢复页输入 `XXXX-XXXX` 存档码）。
- **API Key**：同样只存在玩家自己的浏览器里，Netlify 与你的站点服务器都接触不到 Key。
- **LLM 请求是浏览器直连**：Netlify 只托管静态文件，不代理 API 请求；请玩家自行在「🔌 API 设置」填入自己的 Key 与 Endpoint。
- **CORS**：个别 LLM 服务不允许浏览器跨域直连（会提示网络错误）。解决方案：① 换用允许跨域的服务（DeepSeek / 硅基流动 / OpenRouter 等多数可用）；② 本地 Ollama；③ 进阶方案——在 `netlify/functions/` 写一个代理函数转发请求（`lib/ai-client.ts` 已封装为纯函数，便于包装，需要时我可以帮你加上）。
- 免费额度每月 100GB 带宽，个人游玩绰绰有余；域名可自定义（Settings → Domain）。
