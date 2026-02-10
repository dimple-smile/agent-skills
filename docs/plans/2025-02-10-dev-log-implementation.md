# Dev Log Skill 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 创建 dev-log 技能，让 AI 能通过 HTTP 服务自动获取前端运行时日志，无需用户手动复制控制台内容。

**架构:**
- 后端: Node.js HTTP 服务器，随机端口，后台运行
- 前端: 单行 fetch 语句注入到用户代码
- 通信: JSON 格式日志，POST 发送/GET 读取
- 隔离: sessionId 内存记录，读取时过滤

**技术栈:**
- Node.js (http 模块)
- JavaScript/TypeScript (前端代码注入)
- JSON Lines 日志格式

---

### Task 1: 创建 SKILL.md 基础文件

**文件:**
- 创建: `skills/dev-log/SKILL.md` (已存在，需更新)

**Step 1: 更新 SKILL.md 内容**

根据最终设计更新 SKILL.md，包含：
- 基本信息: name, description, tags
- When to Use
- Examples (3个示例)
- Implementation 详细说明

内容已确认，直接更新现有文件。

**Step 2: 验证格式**

确认符合 SKILL_SPEC.md 规范：
- name: dev-log
- description: 清晰说明何时使用
- 包含完整示例和实现说明

**Step 3: 提交**

```bash
git add skills/dev-log/SKILL.md
git commit -m "docs: update dev-log SKILL.md with final design"
```

---

### Task 2: 创建日志服务器脚本

**文件:**
- 创建: `skills/dev-log/server.js`

**Step 1: 编写服务器脚本**

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(__dirname, 'pid.txt');
const PORT_FILE = path.join(__dirname, 'port.txt');
const LOG_FILE = path.join(__dirname, 'dev-logs.json');

// 读取旧 PID 并尝试关闭
function killOldProcess() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const oldPid = fs.readFileSync(PID_FILE, 'utf-8').trim();
      if (oldPid) {
        process.kill(parseInt(oldPid), 'SIGTERM');
        console.log(`已关闭旧进程: ${oldPid}`);
      }
    }
  } catch (e) {
    // 旧进程可能已不存在，忽略
  }
}

// 创建日志服务器
function createServer() {
  const logs = [];

  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        logs.push(body);
        try {
          fs.appendFileSync(LOG_FILE, body + '\n');
        } catch (e) {
          console.error('写入日志失败:', e.message);
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      });
    } else if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(logs.join('\n'));
    } else {
      res.writeHead(405);
      res.end('Method Not Allowed');
    }
  });

  return server;
}

// 启动服务器
function startServer() {
  killOldProcess();

  // 清空日志文件
  fs.writeFileSync(LOG_FILE, '');

  const server = createServer();
  server.listen(0, () => {
    const port = server.address().port;
    fs.writeFileSync(PORT_FILE, String(port));
    fs.writeFileSync(PID_FILE, String(process.pid));

    console.log(`Dev Log 服务已启动:`);
    console.log(`  端口: ${port}`);
    console.log(`  PID: ${process.pid}`);
    console.log(`  日志文件: ${LOG_FILE}`);
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    server.close(() => {
      try {
        fs.unlinkSync(PID_FILE);
      } catch (e) {}
      process.exit(0);
    });
  });
}

startServer();
```

**Step 2: 验证脚本语法**

```bash
node -c skills/dev-log/server.js
```

预期: 无语法错误

**Step 3: 手动测试启动**

```bash
cd skills/dev-log && node server.js
```

预期: 看到启动信息，显示端口和 PID

**Step 4: 手动测试 POST**

```bash
curl -X POST http://localhost:$(cat skills/dev-log/port.txt) \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","time":"12:00:00.000","type":"test","data":"hello"}'
```

预期: 返回 OK

**Step 5: 手动测试 GET**

```bash
curl http://localhost:$(cat skills/dev-log/port.txt)
```

预期: 返回刚才发送的日志

**Step 6: 清理测试进程**

```bash
kill $(cat skills/dev-log/pid.txt)
rm skills/dev-log/pid.txt skills/dev-log/port.txt skills/dev-log/dev-logs.json
```

**Step 7: 提交**

```bash
git add skills/dev-log/server.js
git commit -m "feat: add dev-log server script"
```

---

### Task 3: 创建服务检查和启动脚本

**文件:**
- 创建: `skills/dev-log/start.sh`

**Step 1: 编写启动脚本**

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="pid.txt"
PORT_FILE="port.txt"

# 检查现有服务
check_existing_service() {
  if [ -f "$PORT_FILE" ]; then
    PORT=$(cat "$PORT_FILE")
    if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
      echo "现有服务正常运行，端口: $PORT"
      return 0
    else
      echo "现有服务无响应，重启中..."
      return 1
    fi
  fi
  return 1
}

# 启动新服务
start_service() {
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill "$OLD_PID" 2>/dev/null
    rm -f "$PID_FILE"
  fi

  node server.js &
  sleep 1

  if [ -f "$PORT_FILE" ]; then
    echo "服务已启动，端口: $(cat $PORT_FILE)"
  else
    echo "服务启动失败" >&2
    exit 1
  fi
}

# 主流程
if check_existing_service; then
  exit 0
fi

start_service
```

**Step 2: 添加执行权限**

```bash
chmod +x skills/dev-log/start.sh
```

**Step 3: 测试启动脚本**

```bash
cd skills/dev-log && ./start.sh
```

预期: 服务启动，显示端口

**Step 4: 测试重复启动**

