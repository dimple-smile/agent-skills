# Agent Skills 规范文档

一个简洁的 Agent Skills 规范说明，供 AI 阅读并按规范生成 SKILL.md 文件。

## 用法

将 [SKILL_SPEC.md](./SKILL_SPEC.md) 的内容发给 AI，让 AI 按照规范生成技能文件。

## 示例

```
请按照 SKILL_SPEC.md 的规范，帮我创建一个 "处理 GitHub PR" 的技能
```

## 核心规范

每个 `SKILL.md` 文件需要：

```yaml
---
name: skill-name        # 必需：小写+连字符，1-64字符
description: 描述      # 必需：1-1024字符，说明何时使用
---

# 技能标题

## When to Use
使用场景...

## Examples
示例...
```

## 相关链接

- [Agent Skills Specification](https://agentskills.io/specification)
- [Vercel Skills CLI](https://github.com/vercel-labs/skills)
- [Skills Directory](https://skills.sh)
