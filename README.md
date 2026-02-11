# Agent Skills

dimple-smile 的 AI 编程代理技能集合。技能是打包的指令和脚本，用于扩展 AI 代理的能力。

技能遵循 [Agent Skills](https://agentskills.io/) 规范。

## 安装

```bash
npx skills add dimple-smile/agent-skills
```

## 可用技能

### dev-log

前端调试的默认日志方案。当 AI 生成前端代码需要调试或者协助排查问题时，自动使用此技能收集日志，让 AI 能自行查看运行时结果，无需用户手动复制控制台。

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

## 使用方法

安装后技能自动可用，AI 代理会在检测到相关任务时自动使用。

**示例：**

```
写一个 React 计数器组件
```

```
这个异步函数有时候会失败，帮我看看
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
