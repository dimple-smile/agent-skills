---
name: aha
description: Create a standalone, visually rich HTML explainer page that builds a correct mental model of any complex concept — layered from a one-liner through intuition to the real mechanism and its boundaries. Use when the user wants to truly understand a topic (aha, "讲懂 X", "讲讲 X", "X 到底是什么 / 怎么工作的", requests for visual or diagram explanations). Not for ultra-brief summaries, expert-first deep dives, or rewriting existing documentation.
version: 1.0.0
license: ISC
tags:
  - explanation
  - visualization
  - education
  - html
---

# AHA · 概念图解

把任意复杂概念讲成一份**渐进分层、大图少字、可交互**的独立 HTML 页面。
目标是建立**正确的心智模型** —— 不是模仿幼儿说话，不是让人"觉得懂了"，
而是让人"真的懂了"。

## When to Use

**用：**
- 用户想真正理解某概念（"讲讲 X""X 到底是什么""X 和 Y 有什么区别"）
- 用户要求图解 / 可视化 / 做一页解释（含 aha）
- 用户想给别人分享一份概念讲解

**便宜预检**：两三句话能答清的问题直接答，不起本 skill ——
完整的图解页是为"值得读五分钟"的概念准备的。

**不用：**
- 超短摘要、一句话回答
- 专家向深潜（读者本来就会，缺的不是解释）
- 改写既有文档（那是文档编辑任务）

## 立场（先读这个）

1. **用户的明确要求 > 本 skill 的默认建议。** 用户指定语言、受众、文件位置、
   讲解范围或动效偏好时，按用户的执行。
2. 语言跟随用户提问的语言。
3. 简化不得牺牲准确性：说不准的事实不编精确数字，注明推断与未验证的部分。
4. 读者是**聪明的、只是不熟悉这个领域的人** —— 尊重他们，不居高临下，
   禁用"很简单""显然""只要……就行"。

## 工作流（五步）

### Step 1 · 读资产（有读预算）

```
skills/aha/assets/
├── design-tokens.css   # 颜色/字号/组件类的唯一来源 —— 内联进页面，不修改
├── reference.html      # 范例页 —— 每次生成都完整读一遍，学"形"
├── simulator.html      # 步骤模拟器 —— 需要讲"随时间发生的过程"时读
└── snippets/           # 片段 —— 按形式映射表选用时读
    ├── comparison-cards.html   # 第 5 层对比
    ├── flow-diagram.html       # 静态流程/结构
    ├── boundary-callout.html   # 类比框/警示条/大白话
    ├── takeaway-block.html     # 第 7 层收尾
    ├── fable.md                # 寓言故事模式 —— 用户明确要求时才读（见下）
    └── vgpu-field.html         # 着色器展示层（选配，见下）
```

预算：`reference.html` 每次必读（它定义页面的"形"）；
simulator 与 snippets 只在用到时读；
`DESIGN.md` 只在你考虑改 tokens 或用户质疑美学时读。

### Step 2 · 校准起点

分析用户的提问，判定起点级别（见下节），页首放对应徽章。

### Step 3 · 生成页面

写到 `~/.aha/<slug>.html` —— 所有生成页的统一主页（`aha serve` 默认服务
此目录，索引页即历史列表，页面地址为 `端口/<slug>.html`）。用户指定位置则从之。

**硬规则：**
- 单文件自包含：内联全部 CSS/SVG/JS；渲染与核心解释**零远程依赖**
  （外链只允许作为引用出处）
- `design-tokens.css` **原样内联**（保留 `aha-design-tokens vN` 标记），
  一字不改；页面自定义 CSS 允许（布局、自绘 SVG），但**取色只能 `var(--token)`**
