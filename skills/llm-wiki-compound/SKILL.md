---
name: llm-wiki:compound
description: 将解决问题的经验文档化。当用户说"搞定了"、"修好了"、"问题解决了"时自动触发，将经验写入 Wiki 的 solutions 目录。
version: 1.0.0
tags:
  - knowledge-base
  - wiki
  - compound-engineering
depends_on:
  - llm-wiki
---

# llm-wiki:compound

将解决问题的经验文档化，写入 Wiki 的 `solutions/` 目录。知识复利：第一次花时间研究，文档化后下次几分钟解决。

灵感来源：[Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) 的 `ce:compound` 技能。其核心理念是 **"每次工程工作都应该让后续工作更容易，而非更难"**——解决问题后立即文档化，形成可搜索、可复用的知识库，让团队的每次调试都在前人的经验上积累。我们将这个理念从软件工程领域泛化，使其适用于任何解决问题的场景。

## When to Use

- 用户说"搞定了"、"修好了"、"问题解决了"、"这样就行了"
- 刚完成一个有价值的调试、探索或分析过程
- 发现了一个值得记录的模式、技巧或最佳实践
- 用户主动说"记录一下这个过程"

## 核心理念

**每个解决问题的过程都应该让下一个类似问题更容易。** 第一次遇到 N+1 查询问题 → 研究 30 分钟 → 文档化 → 下次 2 分钟。

`llm-wiki-add` 是**主动学习**（你选择学什么），`llm-wiki-compound` 是**被动积累**（工作中自然产生的知识）。两者写入同一个 Wiki，知识交叉引用。

## 双轨道

根据问题类型选择不同的文档结构：

### Bug Track（问题解决）

适用于：修了一个 bug、解决了一个错误、找到了一个问题的根因。

```markdown
---
type: solution
track: bug
date: YYYY-MM-DD
tags: [tag1, tag2]
sources: []
---

# 问题标题

## 问题
1-2 句话描述问题。

## 症状
- 可观察到的异常行为
- 错误信息
- 表现形式

## 调查过程
尝试了什么，为什么不行：
1. ❌ 尝试 A → 失败原因
2. ❌ 尝试 B → 失败原因
3. ✅ 最终方案

## 根因
技术层面的原因解释。

## 解决方案
具体的修复步骤和代码示例：

\`\`\`
// 修改前
...

// 修改后
...
\`\`\`

## 为什么有效
解释解决方案如何解决根因。

## 防范
如何避免再次出现：
- 最佳实践
- 可以加的检查或测试

## 关联
- 相关概念：[[concept-a]]
- 相关实体：[[entity-b]]
```

### Knowledge Track（经验洞察）

适用于：发现了一个模式、总结了一个最佳实践、记录了一个工作流技巧。

```markdown
---
type: solution
track: knowledge
date: YYYY-MM-DD
tags: [tag1, tag2]
sources: []
---

# 洞察标题

## 背景
什么情况下产生的这个经验。

## 指导
具体的实践、模式或建议：

\`\`\`
// 示例
...
\`\`\`

## 为什么重要
遵循或不遵循这个实践的影响。

## 何时适用
这个经验在什么条件下适用。

## 关联
- 相关概念：[[concept-a]]
- 相关实体：[[entity-b]]
```

## 工作流

### Step 1: 确认是否值得记录

不是所有问题都需要 compound。值得记录的：
- 花了超过 5 分钟研究的问题
- 非显而易见的解决方案
- 涉及多个系统/概念的交互
- 搜索了多次才找到答案
- 发现了一个有用的模式或技巧

不需要记录的：
- 拼写错误、明显的小修改
- 一次性、不会重现的问题
- 用户明确表示不需要记录

如果判断不值得记录，简要告知用户原因即可。

### Step 2: 从上下文中提取信息

