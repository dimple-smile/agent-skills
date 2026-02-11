# Agent Skills

dimple-smile 的 AI 编程代理技能集合，支持 Claude Code、OpenCode、Cursor 等主流 AI 工具。

技能是打包的指令和脚本，用于扩展 AI 代理的能力，遵循 [Agent Skills](https://agentskills.io/) 规范。

## 可用技能

### dev-log

**背景**

随着与 AI 协作的深入，在排查问题或对齐需求时，经常需要输出 console.log 协助 AI 理解处理过程。

**解决什么问题**

传统做法需要开发者自行打开控制台截图或复制输出再发送给 AI，效率低下。dev-log 通过改变 console.log 的方式，使用本地接口服务收集日志，在开发者完成界面操作后，AI 可以**自行查看**日志，不再需要开发者截图或复制。

**使用方式**

1. **AI 自动激活** - AI 会根据场景自动激活该技能，在判断为调试问题等需要输出日志协助分析的场景会自动使用
2. **手动激活** - 在提示词中说「使用 dev-log 收集日志」

**使用场景：**
- 生成前端代码时需要调试/验证
- 用户说"帮我调试"、"有问题"、"看看为什么"
- 需要追踪异步流程（fetch、Promise、async/await）
- 需要验证逻辑（表单验证、状态更新、条件判断）
- 需要查看变量值（特别是动态生成或用户输入的值）
- 用户说"操作完成了"、"你看下"、"好了"

**功能特性：**
- 自动后台启动 HTTP 日志服务
- 通过 fetch 请求实时发送日志
- 会话隔离（sessionId 过滤）
- JSON 格式日志存储

**技术栈：** Node.js (ESM)

## 安装

```bash
npx skills add dimple-smile/agent-skills
```

> **注意：** 安装后需要重启 Claude Code 或 OpenCode 终端窗口

## 工作流预览

使用 dev-log 的完整协作流程：

1. **提出问题** - 跟 agent 说「帮我看看 xxx 问题，需要收集处理过程日志来深入理解」
2. **自动埋点** - agent 自动调用 dev-log 技能，在关心的核心处理位置写入日志收集语句
3. **等待操作** - agent 告知「已在关键位置添加日志语句，等待你来操作」
4. **完成操作** - 使用者操作完成后，跟 agent 说「我已操作完成」
5. **自动分析** - agent 自行查看日志数据，分析问题根因

整个过程无需截图或复制日志，AI 能够完全自主完成调试分析。

## 使用示例

安装后技能自动可用，支持 Claude Code、OpenCode、Cursor 等主流 AI 工具：

```
写一个 React 计数器组件
```

```
使用 dev-log 收集日志，这个异步函数有时候会失败，帮我看看
```

```
帮我调试这个前端问题
```

## 技能结构

每个技能包含：
- `SKILL.md` - AI 代理的指令
- `server.js` - HTTP 服务器
- `start.sh` - 启动脚本
- `read-log.sh` - 日志读取脚本

## 相关链接

- [Agent Skills Specification](https://agentskills.io/specification)
- [Vercel Skills CLI](https://github.com/vercel-labs/skills)
- [Skills Directory](https://skills.sh)

## License

ISC