- tokens 块之外**禁止任何颜色字面量**（hex/rgb/hsl）—— `aha check` 会拦
- **每页标配工具条**（`.toolbar`，从 reference.html 原样复制 markup + [TOOLBAR] 脚本）：
  深浅色切换 / warm·pop·ink 风格切换 / 页内分享按钮（serve 环境一键隧道，
  file:// 下自动转为 CLI 指引；经 *.trycloudflare.com 公开访问时分享按钮自动隐藏，公开访客保留主题/风格切换）。首访跟随系统明暗，选择记忆在 localStorage。
  `</head>` 前放主题 bootstrap 三行脚本（从 reference.html 复制，防 FOUC 首帧闪烁）
- 语义 HTML：`<title>` / `html[lang]` / viewport；全文恰好一个 `<h1>`；
  标题层级不跳档；`<img>` 必带 alt
- 生成非中文页面时，用页内 CSS 覆写 tokens 的中文伪内容与工具条文案：
  `.takeaway::before{content:"Remember"}`、`.analogy-limit::before`、
  `.compare-card .out::before`、`.fail .tag` 前缀、工具条三按钮文字与
  `sim-controls` 按钮文字（后两者直接改 markup 文本）
- **模拟器节点标签跟随页面语言**；仅当标签是专有技术标识符
  （如 `ClientHello`、`Q·Kᵀ`）时保留原文。禁止为非英文页生造英文标签
  （✗Merge、✗Isolate 这类普通词的直译梗）
- **页面会被分享给从未提问的读者**：正文不得出现"你问的""你的第二问"
  这类仅对原提问者成立的指代 —— 改成自足表述（"回到开头的问题"），
  或在页首引用块保留原始问题
- 每页结尾必须过一遍本文"质量门"小节

### Step 4 · 质量门

```bash
npx @dimples/aha check ~/.aha/<slug>.html
# CLI 未从 npm 安装时的仓库内等价调用：
node skills/aha/cli/src/cli.mjs check ~/.aha/<slug>.html
```

门不过 → 修 → 重跑。**每轮只修被点名的那一个问题**；连续两轮无改善 →
停止修复，如实报告未解决的问题。不得为了过门删内容、藏溢出、缩字号。

### Step 5 · 交付与回执

返回**可点击的文件链接**（粘贴 HTML 源码到聊天不算交付），并附固定回执：

```
check: 11/11 门通过, 0 警告
视觉验证: passed | skipped(无浏览器) | failed
校准: 起点 Lx（依据：<一句证据>）
修复轮次: 0-2
```

随后运行 `npx @dimples/aha start`（幂等：未运行则后台拉起守护，已运行则复用；
仓库内等价 `node skills/aha/cli/src/cli.mjs start`），并把输出原样带给用户：

```
http://127.0.0.1:7332/<slug>.html
你历史产生过 N 条概念图解，可以访问 http://127.0.0.1:7332 查看概念书架
如果你还想通过一个寓言故事来方便记忆，请对我说：补充寓言故事
```
（N 用 `aha start` 输出里的实际篇数；三行都必须给出 —— 第一行直达本页，
第二行是书架入口，第三行是寓言模式的唯一推销，用户不接话就到此为止。）

有浏览器工具（如 agent-browser）时：窄屏 + 宽屏各截一次，亲眼确认无溢出、
模拟器可步进，回执才能写 `passed`；没有就如实写 `skipped`。
**没做过视觉验证，不得声称视觉验证通过。**

需要分享时：

```bash
npx @dimples/aha serve            # 本地 7332，主页 = ~/.aha 历史列表
npx @dimples/aha share            # https://xxx.trycloudflare.com 临时公网链接
```

## 七层骨架（固定，内容可取舍）

| # | 层 | 必须做到 |
|---|-----|----------|
| 1 | 一句话核心 | 首屏：概念名 + 一句话说清 + 主视觉 + 起点徽章 |
| 2 | 为什么存在 | before/after 对比：没有它时怎么办、痛点是什么 |
| 3 | 直觉 | 一个类比 + **失效边界**（不写失效点的类比不许上页） |
| 4 | 真实机制 | 大白话先行，术语后置且全文含义一致；流程类配**步骤模拟器** |
| 5 | 容易混淆 | 按"各自**改变什么**"对比 2-3 个邻居概念，每卡有"输出："行 |
| 6 | 边界与失败 | 失败模式配 1-2 字记忆标签（同页长度一致）；主动纠正会致错误心智模型的误区 |
| 7 | 记 | 一句话公式式收尾，关键词 `<mark>` 高亮（2-6 处），不引入新概念 |

