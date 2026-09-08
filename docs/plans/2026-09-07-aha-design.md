# AHA Skill 设计文档（初名 eli5）

> 2026-09-08 定名 **aha**（"真的懂了"的那个瞬间 —— 比 ELI5 式的"当小孩哄"更贴合
> 本 skill "读者是聪明的、只是不熟悉领域"的立场）。正文为历史设计记录；
> 外部项目名（cloudflare-docs/eli5、eli5-plus）保留原名，`eli5` 一词
> 仅存于本注记与外部引用中 —— skill 名、命令、包名、协议标记
> （aha-design-tokens）、localStorage 键（aha-theme/aha-preset）均已更名。
## 概述

aha 是一个"可视化概念解释"Agent Skill：把任意复杂概念讲成一份**渐进分层、大图少字、可交互**的独立 HTML 页面，配套 `@dimples/aha`（命令名 `aha`）提供质量检查（check）、本地服务（serve）与公网分享（share）。

一句话定位：**给"想真正理解某个概念"的人生成一页能从浅读到深、美学稳定、可一键分享的解释页。**

## 调研结论（2026-09-07）

对比了四种实现，各自的核心教训：

| 实现 | 本质 | 关键教训 |
|------|------|----------|
| 社区一行版 | 一句提示词 | 零摩擦但零保证，设计系统每次现编 |
| [cloudflare-docs/eli5](https://github.com/cloudflare/cloudflare-docs/tree/production/.agents/skills/eli5) | Markdown 文档简化器（~3600 行） | 对抗性事实审查与反模式语料有价值；但内部指令漂移、交互仪式重、非 HTML |
| [qqyumidi/eli5-plus](https://github.com/qqyumidi/eli5-plus) | 纯提示词 HTML 解释页生成器（6KB） | 教学法最强（类比边界/形式映射/动画契约/诚实报告）；致命缺口：号称"做成体系"却零资产随包，一致性全靠散文 |
| [tt-a1i/archify](https://github.com/tt-a1i/archify) | JSON IR → 确定性渲染编译器 | 稳定质量的真相：美学决策活在随包代码与 token 里，模型结构上无法漂移；但靠收窄输出形态实现，不适合自由形态解释页 |
| [vercel-labs/vgpu](https://github.com/vercel-labs/vgpu) | 本地 WebGPU 库（非托管 API） | 着色器仅对连续场/海量粒子概念有增益；canvas 内无法放文字；只配做显式选配层 |

**由此确定的设计公理：质量来自随包资产与机器可检的门，不来自提示词。**

## 已确认的设计决策

| 决策点 | 结论 |
|--------|------|
| 交付位置 | `skills/aha/`，发布走仓库现有能力 |
| CLI 形态 | 独立 npm 包 `@dimples/aha`（命令名 `aha`；与 `@dev-log/cli` 同构。scope `aha` 已被他人注册，改用自有 scope `dimples`，registry 确认未占用） |
| 公网分享 | cloudflared quick tunnel（trycloudflare.com 临时链接，免账号；进程退出即失效） |
| 语言版本 | 单版本；SKILL.md 中文契约正文 + 英文 frontmatter；生成 HTML 语言跟随用户提问 |
| 渐进式机制 | 页内七层垂直分层 + 提问信号校准起点；**校准只调起点与类比选择，永不删层** |
| 架构路线 | 方案 A：资产约束 + 质量门（LLM 仍写 HTML，但形、token、片段、验证全部随包） |
| vgpu | 显式 showcase 层，永不默认；核心解释永不依赖它 |

## 总体架构

### 工作流

```
用户: /aha Transformer 注意力机制
Agent:
  1. 读 SKILL.md → 按需读 assets/（reference.html 看形 + 所需片段，有读预算）
  2. 分析提问信号 → 校准起点深度
  3. 写 ~/.aha/transformer-attention.html（token + 语义类名 + 片段，永不内联颜色）
  4. npx @dimples/aha check <file>  → 质量门 → 固定回执
  5. npx @dimples/aha serve         → localhost:7332 + 索引页
  6. npx @dimples/aha share         → https://xxx.trycloudflare.com
```

### 文件结构

```
skills/aha/
├── SKILL.md              # 行为契约（~300 行内）
├── assets/
│   ├── design-tokens.css # 明暗双主题 CSS 变量 × 语义角色
│   ├── reference.html    # 完整范例页（主题：RAG）——定"形"
│   ├── simulator.html    # 步骤模拟器脚手架（只填步骤数据，不写播放器逻辑）
│   └── snippets/         # comparison-cards / flow-diagram / boundary-callout /
│                         # takeaway-block / vgpu-field
└── cli/                  # @dimples/aha npm 包
    ├── package.json
    └── src/
        ├── check.ts      # 质量门 + 回执
        ├── serve.ts      # 静态服务 + 索引页
        └── share.ts      # cloudflared quick tunnel
```

## SKILL.md 行为契约

### 触发（description 正反都写）

- 正向：用户想"真正理解"某复杂概念、要求图解/可视化讲解、说 aha
- 负向：不是超短摘要、不是专家深潜、不是文档改写

### 立场

- 目标是正确的心智模型，不是模仿幼儿腔
- 用户明确要求（语言/受众/位置/范围/动效）> skill 默认
- 简化不得牺牲准确性；不确定的事实不编造精确数字

### 七层垂直分层（固定骨架，内容为可取舍菜单）

| # | 层 | 要点 |
|---|-----|------|
| 1 | 一句话核心 | 首屏 + 主视觉 + 校准徽章（透明标注"起点已按你的背景调至 Lx"） |
| 2 | 为什么存在 | 动机 before/after 对比 |
| 3 | 直觉 | 类比 + **失效边界标注** |
| 4 | 真实机制 | 大白话先行 → 术语后置且全文一致；流程类配步骤模拟器 |
| 5 | 容易混淆 | 按"各自改变什么"对比（每卡明确"输出："行），不罗列特性 |
| 6 | 边界/失败模式 | 一字记忆标签（如 坏原料/找错页/答偏了）；主动纠正会致错误心智模型的误区 |
| 7 | 记 | 一句话公式式收尾，关键词高亮 |

### 起点校准规则（渐进式落地）

级别定义：L1 零基础 / L2 有相邻领域背景 / L3 已正确使用本领域术语。

| 提问信号 | 校准动作 |
|----------|----------|
| 已正确使用领域术语（如"梯度下降"用得准） | 起点调至 L3，跳过基础类比 |
| 相邻领域背景线索（"我写 Rust 的，讲讲 GC"） | 起点调至 L2，用相邻领域做桥接类比 |
| 纯白话提问 | 起点 L1，标准零基础起点 |
| 用户显式指定受众 | 覆盖一切信号 |

### 继承的关键契约

- **类比边界**：每个类比标注失效点；类比不替代真实机制
- **形式选择映射**：结构→结构图 / 对比→卡片 / 流程→流程图 / 时序交互→分步模拟器 / 状态变化→动画 / 连续场→（可选 vgpu 层）
- **大图少字反模式**：每节一个视觉中心；不许把长文拆成文字卡片伪装视觉化
- **动画体面契约**：进视口自动播一次 + 暂停/逐步/重播 + `prefers-reduced-motion` 直出静态结果 + 反"只会闪烁/脉冲/高亮"
- **因果链**：输入或条件 → 发生什么 → 输出或影响

### 交付纪律

- 独立 `.html` 文件落盘（`~/.aha/`），返回可点击链接；禁止把聊天粘贴 HTML 当交付物
- 全内联（CSS/SVG/JS），渲染与核心解释零远程依赖；外链仅作引用
- 颜色只准来自 design-tokens；禁止内联 hex/rgb
- 语义 HTML（title/lang/viewport），响应式

### 诚实回执（固定格式）

```
check: 8/8 门通过, 0 警告
视觉验证: passed | skipped(无浏览器) | failed
校准: 起点 L2（依据：检测到"梯度下降"使用正确）
修复轮次: 0-2（两轮无改善即停止并如实上报）
```

## 设计系统资产

### design-tokens.css

- 暗色默认 + `data-theme` 明暗切换；切换只翻属性，明暗值全部成对派生（archify 纪律）
- 语义角色：强调 / 警示 / 概念类别色 / 面板 / 字阶（4 级文本层级）
- 命名：CSS 变量 + 语义类名（`c-emphasis` / `t-primary` / `panel`…）

### reference.html（范例主题：RAG）

- 完整真实范例，包含全部七层 + 步骤模拟器 + 对比卡实例
- eli5-plus 已验证 RAG 七层俱全且配得上模拟器
- SKILL.md 明确规则："看形不看事实"——学结构与类名用法，不抄内容

### simulator.html（最高风险组件的脚手架）

- 步进状态机 + 步骤数据结构（数组：每步含 narration / 状态标记）+ 控制条（暂停/下一步/重置）
- 进视口自动播一次；`prefers-reduced-motion` 直出最终静态结果
- LLM 只填步骤数据，不写播放器逻辑

### snippets/

每个片段头部注释写明适用场景（对应形式映射表）：comparison-cards / flow-diagram / boundary-callout / takeaway-block / vgpu-field

## CLI：@dimples/aha（命令名 `aha`）

零运行时依赖，Node ≥18，**零构建 ESM JavaScript + JSDoc**（实现期决定：
TypeScript 构建链被放弃 —— 测试直跑源码、发布零构建，与零依赖承诺一致），
发 npm 至自有 scope `dimples`（已确认未占用）。

| 命令 | 行为 |
|------|------|
| `check <file>` | **静态门 8 道**：单 h1、标题层级单调、title/lang/viewport 存在、img alt、内联 design-tokens（带版本且含真实 token 结构）、tokens 块外无颜色字面量（含 SVG 表现属性、单/无引号属性、4/8 位 hex）、语义类在词表、脚本可解析（外链 script 直接违反单文件契约）。输出人类可读回执（实现期决定：JSON 机器回执降级为人类可读回执 + 退出码，agent 按行解析足够）；浏览器验证由生成方按 SKILL.md 契约完成并如实标注 passed/skipped |
| `serve [dir]` | 静态服务，默认目录 **`~/.aha`**（自动创建，所有生成页的统一主页），默认端口 **7332**（避开 dev-log 的 7331）；索引页：已生成页面倒序、含生成时间；被服务的 HTML 自动注入会话分享 token |
| `share [dir]` | 检测/自动安装 `cloudflared`（brew / 版本锁定的官方二进制；Windows 指引）→ serve + quick tunnel → 打印 trycloudflare.com 链接；隧道死亡必报错不静默；Ctrl-C 全链回收（隧道 + 安装子进程） |

## vgpu showcase 层

- **永不默认**。触发条件（两者同时）：概念本质是连续场/海量粒子/波/流体/场梯度；用户要求更炫或显式要求 showcase
- `snippets/vgpu-field.html`：完整自包含模板——`navigator.gpu` 检测 → 有则懒加载 `https://esm.sh/vgpu` + 内联 WGSL（预置波场/梯度场/粒子流 2-3 个通用着色器，参数化）→ 无则显示 CSS/SVG 静态版本，静默降级零报错
- 页面核心解释永不依赖该层（WebGPU 非 Baseline，Firefox Linux/Android 仍缺）

## 质量与验证

1. **check 门自带单测**：好/坏样本 HTML 各一批，坏样本每种违规一个（溢出、内联颜色、多 h1…）
2. **reference.html 必须通过自己的 check**：仓库脚本/CI 校验（检行为而非打包元数据）
3. **真实使用迭代**：README 记录已知漂移案例；若 check 数据显示布局漂移严重，演进到方案 B（内容 JSON + 组装器）——资产结构天然兼容该演进

## 仓库集成

- `skills/aha/`：中文契约正文 + 英文 frontmatter（对齐 eli5-plus 做法，兼顾触发与可读性）
- CLI 仓库内开发于 `skills/aha/cli/`（零构建，src 直发 npm）
- 根 README.md 增加 aha 小节：定位、工作流、`npx skills add ... --skill aha` 与 `npx @dimples/aha` 安装命令

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| LLM 布局漂移（方案 A 固有） | check 门兜底 + 片段约束；漂移数据决定是否升级方案 B |
| cloudflared 未安装 | share 检测并打印安装指引，不静默失败 |
| vgpu 0.x API 变动 | 片段模板隔离；展示层独立，坏了不影响核心页 |
| 参考页被"抄内容"而非"学形" | SKILL.md 显式规则 + check 不检内容无法防，靠契约约束 |

## 未来演进（不在 v1）

- 方案 B：内容 JSON + CLI 组装器（若漂移数据证明必要）
- Cloudflare Pages 永久部署（`--deploy`）
- 概念关联网络：多个 aha 页面间的交叉引用与知识图谱索引