回顾本次对话，提取：
- **问题描述** - 遇到了什么问题
- **调查过程** - 尝试了什么，哪些失败了
- **根因** - 问题的根本原因
- **解决方案** - 最终怎么解决的
- **关键代码** - 修改前后的代码对比
- **关联概念** - 涉及 Wiki 中已有的实体/概念

### Step 3: 选择轨道

- 如果是**解决了某个具体问题** → Bug Track
- 如果是**总结了一个经验/模式** → Knowledge Track

### Step 4: 检查重叠

读取 `wiki/index.md`，检查 `solutions/` 目录下是否已有类似文档：
- 搜索相关关键词
- 比对问题、根因、解决方案的重叠度

| 重叠度 | 处理方式 |
|--------|----------|
| 高（同一个问题） | 更新已有文档，补充新内容 |
| 中（同一领域不同角度） | 创建新文档，互相链接 |
| 低或无 | 直接创建新文档 |

### Step 5: 写入文档

根据轨道选择对应模板，写入 `wiki/solutions/`：

- Bug Track → `wiki/solutions/YYYY-MM-DD-简短问题名.md`
- Knowledge Track → `wiki/solutions/YYYY-MM-DD-简短主题名.md`

如果文档中涉及的实体/概念在 Wiki 中已有页面（`wiki/entities/`、`wiki/concepts/`），使用 `[[wikilink]]` 链接过去。

### Step 6: 更新 Wiki

- **更新 index.md** - 在 经验 分类下添加新条目
- **更新 overview.md** - 更新页面计数和最近更新日期
- **追加 log.md**：

```markdown
## [YYYY-MM-DD] compound | 问题/洞察标题

- **轨道**：bug / knowledge
- **文件**：wiki/solutions/YYYY-MM-DD-name.md
- **关联**：[[concept-a]], [[entity-b]]
```

### Step 7: 输出总结

```
经验已文档化。

写入：wiki/solutions/2026-04-06-n-plus-one-query.md
轨道：bug track

摘要：
  问题：N+1 查询导致列表页加载缓慢
  根因：关联数据未预加载
  解决：添加 .includes(:association)

关联 Wiki 页面：
  - [[database-query]] - 更新了关联说明
  - [[orm-patterns]] - 添加了防范建议
```

## 与其他操作的协作

compound 产生的文档和 add 产生的知识共享同一个 Wiki：

- compound 文档中的概念可以 `[[wikilink]]` 链接到 add 创建的概念页
- query 可以搜索 solutions 目录，综合已有知识和经验
- lint 会检查 solutions 目录的一致性（孤儿文档、过时方案）

## Examples

```markdown
User: 搞定了，是数据库连接池配置的问题

Agent: 这是一个值得记录的经验。让我整理一下。

[回顾对话上下文]
[检查 wiki/solutions/ 是否有重叠]
[创建 wiki/solutions/2026-04-06-db-connection-pool-exhausted.md]

经验已文档化。Bug Track。

写入：wiki/solutions/2026-04-06-db-connection-pool-exhausted.md

摘要：
  问题：高并发下数据库连接池耗尽，请求超时
  根因：默认连接池大小 5 不够，且未配置连接超时回收
  解决：调整 pool size 为 20，添加 idle timeout 配置

关联到 Wiki 中已有的 [[database-connections]] 概念页。
```

```markdown
User: 我发现一个规律，用 debounce 处理搜索输入比 throttle 效果好

Agent: 好洞察，让我记录下来。

[创建 wiki/solutions/2026-04-06-debounce-vs-throttle-search.md]
[检查是否已有相关概念页]

经验已文档化。Knowledge Track。

写入：wiki/solutions/2026-04-06-debounce-vs-throttle-search.md

核心建议：搜索输入场景用 debounce（等用户停止输入后才触发），
优于 throttle（固定间隔触发），因为搜索需要完整的关键词。

Wiki 中还没有 debounce 和 throttle 的概念页，要创建吗？
```