**菜单，不是模板**：按主题取舍 —— 不是每层都要写满；某层对这个主题没价值
就不写，但第 1、4、7 层永远要有。反过来，**不得为了凑层加没有解释价值的内容**。

## 起点校准（渐进式的实现）

| 级别 | 信号 | 动作 |
|------|------|------|
| L1 零基础 | 纯白话提问 | 标准起点，类比从生活经验取 |
| L2 相邻背景 | 提问露出相邻领域身份（"我写 Rust 的，讲讲 GC"） | 用相邻领域做桥接类比，跳过最基础铺垫 |
| L3 已入门 | 已正确使用本领域术语（"梯度下降"用得准） | 起点上移，跳过基础类比，直入机制与边界 |

**校准只调起点与类比选择，永不删层。** 判断错了，读者往下读一层就自愈；
但砍掉内容是不可挽回的。用户显式指定受众时，覆盖一切信号。
页首徽章透明标注，且**必须点明依据**（`起点 L2 · 有相邻背景：统计基础`
`起点 L3 · 术语使用准确：hidden state`），L2 页同时点明桥接来源
（pill："桥接自你熟悉的：Rust 所有权"）。

## 关键契约

**类比边界** —— 每个类比：① 只讲一个映射；② 标注在哪里失效，
且失效点中至少一条要指向**类比所掩盖的真实机制**
（如手套类比掩盖了"结果测量前不存在"、房卡类比掩盖了"静态判定 vs 动态巡视"）；
③ 建立直觉后仍要讲真实机制，类比不能替代机制。

**数字纪律** —— 关键数字当场复算或给出处；同一句不得混用不同量纲的比例
（坡度比 ≠ 曲率比、倍数 ≠ 百分点）；图形若做了非等比拉伸，caption 必须注明。
"看起来像事实错误"的表述比模糊更糟 —— 这套页面的信誉押在每个数字都经得起复算上。

**形式选择映射**（选错形式 = 白画）：

| 要表达 | 用 |
|--------|-----|
| 结构 / 层级 | 结构图（标注清晰的自绘 SVG） |
| 关系 / 对比 | 对比卡片（comparison-cards） |
| 流程 / 数据流（静态即可懂） | 流程图（flow-diagram） |
| 随时间发生的过程 | **步骤模拟器**（simulator） |
| 状态变化 | 状态图或有意义的动画 |
| 连续场 / 波 / 流 | 静态 SVG 示意；（选配）vgpu 展示层 |

**大图少字**：每节一个视觉中心；文字只留标题、关键标签、必要解释与边界。
**禁止把长篇正文拆成多个文字卡片伪装成视觉化。**
第 4 层的核心机制（对象图 / 交换过程 / 混合过程）至少要有一个图形载体 ——
"判活看根""混颜料"这类核心概念不允许只活在旁白文字里；
视觉性强的类比（调颜料、滚雪球）优先配图而非纯文字。

**动画体面**：动画必须表现内容或状态的真实变化，不许只让成品闪烁/脉冲/高亮；
非首屏动画进视口自动播一次，保留暂停/逐步/重播；`prefers-reduced-motion`
直出静态结果；每个动画都有可读的静态版本。

**因果链**：输入或条件 → 发生什么 → 输出或影响。优先讲清少量相互连接的概念，
不罗列事实；不为"简短"删掉会改变含义的关键限定。

## 质量门（`aha check` 的 11 门）

单 h1 / 标题层级不跳档 / head 元数据齐全 / img alt / tokens 内联且与
canonical 一致 / tokens 块外无颜色字面量（含 SVG 属性与命名色） /
语义类在词表 / 脚本语法可解析（外链 script 违约）/ 无提问者指代 /
失败标签 1-2 字同页一致 / 中文页模拟器标签中文化（专有标识符白名单，
白名单在 check.mjs 的 `SIM_LABEL_WHITELIST` 导出，新增标识符时在此追加）。

