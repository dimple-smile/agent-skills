---
name: dev-log
description: AI debugging collaboration. Collect runtime logs over HTTP and generate paste-ready log statements for 13 languages (JS, Python, Go, Swift, Kotlin, ...). After the user acts, the AI reads the logs itself — no screenshots or console copying. AI 调试协作，通过 HTTP 收集运行时日志，AI 自行查看分析，无需截图或复制控制台。
version: 1.0.0
tags:
  - debugging
  - frontend
  - developer-tools
---

# dev-log

将运行时日志通过 HTTP 请求实时收集到本地服务，AI 自行读取分析——无需截图、无需复制控制台输出。AI 负责埋点，用户负责操作，AI 负责读日志。

## 何时使用

主动在以下场景使用：

1. 你生成的前端代码可能需要调试 / 验证。
2. 用户说「帮我看看」「有问题」「检查一下为什么」。
3. 需要追踪异步流程（fetch、Promise、async/await）。
4. 需要查看变量的运行时值（尤其是用户输入或动态计算的值）。

**不要用于**：纯静态内容、琐碎的一次性检查、或纯后端（Node 服务端）代码——后者直接看 stdout 即可。

## 命令

所有操作通过一个 CLI 完成，用 `npx @dev-log/cli` 调用。

> **提示：** 首次执行 npx 会弹出安装确认（`Ok to proceed?`），agent 自动执行时会卡住。建议加 `-y` 跳过：`npx -y @dev-log/cli <command>`。下方示例为简洁省略了 `-y`。

```bash
npx @dev-log/cli start                            # 启动日志服务（端口 7331，后台 daemon）
npx @dev-log/cli gen --lang <lang> [options]      # 生成可直接粘贴的日志语句
npx @dev-log/cli logs [--session <id>]            # 读取已收集的日志
npx @dev-log/cli clear [--session <id>]           # 清除日志（不传 --session 清全部）
npx @dev-log/cli status                           # 查看服务状态
npx @dev-log/cli tunnel                           # 可选：启动 HTTPS 隧道（HTTPS 页面 / 远程访问）
npx @dev-log/cli stop                             # 停止服务
npx @dev-log/cli --help                           # 查看所有命令和选项
```

### `gen` 选项

| 选项 | 说明 |
|--------|---------|
| `--lang <lang>` | 目标语言：`js` `ts` `python` `go` `swift` `kotlin` `dart` `cpp` `rust` `java` `csharp` `php` `ruby` |
| `--type <type>` | 日志类型 — `state`（默认）、`error`、`validation`、`click`、`request` 等 |
| `--data <expr>` | 数据负载，用目标语言的字面量/表达式（如 `{count:1}`） |
| `--ready` | 生成 `__ready__` 连通性探测，而非业务日志 |
| `--session <id>` | 复用 sessionId（默认：生成新的 `sess_xxxxxxxx`） |
| `--url <url>` | 端点 URL（默认：`http://localhost:7331`） |

`gen` **只输出代码**到 stdout——捕获后插入用户源码。它会自动注入 sessionId、时间戳表达式，以及（使用 `--ready` 时）`__ready__` 探测。

## 工作流程

### 1. 启动服务

```bash
npx @dev-log/cli start
```

`start` 会 fork 出一个**后台 daemon**并立即返回——不需要 `nohup`、不需要 `&`，前台不阻塞。daemon 独立于 agent/子进程存活。确认它已启动：

```bash
sleep 2 && npx @dev-log/cli status
```

### 2. 选定 session id 并埋点

> **关键：** 每个调试目标选定**一个** `sess_xxxxxxxx`，并在**每次 `gen` 调用时都传入同一个**。如果不传 `--session` 连续调用两次 `gen`，会得到两个不同的随机 id，日志被拆分到不同会话——失去意义。务必始终传 `--session <同一个 id>`。

先生成连通性探测，再生成业务日志：

```bash
# 连通性探测（始终第一个）
npx @dev-log/cli gen --lang js --ready --session sess_a1b2c3d4

# 业务日志
npx @dev-log/cli gen --lang js --type state --data '{count: count}' --session sess_a1b2c3d4
npx @dev-log/cli gen --lang js --type error --data '{msg: err.message}' --session sess_a1b2c3d4
```

将每条输出的代码插入用户源码的相应位置。

> **移动端 / HTTPS 页面：** 默认的 `http://localhost:7331` 只适用于本地 HTTP 页面。对于 HTTPS 页面、移动端或远程机器，需要启动隧道并传入 `--url`：
> ```bash
> npx @dev-log/cli tunnel          # 输出 https://xxxx.loca.lt
> npx @dev-log/cli gen --lang js --ready --session sess_a1b2c3d4 --url https://xxxx.loca.lt
> ```

### 3. 请用户操作

告诉用户：「我已在关键位置添加了日志，请操作。」

### 4. 读取并分析日志

当用户说「好了」时，读取日志（务必用你的 session id 过滤，避免读到其他会话的数据）：

```bash
npx @dev-log/cli logs --session sess_a1b2c3d4
```

根据 `__ready__` 探测诊断：

| `__ready__` 是否存在 | 诊断 |
|---|---|
| ✅ 存在，且有业务日志 | 分析业务日志——完成。 |
| ✅ 存在，但**没有**业务日志 | 探测到达了服务，但埋点的代码没执行。检查事件绑定 / 触发条件 / 用户是否真的执行了操作。 |
| ❌ 完全没有探测 | 网络：页面无法连接服务。可能是 HTTPS 页面请求 HTTP 端点（MIXED_CONTENT）——改用隧道 URL。 |

## 会话清理

> **服务是跨会话共享的。** 绝不要因为一次对话结束就 kill 服务或 `clear`（不带 `--session`）。

当一个调试目标完成时：

```bash
npx @dev-log/cli clear --session sess_a1b2c3d4     # 只清除本会话的日志
npx @dev-log/cli status                            # 是否还有其他活跃会话？
```

**仅在** `status` 显示零活跃会话时才停止服务：

```bash
npx @dev-log/cli stop
```

## 安全

- **绝不记录敏感信息。** 当数据包含凭据时，先过滤敏感字段再记录。
- 敏感字段名（不区分大小写）：`password`、`pwd`、`token`、`secret`、`apikey`、`key`、`credit`、`cvv`、`ssn`、`auth`。

```javascript
// 记录前剥离敏感字段
const safe = (o) => {
  const k = ['password','pwd','token','secret','key','credit','cvv','ssn','auth'];
  return Object.fromEntries(Object.entries(o).map(([n,v]) =>
    [n, k.some(s => n.toLowerCase().includes(s)) ? '***' : v]));
};
```

## 备注

1. 服务将日志和 PID 写入 `$TMPDIR/dev-log/`（系统临时目录）——已安装的包目录保持干净。
2. 固定端口 `7331`；无随机端口，无需读取端口文件。
3. `start` 作为后台 daemon 运行——不需要 `nohup`/`&`。用 `npx @dev-log/cli stop` 停止。
4. 发布前务必移除所有调试埋点代码。
5. 仅限本地开发——不要暴露到公网。
