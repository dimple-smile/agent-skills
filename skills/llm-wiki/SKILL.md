---
name: llm-wiki
description: 构建和维护个人知识库 Wiki。当用户需要收集整理知识、管理研究笔记、构建持久化的知识体系时使用。支持 llm-wiki:init（初始化）、llm-wiki:add（添加资料）、llm-wiki:query（查询知识）、llm-wiki:lint（健康检查）四个子操作。
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
- [Karpathy - LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 增量知识库架构和三层模型
- [Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) — 知识复利理念：每次解决问题的经验都应该让下次更容易

## When to Use

**AI 应该主动判断并使用此技能的情况：**

1. **用户想建立知识库** - "帮我整理这些资料"、"我想建一个 wiki"
2. **用户提供了新的学习资料** - 丢了一篇文章、论文、书籍章节需要整理
3. **用户想查询已有知识** - "这个概念之前读过什么？"
4. **用户想维护知识库健康** - "检查一下 wiki 有没有矛盾"
5. **用户在进行长期研究** - 跨周/月的主题研究，需要知识积累

**不需要使用的情况：**
- 一次性问答，不需要持久化知识
- 代码调试或开发任务

## 核心理念

传统 RAG：每次提问都从原始文档重新发现知识，没有积累。

LLM Wiki：
- **Wiki 是持久的、复利的产物**。交叉引用已建好，矛盾已标记，综合分析反映所有读过的内容
- **你负责选题和提问，LLM 负责体力活**——总结、交叉引用、归档、维护
- **Obsidian 是 IDE，LLM 是程序员，Wiki 是代码库**

## 子操作

| 操作 | 调用方式 | 说明 |
|------|----------|------|
| 初始化 | `llm-wiki:init` | 创建 Wiki 目录结构和初始文件 |
| 添加资料 | `llm-wiki:add` | 处理新资料，更新 Wiki 页面 |
| 经验积累 | `llm-wiki:compound` | 将解决问题的经验文档化 |
| 查询知识 | `llm-wiki:query` | 基于 Wiki 内容回答问题 |
| 健康检查 | `llm-wiki:lint` | 检查 Wiki 一致性和完整性 |

各操作的详细说明见同目录下的 `init.md`、`add.md`、`compound.md`、`query.md`、`lint.md`。

## 两层架构

```
~/llm-wiki/
├── raw/                    # 第 1 层：原始资料（不可变，LLM 只读不写）
│   ├── articles/           # 文章
│   ├── papers/             # 论文
│   ├── books/              # 书籍章节
│   ├── notes/              # 手写笔记、播客笔记
│   └── assets/             # 图片等附件
└── wiki/                   # 第 2 层：LLM 维护的 Wiki（LLM 拥有此层）
    ├── index.md            # 内容目录（按类别组织，每次 add 后更新）
    ├── log.md              # 操作日志（追加式时间线）
    ├── overview.md         # 整体概览/综述
    ├── entities/           # 实体页（人物、组织、产品等）
    ├── concepts/           # 概念页（理论、方法、术语等）
    ├── topics/             # 主题页（综合分析、比较）
    ├── sources/            # 来源摘要（每条原始资料的摘要）
    └── solutions/          # 经验文档（compound 产生的解决方案和洞察）
```

- **Raw Sources** - 原始文档，不可变，事实来源
- **Wiki** - LLM 生成的 Markdown，LLM 完全拥有，使用 `[[wikilink]]` 互联

> **关于 Schema 层**：Karpathy 原文提到第三层 Schema（CLAUDE.md/AGENTS.md），用于告诉 LLM 如何工作。在我们的设计中，这个职责由 skill 文件本身承担（SKILL.md 定义架构和规范，init/add/query/lint 定义工作流），因此不需要在目标项目中单独维护 Schema 文件。

## 文件命名规范

| 类型 | 路径格式 | 示例 |
|------|----------|------|
| 来源摘要 | `wiki/sources/YYYY-MM-DD-简短名称.md` | `wiki/sources/2026-04-06-attention-paper.md` |
| 实体页 | `wiki/entities/名称.md` | `wiki/entities/transformer.md` |
| 概念页 | `wiki/concepts/概念名.md` | `wiki/concepts/self-attention.md` |
| 主题页 | `wiki/topics/主题名.md` | `wiki/topics/encoder-vs-decoder.md` |

所有文件名使用英文小写 + 连字符。

## 页面模板

### 来源摘要页（`wiki/sources/`）

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
- 要点 2

## 关键引用
> 原文引用

## 与其他来源的关系
- 与 [[other-source]] 在 X 方面相互印证
- 与 [[contradicting-source]] 在 Y 方面存在矛盾

## 衍生概念
- [[concept-a]]
- [[entity-b]]
```

### 实体/概念页（`wiki/entities/` / `wiki/concepts/`）

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
- 信息点 2（来源：[[source-b]]）

## 关联
- 相关概念：[[concept-x]], [[concept-y]]
- 相关实体：[[entity-z]]

## 开放问题
- 尚未解答的问题
```

### 主题页（`wiki/topics/`）

```markdown
---
type: topic
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: [source-a, source-b, source-c]
---

# 主题标题

## 摘要
综合概述。

## 分析
来自多个来源的综合分析。

## 对比
| 维度 | A | B |
|------|---|---|
| ... | ... | ... |

## 结论
综合结论。

## 参考
- [[source-a]]
- [[source-b]]
```

## 写作规范

- 每个页面开头使用 YAML frontmatter（`type`, `date`, `tags`, `sources`）
- 使用 `[[wikilink]]` 语法创建页面间链接
- 每个事实声明都标注来源（`来源：[[source-name]]`）
- 新来源与已有信息矛盾时，明确标注并保留两个版本
- 保持页面简洁，每个页面聚焦一个主题

## Obsidian 集成

Wiki 目录可直接用 Obsidian 打开：
- **Graph View** - 查看知识网络的形状
- **Web Clipper** - 浏览器扩展，快速将网页文章转为 Markdown 存入 `raw/`
- **Dataview 插件** - 基于 frontmatter 生成动态表格
- **Marp 插件** - 从 Wiki 内容生成幻灯片
- **本地图片** - 设置附件文件夹路径为 `raw/assets/`

## 适用场景

**主动学习（llm-wiki:add）：**
- **学术研究** - 深入某个主题，增量构建综合 Wiki
- **阅读笔记** - 边读边记，构建角色、主题、情节的互联 Wiki
- **竞品分析、尽职调查、旅行规划、课程笔记** - 任何需要长期积累知识的场景

**经验积累（llm-wiki:compound）：**
- **个人成长** - 跟踪目标、健康、心理学，记录自我发现和反复出现的模式
- **工程实践** - 记录 bug 修复、调试过程、最佳实践，让同类问题下次秒解
- **团队知识库** - 从会议纪要、项目文档、客户反馈中持续提炼，解决方案可搜索可复用
- **工作流优化** - 记录摸索出的技巧和踩过的坑，形成个人操作手册
