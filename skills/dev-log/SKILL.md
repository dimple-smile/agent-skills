---
name: dev-log
description: AI 调试协作方案。将 console.log 转为 HTTP 请求收集日志，用户操作完成后 AI 可自行查看分析，无需截图或复制控制台。支持 Claude Code、OpenCode、Cursor。
version: 2.0.0
tags:
  - debugging
  - frontend
  - developer-tools
---

# Dev Log

将前端代码的 console.log 输出通过 HTTP 接口实时发送，让 AI 能够自动获取运行时日志，无需用户手动复制控制台内容。

**核心理念：** 大多数 console.log 都是为了让 AI 查看结果，因此应该默认使用 dev-log 方式，除非是非常简单的临时调试。

## When to Use

**AI 应该主动判断并使用此技能的情况：**

1. **生成前端代码时** - 如果生成的代码可能需要调试/验证，默认使用 dev-log 收集日志
2. **用户说"帮我调试"、"有问题"、"看看为什么"** - 需要查看运行时状态时
3. **需要追踪异步流程** - fetch、Promise、async/await 的执行过程
4. **需要验证逻辑** - 表单验证、状态更新、条件判断等
5. **需要查看变量值** - 特别是动态生成或用户输入的值
6. **用户说"操作完成了"、"你看下"、"好了"** - 提示用户已完成操作，AI 应该读取日志

**不需要使用的情况：**
- 纯静态内容生成（如 HTML 模板）
- 非常简单的一次性验证
- 用户明确表示不需要调试
- 代码完全是后端的（Node.js 服务端）

## 服务启动

**启动命令：**
```bash
cd skills/dev-log && ./start.sh
```

**带内网穿透启动：**
```bash
cd skills/dev-log && node server.cjs --tunnel
```

启动脚本会自动：
1. 检查现有服务状态（读取 `port.txt` 并测试连接）
2. 如果服务正常运行，则复用现有服务
3. 如果服务异常或不存在，则启动新服务
4. 同时启动 HTTP 和 HTTPS 服务
5. 可选启动内网穿透（`--tunnel` 参数）

**启动输出示例：**
```
========================================
Dev-log server is running
========================================

Available addresses:
  Local:   http://localhost:54321
  Network: http://192.168.1.100:54321
  HTTPS:   https://localhost:54322
  Tunnel:  https://abc123.loca.lt

Note: HTTPS uses self-signed certificate.
      First visit will show a security warning - click "Continue" to proceed.
========================================
```

**文件结构：**
```
./skills/dev-log/
├── server.cjs       # HTTP 服务器（CommonJS 模块）
├── start.sh         # 启动脚本（检查/启动服务）
├── read-log.sh      # 读取日志脚本（支持过滤）
├── SKILL.md         # 本文件
├── pid.txt          # 服务进程 ID
├── port.txt         # HTTP 端口
├── https-port.txt   # HTTPS 端口
├── tunnel-url.txt   # 内网穿透地址（可选）
└── dev-logs.json    # 日志文件（JSON 格式）
```

## 地址选择指南

| 用户场景 | 使用地址 | 说明 |
|----------|----------|------|
| 本地浏览器 HTTP 页面 | `http://localhost:PORT` | 默认选择 |
| 本地浏览器 HTTPS 页面 | `https://localhost:PORT` | 避免 Mixed Content |
| 手机/平板（同一 WiFi） | `http://IP:PORT` | 使用 Network IP |
| 手机/平板（不同网络） | Tunnel 地址 | 需启动内网穿透 |
| 远程服务器 / 虚拟机 | Tunnel 地址 | 需启动内网穿透 |

## 代码生成规范

### 1. 必须注入 `__ready__` 探测日志

每次生成日志代码时，**必须**先注入一条 `__ready__` 探测日志，用于判断网络连通性：

```javascript
// 探测日志 - 页面加载/组件挂载时立即执行
fetch('http://localhost:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'__ready__',data:{url:location.href,protocol:location.protocol}})}).catch(()=>{})
```

**探测日志的作用：**
- 如果收到 `__ready__` → 网络连接正常
- 如果没收到 `__ready__` → 网络问题，需要换地址

### 2. 然后注入业务日志

```javascript
// 业务日志 - 事件触发时执行
fetch('http://localhost:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'LOG_TYPE',data:DATA})}).catch(()=>{})
```

## 多语言模板

### JavaScript (Web)

**探测日志：**
```javascript
fetch('http://localhost:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'__ready__',data:{url:location.href,protocol:location.protocol}})}).catch(()=>{})
```

**业务日志：**
```javascript
fetch('http://localhost:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'LOG_TYPE',data:DATA})}).catch(()=>{})
```

### Python

**探测日志：**
```python
import urllib.request, json
urllib.request.urlopen(urllib.request.Request('http://localhost:PORT', data=json.dumps({'sessionId':'SESSION_ID','time':'TIME','type':'__ready__','data':{'url':'','protocol':''}}).encode(), headers={'Content-Type':'application/json'}))
```

**业务日志：**
```python
import urllib.request, json
urllib.request.urlopen(urllib.request.Request('http://localhost:PORT', data=json.dumps({'sessionId':'SESSION_ID','time':'TIME','type':'LOG_TYPE','data':DATA}).encode(), headers={'Content-Type':'application/json'}))
```