```bash
./start.sh
```

预期: 显示"现有服务正常运行"

**Step 5: 清理**

```bash
kill $(cat pid.txt) 2>/dev/null
rm -f pid.txt port.txt dev-logs.json
```

**Step 6: 提交**

```bash
git add skills/dev-log/start.sh
git commit -m "feat: add service check and start script"
```

---

### Task 4: 创建日志读取工具脚本

**文件:**
- 创建: `skills/dev-log/read-log.sh`

**Step 1: 编写读取脚本**

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/dev-logs.json"

if [ ! -f "$LOG_FILE" ]; then
  echo "日志文件不存在" >&2
  exit 1
fi

if [ -z "$1" ]; then
  # 无参数，返回所有日志
  cat "$LOG_FILE"
else
  # 有参数，按 sessionId 过滤
  grep "\"sessionId\":\"$1\"" "$LOG_FILE"
fi
```

**Step 2: 添加执行权限**

```bash
chmod +x skills/dev-log/read-log.sh
```

**Step 3: 测试读取**

先启动服务并发送测试日志：
```bash
cd skills/dev-log && ./start.sh
SESSION_ID="test123"
curl -X POST http://localhost:$(cat port.txt) \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"time\":\"12:00:00.000\",\"type\":\"test\",\"data\":\"hello\"}"
```

测试读取：
```bash
./read-log.sh "$SESSION_ID"
```

预期: 返回刚才发送的日志

**Step 4: 清理**

```bash
kill $(cat pid.txt)
rm -f pid.txt port.txt dev-logs.json
```

**Step 5: 提交**

```bash
git add skills/dev-log/read-log.sh
git commit -m "feat: add log reading utility script"
```

---

### Task 5: 更新 SKILL.md Implementation 部分

**文件:**
- 修改: `skills/dev-log/SKILL.md`

**Step 1: 添加服务器启动说明**

在 Implementation 部分添加：

```
### 服务器启动

AI 执行以下命令启动服务：

\`\`\`bash
cd skills/dev-log && ./start.sh
\`\`\`

服务会：
1. 检查现有服务是否正常
2. 如果正常则复用，异常则重启
3. 在后台运行
4. 将端口记录到 port.txt
```

**Step 2: 添加日志读取说明**

```
### 日志读取

AI 执行以下命令读取日志：

\`\`\`bash
# 读取所有日志
./skills/dev-log/read-log.sh

# 按 sessionId 过滤
./skills/dev-log/read-log.sh "$SESSION_ID"
\`\`\`
```

**Step 3: 添加代码生成模板**

```
### 前端代码注入

AI 生成以下格式的代码：

\`\`\`javascript
fetch('http://localhost:PORT',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    sessionId:'SESSION_ID',
    time:TIME,
    type:'TYPE',
    data:DATA
  })
}).catch(()=>{})
\`\`\`

简化为单行：
\`\`\`javascript
fetch('http://localhost:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SID',time:'TIME',type:'TYPE',data:DATA})}).catch(()=>{})
\`\`\`
```

**Step 4: 提交**

```bash
git add skills/dev-log/SKILL.md
git commit -m "docs: add implementation details to SKILL.md"
```

---

### Task 6: 添加 .gitignore 规则

**文件:**
- 修改: `.gitignore`

**Step 1: 添加 dev-log 运行时文件**

```bash
# Dev log runtime files
skills/dev-log/pid.txt
skills/dev-log/port.txt
skills/dev-log/dev-logs.json
```

**Step 2: 验证忽略规则**

```bash
git check-ignore skills/dev-log/pid.txt
```

预期: 输出文件路径（表示被忽略）

**Step 3: 提交**

```bash
git add .gitignore
git commit -m "chore: ignore dev-log runtime files"
```

---

### Task 7: 集成测试

**Step 1: 完整流程测试**

模拟 AI 使用场景：

```bash
# 1. 启动服务
cd skills/dev-log && ./start.sh

# 2. 获取端口
PORT=$(cat port.txt)

# 3. 模拟 AI 生成 sessionId
SESSION_ID=$(date +%s%N | base64 | head -c 8)

# 4. 模拟发送日志
curl -X POST "http://localhost:$PORT" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"time\":\"12:00:00.123\",\"type\":\"state\",\"data\":{\"count\":0}}"

# 5. 读取日志
./read-log.sh "$SESSION_ID"

# 6. 清理
kill $(cat pid.txt)
rm -f pid.txt port.txt dev-logs.json
```

预期: 能读取到刚才发送的日志

**Step 7: 提交（如有修改）**

```bash
# 如果需要修复任何问题
git add -A
git commit -m "fix: resolve integration test issues"
```

---

## 验收标准

完成所有任务后：

1. ✅ `skills/dev-log/SKILL.md` 符合规范，包含完整示例
2. ✅ `skills/dev-log/server.js` 可独立运行
3. ✅ `skills/dev-log/start.sh` 能检查和启动服务
4. ✅ `skills/dev-log/read-log.sh` 能读取和过滤日志
5. ✅ 运行时文件（pid.txt, port.txt, dev-logs.json）被 git 忽略
6. ✅ 完整流程测试通过

## 使用示例

AI 激活技能后的典型对话：

```
User: 帮我调试这个组件

Agent: [启动 dev-log 服务]
服务已启动，端口: 54321

[生成带日志的代码]

User: 操作完成了

Agent: [读取日志]
日志显示:
{"sessionId":"abc123","time":"14:23:05.123","type":"state","data":{"count":0}}

根据日志分析，问题是...
```
