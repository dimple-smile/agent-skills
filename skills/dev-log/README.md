# @dev-log/cli

**English** | [中文](#中文)

AI debugging collaboration — collect runtime logs over HTTP, let the AI read and analyze them itself. No screenshots, no console copying.

Designed for AI coding agents. The AI instruments code with log statements, the user reproduces the issue, and the AI reads the collected logs directly.

## How it works

```
AI instruments code ──→ user reproduces ──→ AI reads logs & analyzes
```

Traditional debugging means opening DevTools, screenshotting, copy-pasting console output to the AI. `dev-log` removes that entirely.

## Quick start

```bash
# Start the log server (background daemon, port 7331)
npx @dev-log/cli start

# Generate a log statement for any language
npx @dev-log/cli gen --lang js --type state --data '{count: 1}' --session sess_abc123

# Read collected logs after the user acts
npx @dev-log/cli logs --session sess_abc123

# Stop the server
npx @dev-log/cli stop
```

## Commands

| Command | Description |
|---------|-------------|
| `start` | Start the log server (port 7331, background daemon) |
| `gen` | Generate a paste-ready log statement for 13 languages |
| `logs` | Read collected logs (filter by `--session`) |
| `clear` | Clear logs (by session or all) |
| `tunnel` | Start an HTTPS tunnel (for HTTPS pages / mobile / remote) |
| `status` | Show server status |
| `stop` | Stop the server |

### `gen` options

| Option | Description |
|--------|-------------|
| `--lang <lang>` | `js` `ts` `python` `go` `swift` `kotlin` `dart` `cpp` `rust` `java` `csharp` `php` `ruby` |
| `--type <type>` | Log type: `state` (default), `error`, `validation`, `click`, etc. |
| `--data <expr>` | Data payload in the target language |
| `--ready` | Emit a `__ready__` connectivity probe |
| `--session <id>` | Reuse a sessionId (default: auto-generated) |
| `--url <url>` | Endpoint URL (default: `http://localhost:7331`) |

## Works with your AI agent

`dev-log` works with any AI coding agent that supports the [Agent Skills](https://agentskills.io) standard (`SKILL.md` format), including:

Claude Code · Cursor · Windsurf · Cline · GitHub Copilot · Codex · Roo · Aider · Continue · OpenCode · and 60+ more

Install the skill so your agent knows how to use `dev-log`:

```bash
npx skills add https://github.com/dimple-smile/agent-skills --skill dev-log
```

After installation, the AI agent will automatically instrument code, collect logs, and analyze results — no manual configuration needed.

<details>
<summary>Manual install (without npx skills)</summary>

Copy the `SKILL.md` file to your agent's skills directory:

| Agent | Path |
|-------|------|
| Claude Code | `.claude/skills/dev-log/SKILL.md` |
| Cursor | `.cursor/skills/dev-log/SKILL.md` |
| Windsurf | `.windsurf/skills/dev-log/SKILL.md` |
| Cline / Roo | `.clinerules/skills/dev-log/SKILL.md` |
| Generic | `.agents/skills/dev-log/SKILL.md` |

</details>

## License

ISC

---

## 中文

AI 调试协作工具——通过 HTTP 收集运行时日志，让 AI 自行读取分析，无需截图或复制控制台输出。

专为 AI 编程 agent 设计。AI 在代码中埋点，用户操作后 AI 自行读取日志分析。

### 工作原理

```
AI 埋点代码 ──→ 用户操作复现 ──→ AI 读取日志并分析
```

传统调试需要打开 DevTools、截图、复制控制台输出给 AI。`dev-log` 彻底消除了这些步骤。

### 快速开始

```bash
# 启动日志服务（后台 daemon，端口 7331）
npx @dev-log/cli start

# 生成任意语言的日志语句
npx @dev-log/cli gen --lang js --type state --data '{count: 1}' --session sess_abc123

# 用户操作后读取收集的日志
npx @dev-log/cli logs --session sess_abc123

# 停止服务
npx @dev-log/cli stop
```

### 命令一览

| 命令 | 说明 |
|------|------|
| `start` | 启动日志服务（端口 7331，后台 daemon） |
| `gen` | 生成可直接粘贴的日志语句，支持 13 种语言 |
| `logs` | 读取已收集的日志（按 `--session` 过滤） |
| `clear` | 清除日志（按会话或全部） |
| `tunnel` | 启动 HTTPS 隧道（HTTPS 页面 / 移动端 / 远程访问） |
| `status` | 查看服务状态 |
| `stop` | 停止服务 |

### `gen` 选项

| 选项 | 说明 |
|------|------|
| `--lang <lang>` | 目标语言：`js` `ts` `python` `go` `swift` `kotlin` `dart` `cpp` `rust` `java` `csharp` `php` `ruby` |
| `--type <type>` | 日志类型：`state`（默认）、`error`、`validation`、`click` 等 |
| `--data <expr>` | 数据负载，用目标语言的表达式 |
| `--ready` | 生成 `__ready__` 连通性探测 |
| `--session <id>` | 复用 sessionId（默认：自动生成） |
| `--url <url>` | 端点 URL（默认：`http://localhost:7331`） |

### 支持的语言

JavaScript、TypeScript、Python、Go、Swift、Kotlin、Dart、C++、Rust、Java、C#、PHP、Ruby

### 配合 AI agent 使用

`dev-log` 兼容所有支持 [Agent Skills](https://agentskills.io) 标准（`SKILL.md` 格式）的 AI 编程工具，包括：

Claude Code · Cursor · Windsurf · Cline · GitHub Copilot · Codex · Roo · Aider · Continue · OpenCode · 等 60+ 种工具

安装 skill，让你的 agent 学会使用 `dev-log`：

```bash
npx skills add https://github.com/dimple-smile/agent-skills --skill dev-log
```

安装后，AI agent 会自动埋点、收集日志、分析结果——无需手动配置。

<details>
<summary>手动安装（不用 npx skills）</summary>

将 `SKILL.md` 复制到你的 agent 的 skills 目录：

| Agent | 路径 |
|-------|------|
| Claude Code | `.claude/skills/dev-log/SKILL.md` |
| Cursor | `.cursor/skills/dev-log/SKILL.md` |
| Windsurf | `.windsurf/skills/dev-log/SKILL.md` |
| Cline / Roo | `.clinerules/skills/dev-log/SKILL.md` |
| 通用 | `.agents/skills/dev-log/SKILL.md` |

</details>

### 许可证

ISC
