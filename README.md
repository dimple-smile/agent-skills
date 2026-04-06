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

**典型工作流：**

1. **提出问题** - 「帮我看看 xxx 问题」
2. **自动埋点** - AI 在关键位置写入日志收集语句
3. **等待操作** - AI 告知「已在关键位置添加日志，请操作」
4. **完成操作** - 用户操作完成后说「我已操作完成」
5. **自动分析** - AI 自行查看日志，分析问题

整个过程无需截图或复制日志，AI 完全自主完成调试分析。

### llm-wiki / llm-wiki-en

将 LLM 变成你的 Wiki 维护者。LLM 增量构建并维护一个持久的、相互关联的 Markdown 知识库。知识被编译一次并持续更新，而非每次重新推导。

- **llm-wiki** — 中文版
- **llm-wiki-en** — English version

**灵感来源：**
- [Karpathy - LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 增量知识库架构
- [Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) — 知识复利理念

**5 个操作：**

| 操作 | 用途 |
|------|------|
| `init` | 初始化知识库目录和模板 |
| `ingest` | 摄入新资料，提取知识并整合到 Wiki |
| `compound` | 将解决问题的经验文档化（Bug Track / Knowledge Track） |
| `query` | 基于 Wiki 内容回答问题，好的回答归档为主题页 |
| `lint` | 健康检查：矛盾、孤儿页面、缺失概念等 |

**适用场景：**
- 学术研究、阅读笔记、竞品分析
- 工程实践记录（bug 修复、最佳实践）
- 长期主题研究的知识积累

**典型工作流：**

1. **初始化** - 「帮我建一个 wiki」→ AI 创建目录结构和模板
2. **摄入资料** - 用户放入文章/论文/链接 → AI 提取知识，创建实体页、概念页、来源摘要
3. **经验积累** - 解决问题后说「搞定了」→ AI 自动文档化为 Bug Track 或 Knowledge Track
4. **查询知识** - 「X 和 Y 有什么区别？」→ AI 综合多页面回答，好的回答归档为主题页
5. **健康检查** - 「检查一下 wiki」→ AI 检测矛盾、孤儿页面、缺失概念，建议修复

## 安装

```bash
npx skills add dimple-smile/agent-skills
```

## 相关链接

- [Skills Directory](https://skills.sh/dimple-smile/agent-skills)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Vercel Skills CLI](https://github.com/vercel-labs/skills)

## License

ISC
