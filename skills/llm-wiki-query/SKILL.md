---
name: llm-wiki:query
description: 查询 Wiki 知识库。当用户问"X 是什么？"、"帮我总结一下 Y"、"A 和 B 有什么区别？"时使用。基于 Wiki 内容综合回答，好的回答归档回 Wiki。
version: 1.0.0
tags:
  - knowledge-base
  - wiki
depends_on:
  - llm-wiki
---

# llm-wiki:query

基于 Wiki 内容回答问题。先读 index 定位，再深入页面综合回答。好的回答归档回 Wiki。

## When to Use

- 用户问"X 是什么？"、"帮我总结一下关于 Y 的内容"、"A 和 B 有什么区别？"
- 用户想了解知识库中的已有知识
- 用户想进行交叉比较或综合分析

## 核心原则

**好的回答应该归档回 Wiki。** 比较分析、发现的联系、深入解读——这些不应消失在聊天历史中，应保存为新的主题页。

## 工作流

### Step 1: 读取目录

读取 `wiki/index.md`，了解 Wiki 的完整内容和结构。

### Step 2: 定位相关页面

根据问题，从 index 中找出最相关的 2-5 个页面。优先读取：
- 直接匹配的概念/实体页
- 相关的来源摘要
- 已有的主题页（可能已有部分回答）
- solutions 目录中的经验文档

### Step 3: 综合回答

读取相关页面，综合回答：
- 使用 `[[wikilink]]` 引用来源页面
- 标注每个关键声明的来源
- 如果信息不足，明确指出缺口

### Step 4: 归档有价值的回答

如果回答满足以下任一条件，保存为新的主题页（`wiki/topics/`）：
- 涉及 2 个以上来源的综合分析
- 包含对比/比较表格
- 提供了新的见解或联系
- 用户可能再次需要这个回答

保存后更新 `wiki/index.md` 和 `wiki/log.md`。

### Step 5: 建议后续探索

根据回答过程中发现的信息缺口，建议用户：
- 可以补充哪些资料
- 可以进一步探索的方向
- Wiki 中哪些概念页尚未创建

## 回答格式

### 事实型回答

```markdown
## X 是什么？

**定义**（来源：[[source-a]]）
简要描述。

**关键信息**
- 信息点 1（来源：[[source-b]]）
- 信息点 2（来源：[[source-c]]）

**关联概念**
- [[concept-x]] - 相关说明
```

### 比较型回答

```markdown
## A vs B

| 维度 | A | B |
|------|---|---|
| 来源 | [[source-a]] | [[source-b]] |
| 维度 1 | ... | ... |
| 维度 2 | ... | ... |

**关键区别**
- ...

**各自的适用场景**
- A 适合：...
- B 适合：...
```

### 综合分析型回答

```markdown
## 关于 X 的综合分析

### 已知信息
（综合多个来源的发现）

### 矛盾之处
- [[source-a]] 认为 X，但 [[source-b]] 认为 Y

### 信息缺口
- 目前 Wiki 中缺少关于 Z 的资料

### 建议补充
- 推荐阅读关于 Z 的资料以完善分析
```

## Examples

```markdown
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
