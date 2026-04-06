---
name: llm-wiki:init
description: 初始化 Wiki 知识库。当用户说"建一个知识库"、"初始化 wiki"、"我想整理笔记"时使用。
version: 1.0.0
tags:
  - knowledge-base
  - wiki
depends_on:
  - llm-wiki
---

# llm-wiki:init

初始化 Wiki 知识库的目录结构和初始文件。

## When to Use

- 用户说"建一个知识库"、"初始化 wiki"、"我想整理笔记"
- 首次使用 llm-wiki 时必须先初始化

## 工作流

### Step 1: 确认创建位置和主题

先告知用户默认将在 `~/llm-wiki` 创建知识库，并询问是否需要调整：

```
将在你的 home 目录下创建 llm-wiki 知识库：
  ~/llm-wiki/

你想要在别的目录创建吗？（直接回车使用默认路径）
```

同时询问知识库的主题范围，以便在 overview.md 中正确描述。

### Step 2: 创建目录结构

在确认的路径下创建：

```bash
mkdir -p ~/llm-wiki/raw/{articles,papers,books,notes,assets}
mkdir -p ~/llm-wiki/wiki/{entities,concepts,topics,sources,solutions}
```

如果用户的资料类型与默认分类不同，根据实际情况调整 `raw/` 的子目录。

### Step 3: 创建 index.md

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

### Step 4: 创建 log.md

```markdown
# Wiki Log

<!-- 操作记录按时间追加在此，格式：## [YYYY-MM-DD] 操作类型 | 描述 -->
```

### Step 5: 创建 overview.md

根据用户描述的主题范围填写：

```markdown
---
type: overview
created: YYYY-MM-DD
---

# 知识库概览

> 本 Wiki 由 LLM 自动维护。你负责选题和提问，LLM 负责总结、交叉引用、归档和维护。

## 主题范围
<!-- 描述知识库覆盖的主题范围 -->

## 当前状态
- 来源数量：0
- 总页面数：0（含 index、log、overview）
- 最近更新：-

## 核心发现
<!-- 随着知识积累，这里将总结最重要的发现 -->
```

### Step 6: 输出确认

告诉用户初始化完成，列出创建的目录和文件，并提示可用命令：

```
Wiki 知识库已初始化！

目录结构：
  ~/llm-wiki/raw/    ← 放入你的原始资料（文章、论文、笔记等）
  ~/llm-wiki/wiki/   ← LLM 维护的知识库

可用命令：
  llm-wiki-add       添加新资料，自动整理到 Wiki（支持文件、链接、文本）
  llm-wiki-compound  将解决问题的经验文档化（bug 修复、最佳实践、工作流技巧）
  llm-wiki-query     查询 Wiki 中的知识，综合回答并归档有价值的分析
  llm-wiki-lint      检查 Wiki 健康状况，发现矛盾、孤儿页面、缺失概念

快速开始：
  - 把资料放入 raw/ 目录，然后使用 llm-wiki-add 处理
  - 或直接给链接/文本，llm-wiki-add 会帮你保存并处理
```
