# Agent Skills 规范说明

> 本文档供 AI 阅读并按规范生成 Agent Skills（SKILL.md 文件）

## 支持的平台

Agent Skills 遵循开放标准，可被以下 AI Agent 使用：
- Claude Code
- Cursor
- Codex (OpenAI)
- Cline
- Continue
- 以及其他 25+ 个 AI 编程助手

完整列表：[skills.sh](https://skills.sh)

## 核心规范

### 必需字段

每个 `SKILL.md` 文件必须包含：

```yaml
---
name: skill-name
description: 简短描述（1-1024字符）
---

# Skill Name

技能说明...
```

### 字段约束

| 字段 | 约束 |
|------|------|
| `name` | 1-64字符，小写字母+数字+连字符，必须以字母数字开头结尾 |
| `description` | 1-1024字符，说明技能何时使用 |

## 完整模板

```markdown
---
name: skill-name
description: 当用户需要什么功能时使用此技能
---

# 技能名称

一句话描述这个技能做什么。

## When to Use

使用此技能的情况：
- 用户需要 XXX 时
- 遇到 YYY 场景时
- 需要执行 ZZZ 操作时

## Examples

### Example 1

\`\`\`markdown
User: 用户的问题...

Agent: [uses skill-name skill]
回答...
\`\`\`

### Example 2

\`\`\`markdown
User: 另一个问题...

Agent: [uses skill-name skill]
回答...
\`\`\`

## Implementation

（可选）给 Agent 的详细实现说明...
```

## 可选字段

```yaml
---
name: skill-name
description: 技能描述
version: 1.0.0
author: 作者名 <email>
license: MIT
tags:
  - category1
  - category2
capabilities:
  - capability1
  - capability2
depends_on:
  - other-skill
metadata:
  internal: false  # true 则不在列表中显示
---
```

## 项目结构

```
agent-skills/
└── skills/
    ├── web-search/
    │   └── SKILL.md
    ├── git-operations/
    │   └── SKILL.md
    └── your-skill/
        └── SKILL.md
```

## 示例：Web Search Skill

```markdown
---
name: web-search
description: 从网络搜索信息。当用户需要搜索网页、获取最新信息或查找资源时使用。
---

# Web Search

从互联网搜索并提供实时信息。

## When to Use

- 用户询问最新新闻或事件
- 需要查找特定资源或文档
- 需要验证某个事实
- 用户说"搜索"、"查找"、"google"等

## Examples

### 搜索最新信息

\`\`\`markdown
User: TypeScript 5.0 有什么新特性？

Agent: [uses web-search skill]
根据搜索结果，TypeScript 5.0 的新特性包括：
1. Decorators 支持
2. const 类型参数
...
\`\`\`

### 查找资源

\`\`\`markdown
User: 找一下 React hooks 最佳实践

Agent: [uses web-search skill]
找到了以下资源：
- 官方文档：...
\`\`\`

## Implementation

使用搜索 API 时：
1. 提取核心搜索关键词
2. 执行搜索
3. 总结相关结果
4. 提供来源链接
```

## 最佳实践

### 1. Description 要清晰

好的描述说明"何时"使用：
- ✅ "从网络搜索信息。当用户需要最新信息或查找资源时使用。"
- ❌ "一个搜索技能"

### 2. 提供多个示例

覆盖不同使用场景，帮助 AI 理解何时激活此技能。

### 3. 实现说明具体

如果技能需要特定步骤，在 Implementation 中详细说明。

### 4. 命名规范

使用小写+连字符：
- ✅ `web-search`, `git-operations`, `api-client`
- ❌ `WebSearch`, `web_search`, `WEB-SEARCH`

## 发布方式

1. 将 `skills/` 目录推送到 GitHub
2. 用户通过以下命令安装：
   ```bash
   npx skills add username/repo
   ```
3. `skills` CLI 会自动发现所有 SKILL.md 文件

## 相关链接

- [Agent Skills 规范](https://agentskills.io/specification)
- [Vercel Skills CLI](https://github.com/vercel-labs/skills)
- [Skills 目录](https://skills.sh)

## 给 AI 的指令

**当你需要创建一个新的 Agent Skill 时：**

1. 询问用户技能的功能和使用场景
2. 按照 `name` 字段约束生成技能名
3. 编写清晰的 `description`（说明何时使用）
4. 提供 2-3 个使用示例
5. 如有需要，添加实现说明
6. 在 `skills/技能名/SKILL.md` 创建文件

**示例交互：**

```
用户：帮我创建一个技能，用于生成 git commit message

AI：我来帮你创建一个 git-commit-message 技能。

根据你的需求，这个技能应该：
- name: git-commit-message
- description: 生成符合规范的 Git commit message。当用户完成代码修改并需要提交时使用。
- 包含不同类型的 commit 示例（feat, fix, docs 等）

正在创建文件...
```