### Swift (iOS)

**业务日志：**
```swift
var request = URLRequest(url: URL(string: "http://localhost:PORT")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONSerialization.data(withJSONObject: ["sessionId":"SESSION_ID","time":"TIME","type":"LOG_TYPE","data":DATA])
URLSession.shared.dataTask(with: request).resume()
```

### Kotlin (Android)

**业务日志：**
```kotlin
import okhttp3.*
val client = OkHttpClient()
val body = "{\"sessionId\":\"SESSION_ID\",\"time\":\"TIME\",\"type\":\"LOG_TYPE\",\"data\":DATA}".toRequestBody("application/json".toMediaType())
val request = Request.Builder().url("http://localhost:PORT").post(body).build()
client.newCall(request).execute()
```

### Go

**业务日志：**
```go
import (
    "bytes"
    "net/http"
)
body := bytes.NewBuffer([]byte(`{"sessionId":"SESSION_ID","time":"TIME","type":"LOG_TYPE","data":DATA}`))
http.Post("http://localhost:PORT", "application/json", body)
```

### Dart (Flutter)

**业务日志：**
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
await http.post(
  Uri.parse('http://localhost:PORT'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'sessionId':'SESSION_ID','time':'TIME','type':'LOG_TYPE','data':DATA}),
);
```

## 模板变量说明

- `PORT`: 从 `skills/dev-log/port.txt`（HTTP）或 `https-port.txt`（HTTPS）读取的端口号
- `SESSION_ID`: AI 生成的会话 ID（格式：`sess_` + 8位随机字符）
- `TIME`: 时间戳（如 `14:23:05` 或 `new Date().toTimeString().split(' ')[0]`）
- `LOG_TYPE`: 日志类型（建议：`state`/`error`/`validation`/`request`/`response`/`click` 等）
- `DATA`: 要记录的任意数据对象

## 日志读取

**读取所有日志：**
```bash
./skills/dev-log/read-log.sh
```

**按 sessionId 过滤日志：**
```bash
./skills/dev-log/read-log.sh "$SESSION_ID"
```

## 诊断流程

### Step 1: 读取日志

用户说"操作完成了"后，AI 读取日志。

### Step 2: 判断情况

```
┌─────────────────────────────────────────────────────────────┐
│ 有 __ready__ 日志？                                          │
├─────────────────────────────────────────────────────────────┤
│ ✅ 有 → 网络连接正常                                          │
│         有业务日志？                                          │
│         ├─ 有 → 分析日志，解决问题                            │
│         └─ 无 → 代码未执行                                    │
│              → 确认用户是否真的操作了                          │
│              → 检查事件绑定、触发条件是否正确                    │
│                                                             │
│ ❌ 没有 → 网络问题，直接让用户确认场景：                        │
│                                                             │
│   "没有收到日志，请确认你的访问场景：                           │
│                                                             │
│    A. 本地浏览器 HTTP 页面                                    │
│    B. 本地浏览器 HTTPS 页面                                   │
│    C. 手机/平板（同一 WiFi）                                  │
│    D. 手机/平板（不同网络）                                   │
│    E. 远程服务器 / 虚拟机"                                    │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: 根据场景换地址

| 场景 | 当前地址 | 换成 |
|------|----------|------|
| A | localhost | 刷新页面重试 |
| B | http://localhost | https://localhost |
| C | localhost | Network IP（如 http://192.168.1.100:PORT） |
| D | localhost | Tunnel 地址（需先启动 `--tunnel`） |
| E | localhost | Tunnel 地址（需先启动 `--tunnel`） |

**换地址时清晰展示：**
```
修改前：fetch('http://localhost:54321', {...})
修改后：fetch('http://192.168.1.100:54321', {...})
原因：手机无法访问 localhost，需要使用本机 IP
```

## 完整使用流程

1. **AI 判断需要调试** → 自动启动 dev-log 技能
2. **检查/启动服务** → `./start.sh`
3. **生成 sessionId** → 在内存中记住，格式 `sess_xxxxxxxxx`
4. **读取端口号** → 从 `port.txt` 获取
5. **注入探测日志** → `__ready__` 类型
6. **注入业务日志** → 在关键位置插入 fetch 语句
7. **提示用户操作** → "请操作一下，然后告诉我结果"
8. **用户告知完成** → "好了"、"操作完成了"
9. **读取并分析日志** → 按 sessionId 过滤，按诊断流程处理
10. **如无日志** → 按诊断流程排查

## API 端点

- `GET /` - 查看服务运行状态和可用地址
- `POST /` 或 `POST /logs` - 提交日志
- `GET /logs` - 获取所有日志
- `GET /health` - 健康检查

## 注意事项

1. **默认使用** - 生成前端代码时默认考虑使用 dev-log，除非非常简单
2. **必须注入探测日志** - 用于判断是网络问题还是代码未执行
3. **生产环境** - 务必移除调试代码
4. **错误处理** - fetch 必须加 `.catch(()=>{})` 避免阻塞主逻辑
5. **HTTPS 证书** - 自签名证书首次访问会有警告，点击继续即可
6. **本地开发** - 仅用于本地开发，不要暴露到公网