**覆盖范围说明**：门 9（提问者指代）与门 11（标签语言）的机器检目前为
中文向子集（英文页的 "as you asked" 类指代、英文页的中文标签由生成时
契约约束，不进门）；门 5 对旧版本号快照放行 canonical 比对（快照模型的
已知取舍，由回执铁律兜底）。

## English quick reference

**Purpose**: turn any complex concept into a standalone, self-contained HTML
explainer that builds a *correct mental model*. Output goes to `~/.aha/<slug>.html`.

**Workflow**: ① read `assets/reference.html` (defines the form; tokens CSS is
inlined verbatim — never modified) → ② calibrate entry level L1/L2/L3 from the
user's phrasing (badge states the evidence; never delete layers) → ③ write the
page (colors only via `var(--token)`; copy toolbar/simulator engine verbatim from
reference; head bootstrap script prevents FOUC) → ④ `aha check` must pass 11/11
→ ⑤ deliver file link with an honest receipt (visual verification only `passed`
if actually screenshotted).

**Seven layers**: one-liner → why it exists → intuition (analogy **with explicit
failure boundary**) → real mechanism (with a visual carrier; simulator for
processes) → commonly-confused neighbors (compare by *what each changes*) →
boundaries & failure modes (1-2 char mnemonic tags) → "Remember" formula.

**Optional modes (never default)**: fable — the delivery receipt offers
"补充寓言故事 / ask for a fable"; only on explicit request, append a
≤1000-char fable end-chapter per `assets/fable.md` (mechanism-faithful,
anti-cliché blacklists, two closing questions). vgpu shader layer likewise
explicit-opt-in only.

**Never**: inline color literals, questioner references ("as you asked"),
decorative-only animation, claiming unverified things. Full contract in Chinese
above; this section is the executable summary for English-reading agents.

## 寓言故事模式（选配，默认不用）

仅当用户在页面交付后**主动表达**要寓言（「补充寓言故事」「加个寓言帮我记」
「要个记故事的」/ fable）时触发；默认生成**不含**寓言章节（保住输出速度）。

执行：
1. 读 `assets/fable.md`（寓言写作契约），并复读已生成页面的正文 ——
   寓言必须与页面讲的真实机制**同构**，转折映射因果，不为故事扭曲机制
2. 按契约写 ≤1000 字寓言，用 fable.md 第五节的 HTML 骨架插入页面
   「记」之后作为末章（全部复用 tokens 类，不写新 CSS）
3. 两问之后写答案藏进「查看答案」按钮（fable.md 骨架的 [FABLE-TOGGLE]）——
   答案区是全寓言唯一点破处（概念名 + 道具→机制映射）
4. 重跑 `aha check`（11/11），回执沿用 Step 5 格式并附寓言标题（不剧透）

## vgpu 着色器展示层（选配，默认不用）

仅当**两个条件同时满足**：① 概念本质是连续场/波/流/梯度/海量粒子
（波干涉、损失面、注意力场）；② 用户明确要求更炫/实时演示。
核心解释**永不依赖**此层 —— 四种降级路径（无 WebGPU / reduced-motion /
CDN 不可达 / 加载失败）都落回静态示意，静默无报错。用
`snippets/vgpu-field.html`，改 WGSL 前先 `npx vgpu check` 校验。

## 反模式（违反即重做）

- ❌ 类比没有失效边界；类比替代了真实机制
- ❌ 特性罗列式对比（必须按"改变什么"对比）
- ❌ 文字卡片阵列伪装视觉化
- ❌ 只会闪烁/高亮的装饰动画；声称存在但没实现的交互
- ❌ 内联颜色、修改 tokens、引入远程渲染依赖
- ❌ 居高临下的语气词（"很简单""显然""只要"）
- ❌ 为了过 check 删内容 / 藏溢出 / 缩字号 —— 这算作弊，不算修复
- ❌ 把没有视觉验证说成"已验证"
