# Agent Skills

[English](./README_EN.md) | 简体中文

dimple-smile 的 AI 编程代理技能集合，托管于 [skills.sh](https://skills.sh/dimple-smile/agent-skills)。

## 可用技能

### dev-log

AI 调试协作方案。将运行时日志通过 HTTP 请求实时收集，用户操作完成后 AI 可自行查看分析，无需截图或复制控制台。

**支持 14 种语言：** JavaScript、TypeScript、Python、Go、PHP、Ruby、Java、C++、C#、Rust、Swift、Kotlin、Dart、R

**解决的问题：**

传统调试需要开发者打开控制台截图或复制输出发送给 AI，效率低下。dev-log 通过 HTTP 服务收集日志，AI 可以**自行查看**日志，无需用户手动操作。

**使用场景：**
- 需要调试/验证代码
- 追踪异步流程（fetch、Promise、async/await）
- 验证逻辑（表单验证、状态更新、条件判断）
- 查看变量值（特别是动态生成或用户输入的值）

**功能特性：**
- 自动启动 HTTP 日志服务（随机端口）
- 内网穿透支持（HTTPS 页面/远程访问）
- 会话隔离（sessionId 过滤）
- 多语言模板
- 敏感数据过滤

## 安装

```bash
npx skills add dimple-smile/agent-skills
```

## 工作流

1. **提出问题** - 「帮我看看 xxx 问题」
2. **自动埋点** - AI 在关键位置写入日志收集语句
3. **等待操作** - AI 告知「已在关键位置添加日志，请操作」
4. **完成操作** - 用户操作完成后说「我已操作完成」
5. **自动分析** - AI 自行查看日志，分析问题

整个过程无需截图或复制日志，AI 完全自主完成调试分析。

## 相关链接

- [Skills Directory](https://skills.sh/dimple-smile/agent-skills)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Vercel Skills CLI](https://github.com/vercel-labs/skills)

## License

ISC
