# llm-wiki:add

处理新的原始资料，将知识整合进 Wiki。一条新资料可能影响 10-15 个 Wiki 页面。

## When to Use

- 用户说"帮我处理这篇文章"、"我放了新资料在 raw/"、"看看这个链接"
- 用户提供了新的文章、论文、书籍章节、笔记等需要归档整理

## 工作流

### Step 1: 确定待处理资料

有三种方式提供资料，按优先级：

1. **用户指定了具体资料**（链接、文本、文件路径）→ 只处理该资料
2. **用户说"处理 raw/ 里的新资料"等笼统指令** → 自动扫描 `raw/` 找出未处理的文件
3. **用户说"处理 raw/ 里的所有新资料"** → 批量处理所有未处理文件

**如何判断哪些文件已处理：**

对比 `raw/` 中的文件列表和 `wiki/sources/` 中已有的来源摘要页。每个来源摘要页的 frontmatter 中有 `source` 字段指向原始文件路径。`raw/` 中存在但 `wiki/sources/` 中没有对应摘要页的文件，即为未处理。

```bash
# 列出 raw/ 中的所有文件
find raw/ -type f | sort

# 检查 wiki/sources/ 中已处理的来源
grep -r "^source:" wiki/sources/ | sed 's/.*source: //'
```

**未处理文件清单示例：**

```
发现 3 个未处理的资料：
  1. raw/articles/attention-paper.pdf
  2. raw/notes/meeting-2026-04-05.md
  3. raw/papers/bert-paper.pdf

要全部处理，还是选择其中几个？（默认全部）
```

### Step 2: 保存原始资料（仅 URL/文本需要）

- **URL** - 抓取网页内容，保存为 Markdown 到 `raw/articles/`（建议用户配合 Obsidian Web Clipper）
- **文本** - 用户直接粘贴的内容，保存到 `raw/notes/`
- **图片** - 保存到 `raw/assets/`，LLM 需要单独查看图片（Markdown 内联图片 LLM 无法直接读取）
- **已有文件** - 不需要保存，直接读取

### Step 3: 阅读并提取

读取原始资料，识别：
- **核心论点** - 文章的主要主张和结论
- **关键实体** - 涉及的人物、组织、技术、产品
- **重要概念** - 引入或讨论的理论、方法、术语
- **数据/事实** - 具体的数字、日期、指标
- **与其他来源的关系** - 印证、矛盾、补充

### Step 4: 与用户讨论（推荐）

向用户简要汇报关键发现，确认关注重点：

```
这篇资料的核心要点：
1. ...
2. ...
3. ...

涉及的关键实体/概念：A、B、C
与其他来源的关系：与 [[source-x]] 在 Y 方面有矛盾

你想重点关注哪些方面？
```

这一步是可选的。如果用户明确要求批量处理，可以跳过讨论直接处理。

### Step 5: 创建来源摘要页

在 `wiki/sources/` 创建摘要页，使用 SKILL.md 中定义的来源摘要模板。

文件名格式：`YYYY-MM-DD-简短名称.md`

### Step 6: 更新实体页和概念页

对资料中涉及的每个重要实体和概念：

1. **已有页面** - 读取现有内容，追加新信息，标注来源，更新 `updated` 日期
2. **新页面** - 使用实体/概念页模板创建，标注来源

注意：
- 当新信息与已有内容矛盾时，保留两个版本，明确标注矛盾
- 使用 `[[wikilink]]` 链接相关页面
- 每个事实声明都要标注来源

### Step 7: 更新主题页

如果资料涉及需要综合分析的主题：
- 更新已有的主题页
- 或创建新的主题页

### Step 8: 更新 overview.md

更新知识库概览：
- 来源数量
- 总页面数
- 最近更新日期
- 核心发现（如果有新的重要发现）

### Step 9: 更新 index.md

在 index.md 对应的分类下添加新页面条目：
- 来源区：添加新来源摘要
- 实体区：添加新实体（如有）
- 概念区：添加新概念（如有）
- 主题区：添加新主题（如有）

### Step 10: 追加 log.md

```markdown
## [YYYY-MM-DD] add | 资料标题

- **来源**：raw/path/to/file
- **新增页面**：page-a, page-b, page-c
- **更新页面**：page-d, page-e
- **影响范围**：N 个页面
```

### Step 11: 输出总结

```
处理完成。「资料标题」涉及了以下 Wiki 更新：

新增：
  - 来源摘要：[[source-name]]
  - 实体：[[entity-a]], [[entity-b]]
  - 概念：[[concept-c]]

更新：
  - [[concept-d]] - 补充了关于 X 的说明
  - [[entity-e]] - 添加了与 [[entity-a]] 的关系

⚠️ 发现矛盾：
  - [[concept-d]] 中关于 Y 的描述与 [[source-old]] 不一致
```

## Examples

```markdown
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

```markdown
User: 帮我批量处理 raw/ 里的 3 篇文章，不用一一讨论

Agent: 好的，我来批量处理。

[依次处理 3 篇文章，每篇执行 Step 2-9]

批量处理完成：
1. [[source-a]] → 新增 4 页，更新 3 页
2. [[source-b]] → 新增 5 页，更新 2 页，⚠️ 与 [[source-a]] 在 X 方面有矛盾
3. [[source-c]] → 新增 3 页，更新 4 页
```
