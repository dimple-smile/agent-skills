---
name: llm-wiki
description: 构建和维护个人知识库 Wiki。当用户需要收集整理知识、管理研究笔记、构建持久化的知识体系、或将解决问题的经验文档化时使用。
version: 1.0.0
tags:
  - knowledge-base
  - wiki
  - research
  - note-taking
---

# LLM Wiki

将 LLM 变成你的 Wiki 维护者。LLM 增量构建并维护一个持久的、相互关联的 Markdown 知识库。知识被编译一次并持续更新，而非每次重新推导。

灵感来源：
- [Karpathy - LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 增量知识库架构
- [Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) — 知识复利理念：每次解决问题的经验都应该让下次更容易

## When to Use

**AI 应该主动判断并使用此技能的情况：**

1. **用户想建立知识库** - "帮我整理这些资料"、"我想建一个 wiki"
2. **用户提供了新的学习资料** - 丢了一篇文章、论文、书籍章节需要整理
3. **用户想查询已有知识** - "这个概念之前读过什么？"
4. **用户想维护知识库健康** - "检查一下 wiki 有没有矛盾"
5. **用户解决了问题** - "搞定了"、"修好了"、"这样就行了"
6. **用户在进行长期研究** - 跨周/月的主题研究，需要知识积累

**不需要使用的情况：**
- 一次性问答，不需要持久化知识

## 执行入口

### Step 1: 判断用户意图

根据用户的话判断要执行哪个操作：

| 用户意图 | 执行操作 |
|----------|----------|
| "建一个知识库"、"初始化 wiki" | init |
| "帮我处理这篇文章"、"我放了新资料"、"看看这个链接" | ingest |
| "搞定了"、"修好了"、"问题解决了" | compound |
| "X 是什么？"、"帮我总结一下 Y" | query |
| "检查一下 wiki"、"整理一下知识库" | lint |
| 意图不明确 | 询问用户选择 |

**意图不明确时询问：**

```
你想执行哪个操作？
  1. init     - 初始化知识库
  2. ingest   - 摄入新资料
  3. compound - 记录解决问题的经验
  4. query    - 查询已有知识
  5. lint     - 健康检查
```

### Step 2: 检查是否已初始化

在任何操作之前（init 本身除外），检查 `~/llm-wiki/` 目录是否存在：

- **存在** → 继续执行目标操作
- **不存在** → 先自动执行 init，不询问用户，然后再执行目标操作

```bash
# 检测方法
ls ~/llm-wiki/wiki/index.md 2>/dev/null
```

---

## 操作：init（初始化）

### 什么时候执行

- 用户明确要求初始化
- 其他操作前检测到 `~/llm-wiki/` 不存在时自动执行

### 工作流

#### 1. 创建目录结构

```bash
mkdir -p ~/llm-wiki/raw/{articles,papers,books,notes,assets}
mkdir -p ~/llm-wiki/wiki/{entities,concepts,topics,sources,solutions}
```

如果用户之前的对话中提到了知识库主题，据此调整 `raw/` 子目录。

#### 2. 创建 index.md

```markdown
# Wiki Index

## 概览
- [[overview]] - 整体综述

## 来源
<!-- 摄入的原始资料摘要，按时间倒序 -->

## 实体
<!-- 人物、组织、产品等，按名称排序 -->

## 概念
<!-- 理论、方法、术语等，按名称排序 -->

## 主题
<!-- 综合分析、比较等，按名称排序 -->

## 经验
<!-- 解决问题的经验和洞察（compound 产生） -->
```

#### 3. 创建 log.md

```markdown
# Wiki Log

<!-- 操作记录按时间追加在此，格式：## [YYYY-MM-DD] 操作类型 | 描述 -->
```

#### 4. 创建 overview.md

```markdown
---
type: overview
created: YYYY-MM-DD
---

# 知识库概览

> 本 Wiki 由 LLM 自动维护。你负责选题和提问，LLM 负责总结、交叉引用、归档和维护。

## 当前状态
- 来源数量：0
- 总页面数：0（含 index、log、overview）
- 最近更新：-

## 核心发现
<!-- 随着知识积累，这里将总结最重要的发现 -->
```

#### 5. 输出确认

```
Wiki 知识库已初始化！ ~/llm-wiki/

接下来你可以：
  - 把资料放入 raw/ 目录，我来整理（ingest）
  - 给我链接或文本，我帮你保存并处理（ingest）
  - 解决了问题后告诉我，我帮你记录（compound）
  - 随时问我关于 Wiki 中已有知识的问题（query）
  - 让我检查 Wiki 的健康状况（lint）
```

如果是自动初始化（非用户主动要求），简化输出为一行：`已自动初始化知识库 ~/llm-wiki/`，然后继续执行目标操作。

---

## 操作：ingest（摄入资料）

处理新的原始资料，将知识整合进 Wiki。一条新资料可能影响 10-15 个 Wiki 页面。

### 工作流

#### 1. 确定待处理资料

按优先级：
1. **用户指定了具体资料**（链接、文本、文件路径）→ 只处理该资料
2. **用户说"处理新资料"** → 扫描 `raw/` 找未处理文件
3. **用户说"处理所有新资料"** → 批量处理

**判断已处理/未处理：** 对比 `raw/` 文件和 `wiki/sources/` 中来源摘要页的 `source` frontmatter 字段。有对应摘要页 = 已处理。

```
发现 3 个未处理的资料：
  1. raw/articles/attention-paper.pdf
  2. raw/notes/meeting-2026-04-05.md
  3. raw/papers/bert-paper.pdf

要全部处理，还是选择其中几个？（默认全部）
```

#### 2. 保存原始资料（仅 URL/文本需要）

- **URL** → 抓取保存到 `raw/articles/`
- **文本** → 保存到 `raw/notes/`
- **已有文件** → 直接读取

#### 3. 阅读并提取

读取原始资料，识别核心论点、关键实体、重要概念、数据/事实、与其他来源的关系。

#### 4. 与用户讨论（推荐，批量处理时跳过）

```
这篇资料的核心要点：
1. ...
2. ...

涉及的关键实体/概念：A、B、C
你想重点关注哪些方面？
```

#### 5. 创建来源摘要页

在 `wiki/sources/` 创建，文件名：`YYYY-MM-DD-简短名称.md`

```markdown
---
type: source
date: YYYY-MM-DD
source: raw/path/to/file
tags: [tag1, tag2]
---

# 来源：标题

## 核心要点
- 要点 1

## 关键引用
> 原文引用

## 与其他来源的关系
- 与 [[other-source]] 在 X 方面相互印证
- 与 [[contradicting-source]] 在 Y 方面存在矛盾

## 衍生概念
- [[concept-a]]
```

#### 6. 更新实体页和概念页

对资料涉及的每个实体和概念：
- **已有页面** → 追加新信息，标注来源
- **新页面** → 使用模板创建

实体/概念页模板：

```markdown
---
type: entity  # 或 concept
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: [source-a, source-b]
---

# 名称

## 定义
简要描述。

## 关键信息
- 信息点 1（来源：[[source-a]]）

## 关联
- 相关概念：[[concept-x]]

## 开放问题
- 尚未解答的问题
```

注意：
- 新信息与已有内容矛盾时，保留两个版本，明确标注
- 每个事实声明都标注来源

#### 7. 更新主题页（如有需要）

#### 8. 更新 index.md、overview.md

#### 9. 追加 log.md

```markdown
## [YYYY-MM-DD] ingest | 资料标题

- **来源**：raw/path/to/file
- **新增页面**：page-a, page-b
- **更新页面**：page-c, page-d
- **影响范围**：N 个页面
```

#### 10. 输出总结

```
处理完成。

新增：
  - 来源摘要：[[source-name]]
  - 实体：[[entity-a]], [[entity-b]]
  - 概念：[[concept-c]]

更新：
  - [[concept-d]] - 补充了关于 X 的说明

⚠️ 发现矛盾：
  - [[concept-d]] 中关于 Y 的描述与 [[source-old]] 不一致
```

---

## 操作：compound（经验积累）

将解决问题的经验文档化，写入 `wiki/solutions/`。知识复利：第一次花时间研究，文档化后下次几分钟解决。

### 什么时候执行

- 用户说"搞定了"、"修好了"、"问题解决了"
- 刚完成一个有价值的调试、探索或分析过程
- 发现了值得记录的模式、技巧或最佳实践

**不值得记录的：** 拼写错误、明显小修改、一次性不重现的问题。告知用户原因即可。

### 双轨道

**Bug Track**（问题解决）：适用于修了 bug、解决了错误。

```markdown
---
type: solution
track: bug
date: YYYY-MM-DD
tags: [tag1, tag2]
---

# 问题标题

## 问题
1-2 句话描述。

## 症状
- 可观察到的异常行为

## 调查过程
1. ❌ 尝试 A → 失败原因
2. ✅ 最终方案

## 根因
原因解释。

## 解决方案
\`\`\`
// 修改前
...
// 修改后
...
\`\`\`

## 防范
如何避免再次出现。

## 关联
- [[concept-a]]
```

**Knowledge Track**（经验洞察）：适用于总结了模式、最佳实践、工作流技巧。

```markdown
---
type: solution
track: knowledge
date: YYYY-MM-DD
tags: [tag1, tag2]
---

# 洞察标题

## 背景
什么情况下产生的这个经验。

## 指导
具体的实践、模式或建议。

## 为什么重要
遵循或不遵循这个实践的影响。

## 何时适用
这个经验在什么条件下适用。

## 关联
- [[concept-a]]
```

### 工作流

1. **从上下文提取信息** — 问题描述、调查过程、根因、解决方案、关键代码
2. **选择轨道** — 解决具体问题 → Bug Track；总结经验/模式 → Knowledge Track
3. **检查重叠** — 搜索 `wiki/solutions/` 是否已有类似文档。高重叠 → 更新已有文档；低或无 → 创建新文档
4. **写入文档** — `wiki/solutions/YYYY-MM-DD-简短名称.md`
5. **更新** index.md、overview.md、log.md
6. **输出总结**

---

## 操作：query（查询知识）

基于 Wiki 内容回答问题。好的回答归档回 Wiki。

### 核心原则

**好的回答应该归档回 Wiki。** 涉及多来源的综合分析、对比表格、新发现 → 保存为新的主题页。

### 工作流

1. **读取 index.md** 了解全貌
2. **定位相关页面** — 找最相关的 2-5 个页面（含 sources、solutions）
3. **综合回答** — 用 `[[wikilink]]` 引用，标注来源
4. **归档有价值的回答** — 保存为 `wiki/topics/` 新页面
5. **建议后续探索** — 信息缺口、可补充的资料

---

## 操作：lint（健康检查）

检测矛盾、孤儿页面、缺失概念等问题，保持 Wiki 长期健康。

### 什么时候执行

- 用户说"检查一下 wiki"、"整理一下知识库"
- Wiki 积累到 20+ 页面时定期执行
- 每次添加一批重要资料后

### 6 项检查

| 检查项 | 方法 |
|--------|------|
| 矛盾检测 | 对比不同页面中相同主题的描述 |
| 过时信息 | 页面 updated 日期远早于相关来源 |
| 孤儿页面 | 入站 `[[wikilink]]` 为 0 的页面 |
| 缺失页面 | 被 `[[wikilink]]` 引用但未创建 |
| 缺失交叉引用 | 共享 2+ 来源但未互链的页面 |
| 数据缺口 | 概念页的"开放问题"、概览中未深入的方向 |

### 工作流

1. 读取全貌（`ls -R wiki/` + `wiki/index.md`）
2. 逐项检查
3. 生成报告（统计 + 按优先级列出问题）
4. 询问用户是否自动修复（创建缺失页面、添加交叉引用等）
5. 执行修复，更新 log.md

---

## 两层架构

```
~/llm-wiki/
├── raw/                    # 原始资料（不可变）
│   ├── articles/
│   ├── papers/
│   ├── books/
│   ├── notes/
│   └── assets/
└── wiki/                   # LLM 维护的 Wiki
    ├── index.md            # 内容目录
    ├── log.md              # 操作日志
    ├── overview.md         # 整体概览
    ├── entities/           # 实体页
    ├── concepts/           # 概念页
    ├── topics/             # 主题页
    ├── sources/            # 来源摘要
    └── solutions/          # 经验文档
```

## 文件命名规范

| 类型 | 路径格式 |
|------|----------|
| 来源摘要 | `wiki/sources/YYYY-MM-DD-简短名称.md` |
| 实体页 | `wiki/entities/名称.md` |
| 概念页 | `wiki/concepts/概念名.md` |
| 主题页 | `wiki/topics/主题名.md` |
| 经验文档 | `wiki/solutions/YYYY-MM-DD-简短名称.md` |

所有文件名使用英文小写 + 连字符。

## 写作规范

- 每个页面开头使用 YAML frontmatter（`type`, `date`, `tags`, `sources`）
- 使用 `[[wikilink]]` 创建页面间链接
- 每个事实声明都标注来源
- 新旧信息矛盾时，保留两个版本并标注
- 保持页面简洁，聚焦一个主题

## Obsidian 集成

Wiki 目录可直接用 Obsidian 打开：Graph View、Web Clipper、Dataview、Marp 插件。

## Examples

### ingest — 摄入资料

```
User: 我把 Attention Is All You Need 的论文放进 raw/papers/ 了

Agent: 我来处理这篇论文。

[读取 raw/papers/attention-is-all-you-need.pdf]
[提取关键信息]

这篇论文的核心要点：
1. 提出了 Transformer 架构，完全基于注意力机制，抛弃了 RNN/CNN
2. 引入了 Multi-Head Self-Attention 和 Positional Encoding
3. 在机器翻译任务上达到 SOTA

涉及实体：Google Brain、Ashish Vaswani 等 8 位作者
涉及概念：Self-Attention、Multi-Head Attention、Positional Encoding、Layer Normalization

要重点关注哪些方面？

User: 重点看 Self-Attention 的设计思路

Agent: [创建 wiki/sources/2026-04-06-attention-paper.md]
[创建 wiki/concepts/self-attention.md - 重点展开设计思路]
[创建 wiki/entities/transformer.md]
[创建 wiki/entities/google-brain.md]
[创建 wiki/concepts/multi-head-attention.md]
[创建 wiki/concepts/positional-encoding.md]
[更新 wiki/overview.md]
[更新 wiki/index.md]
[追加 wiki/log.md]

处理完成。新增 6 个页面，Self-Attention 概念页重点展开了 Scaled Dot-Product 的设计动机。
```

### compound — 经验积累

**Bug Track：**

```
User: 搞定了，是数据库连接池配置的问题

Agent: 这是一个值得记录的经验。让我整理一下。

[回顾对话上下文]
[检查 wiki/solutions/ 是否有重叠]
[创建 wiki/solutions/2026-04-06-db-connection-pool-exhausted.md]

经验已文档化。Bug Track。

摘要：
  问题：高并发下数据库连接池耗尽，请求超时
  根因：默认连接池大小 5 不够，且未配置连接超时回收
  解决：调整 pool size 为 20，添加 idle timeout 配置

关联到 Wiki 中已有的 [[database-connections]] 概念页。
```

**Knowledge Track：**

```
User: 我发现一个规律，用 debounce 处理搜索输入比 throttle 效果好

Agent: 好洞察，让我记录下来。

[创建 wiki/solutions/2026-04-06-debounce-vs-throttle-search.md]
[检查是否已有相关概念页]

经验已文档化。Knowledge Track。

核心建议：搜索输入场景用 debounce（等用户停止输入后才触发），
优于 throttle（固定间隔触发），因为搜索需要完整的关键词。

Wiki 中还没有 debounce 和 throttle 的概念页，要创建吗？
```

### query — 查询知识

```
User: Self-Attention 和普通 Attention 有什么区别？

Agent: [读取 wiki/index.md]
[定位 wiki/concepts/self-attention.md, wiki/concepts/attention.md]
[综合回答]

## Self-Attention vs 普通 Attention

**普通 Attention**（来源：[[source-a]]）：
- Query 和 Key/Value 来自不同序列
- 典型场景：翻译任务中目标语言关注源语言

**Self-Attention**（来源：[[2026-04-06-attention-paper]]）：
- Query、Key、Value 都来自同一序列
- 每个位置可关注序列中所有其他位置

| 维度 | 普通 Attention | Self-Attention |
|------|---------------|----------------|
| Q/K/V 来源 | Q ≠ KV | Q = K = V |
| 捕获关系 | 跨序列 | 序列内部 |
| 计算复杂度 | O(n×m) | O(n²) |

这个比较已保存为 [[self-attention-vs-attention]]。
```

### lint — 健康检查

```
User: 检查一下 wiki

Agent: [读取 wiki/index.md]
[扫描 wiki/ 全部页面]
[逐项检查]

#### 🔗 孤儿页面（1）
1. [[layer-normalization]] - 0 个入站链接

#### 📝 缺失页面（2）
1. [[residual-connection]] - 被引用 4 次
2. [[softmax]] - 被引用 2 次

### 建议操作
1. [高] 创建 [[residual-connection]]（被引用 4 次）
2. [高] 创建 [[softmax]]（被引用 2 次）
3. [中] 在 [[positional-encoding]] 补充：不同架构使用不同方案
4. [低] 为 [[layer-normalization]] 添加入站链接

要我自动修复吗？

User: 1 和 2 你先创建，3 和 4 我看看再说

Agent: 好的，我来创建 residual-connection 和 softmax。

[创建 wiki/concepts/residual-connection.md]
[创建 wiki/concepts/softmax.md]
[更新 wiki/index.md]
[追加 wiki/log.md]

已创建：
- [[residual-connection]] - 基于 [[attention-paper]] 的描述
- [[softmax]] - 作为 Self-Attention 中的关键计算步骤

矛盾和孤儿页面先保留，你随时可以让我处理。
```

## 适用场景

**主动学习（ingest）：**
- 学术研究、阅读笔记、竞品分析、课程笔记

**经验积累（compound）：**
- 工程实践（bug 修复、最佳实践）、团队知识库、工作流优化、个人成长
