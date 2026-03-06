---
name: dev-log
description: AI 调试协作方案。将运行时日志通过 HTTP 请求实时收集，用户操作完成后 AI 可自行查看分析，无需截图或复制控制台。支持 JavaScript、Python、Go、Swift、Kotlin 等 14 种语言。
version: 2.0.0
tags:
  - debugging
  - frontend
  - developer-tools
---

# Dev Log

将运行时日志通过 HTTP 请求实时发送，让 AI 能够自动获取并分析，无需用户手动复制控制台内容。

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
cd skills/dev-log && node dist/index.cjs
```

服务会自动：
1. 启动 HTTP 服务（随机端口）
2. 启动内网穿透（Tunnel）
3. 打印可用地址

**启动输出示例：**
```
========================================
Dev-log server is running
========================================

Available addresses:
  Local:   http://localhost:54321
  Network: http://192.168.1.100:54321
  Tunnel:  https://abc123.loca.lt

Usage:
  - Local HTTP page: use Local address
  - Mobile (same WiFi): use Network address
  - HTTPS page / Remote: use Tunnel address
========================================
```

## 地址选择指南

| 场景 | 使用地址 | 说明 |
|------|----------|------|
| 本地 HTTP 页面 | `http://localhost:PORT` | Local 地址 |
| 手机/平板（同一 WiFi） | `http://IP:PORT` | Network 地址 |
| 本地 HTTPS 页面 | `https://xxx.loca.lt` | Tunnel 地址（自带 HTTPS） |
| 手机/平板（不同网络） | `https://xxx.loca.lt` | Tunnel 地址 |
| 远程服务器 / 虚拟机 | `https://xxx.loca.lt` | Tunnel 地址 |

## 读取日志

**读取所有日志：**
```bash
curl http://localhost:PORT/logs
```

**按 sessionId 过滤：**
```bash
curl "http://localhost:PORT/logs?sessionId=sess_xxx"
```

## 代码生成规范

### 1. 必须注入 `__ready__` 探测日志

每次生成日志代码时，**必须**先注入一条 `__ready__` 探测日志，用于判断网络连通性：

```javascript
fetch('HOST:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'__ready__',data:{url:location.href,protocol:location.protocol}})}).catch(()=>{})
```

### 2. 然后注入业务日志

```javascript
fetch('HOST:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'LOG_TYPE',data:DATA})}).catch(()=>{})
```

## 多语言模板

### JavaScript (Web)

**探测日志：**
```javascript
fetch('HOST:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'__ready__',data:{url:location.href,protocol:location.protocol}})}).catch(()=>{})
```

**业务日志：**
```javascript
fetch('HOST:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'LOG_TYPE',data:DATA})}).catch(()=>{})
```

### Python

```python
import urllib.request, json
urllib.request.urlopen(urllib.request.Request('HOST:PORT', data=json.dumps({'sessionId':'SESSION_ID','time':'TIME','type':'LOG_TYPE','data':DATA}).encode(), headers={'Content-Type':'application/json'}))
```

### Swift (iOS)

```swift
var request = URLRequest(url: URL(string: "HOST:PORT")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONSerialization.data(withJSONObject: ["sessionId":"SESSION_ID","time":"TIME","type":"LOG_TYPE","data":DATA])
URLSession.shared.dataTask(with: request).resume()
```

### Kotlin (Android)

```kotlin
import okhttp3.*
val client = OkHttpClient()
val body = "{\"sessionId\":\"SESSION_ID\",\"time\":\"TIME\",\"type\":\"LOG_TYPE\",\"data\":DATA}".toRequestBody("application/json".toMediaType())
val request = Request.Builder().url("HOST:PORT").post(body).build()
client.newCall(request).execute()
```

### Go

```go
import (
    "bytes"
    "net/http"
)
body := bytes.NewBuffer([]byte(`{"sessionId":"SESSION_ID","time":"TIME","type":"LOG_TYPE","data":DATA}`))
http.Post("HOST:PORT", "application/json", body)
```

### Dart (Flutter)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
await http.post(
  Uri.parse('HOST:PORT'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'sessionId':'SESSION_ID','time':'TIME','type':'LOG_TYPE','data':DATA}),
);
```

### C++

```cpp
#include <curl/curl.h>
CURL* curl = curl_easy_init();
curl_easy_setopt(curl, CURLOPT_URL, "HOST:PORT");
curl_easy_setopt(curl, CURLOPT_POST, 1L);
curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"sessionId\":\"SESSION_ID\",\"time\":\"TIME\",\"type\":\"LOG_TYPE\",\"data\":DATA}");
struct curl_slist* headers = curl_slist_append(NULL, "Content-Type: application/json");
curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
curl_easy_perform(curl);
curl_easy_cleanup(curl);
```

### Rust

```rust
use reqwest::blocking::Client;
let client = Client::new();
let body = serde_json::json!({"sessionId":"SESSION_ID","time":"TIME","type":"LOG_TYPE","data":DATA});
client.post("HOST:PORT").json(&body).send();
```

### Java

```java
import java.net.*;
import java.net.http.*;
var client = HttpClient.newHttpClient();
var body = "{\"sessionId\":\"SESSION_ID\",\"time\":\"TIME\",\"type\":\"LOG_TYPE\",\"data\":DATA}";
var request = HttpRequest.newBuilder()
    .uri(URI.create("HOST:PORT"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();
client.send(request, HttpResponse.BodyHandlers.ofString());
```

### C#

```csharp
using System.Net.Http;
using System.Text.Json;
var client = new HttpClient();
var body = JsonSerializer.Serialize(new { sessionId = "SESSION_ID", time = "TIME", type = "LOG_TYPE", data = DATA });
await client.PostAsync("HOST:PORT", new StringContent(body, System.Text.Encoding.UTF8, "application/json"));
```

### PHP

```php
$ch = curl_init('HOST:PORT');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['sessionId'=>'SESSION_ID','time'=>'TIME','type'=>'LOG_TYPE','data'=>DATA]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_exec($ch);
curl_close($ch);
```

### Ruby

```ruby
require 'net/http'
require 'json'
uri = URI('HOST:PORT')
Net::HTTP.post(uri, {sessionId: 'SESSION_ID', time: 'TIME', type: 'LOG_TYPE', data: DATA}.to_json, 'Content-Type' => 'application/json')
```

## 模板变量说明

- `HOST`: 服务地址，根据场景选择：
  - 本地 HTTP 页面 → `http://localhost`
  - 手机/平板（同一 WiFi）→ Network IP（如 `http://192.168.1.100`，服务启动时显示）
  - HTTPS 页面/远程 → Tunnel 地址（从 `skills/dev-log/dist/tunnel-url.txt` 读取）
- `PORT`: 从 `skills/dev-log/dist/port.txt` 读取
- `SESSION_ID`: AI 生成的会话 ID（格式：`sess_` + 8位随机字符）
- `TIME`: 时间戳（如 `14:23:05` 或 `new Date().toTimeString().split(' ')[0]`）
- `LOG_TYPE`: 日志类型（建议：`state`/`error`/`validation`/`request`/`response`/`click` 等）
- `DATA`: 要记录的任意数据对象（**必须过滤敏感信息**）

## 诊断流程

### Step 1: 读取日志

用户说"操作完成了"后，AI 通过 HTTP 读取日志：
```bash
curl "http://localhost:PORT/logs?sessionId=sess_xxx"
```

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
│ ❌ 没有 → 网络问题，让用户确认场景：                           │
│                                                             │
│   "没有收到日志，请确认你的访问场景：                           │
│                                                             │
│    A. 本地浏览器 HTTP 页面                                    │
│    B. 本地浏览器 HTTPS 页面                                   │
│    C. 手机/平板（同一 WiFi）                                  │
│    D. 手机/平板（不同网络）/ 远程服务器"                       │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: 根据场景换地址

| 场景 | 当前地址 | 换成 |
|------|----------|------|
| A | localhost | 刷新页面重试 |
| B | http://localhost | Tunnel 地址（自带 HTTPS） |
| C | localhost | Network IP |
| D | localhost | Tunnel 地址 |

**换地址时清晰展示：**
```
修改前：fetch('http://localhost:PORT', {...})
修改后：fetch('https://xxx.loca.lt', {...})
原因：HTTPS 页面无法请求 HTTP，使用 Tunnel 地址
```

**注意：不需要重启服务**，因为服务启动时已经开启了所有地址。

## API 端点

- `GET /` - 查看服务运行状态和可用地址
- `POST /` 或 `POST /logs` - 提交日志
- `GET /logs` - 获取所有日志（可选 `?sessionId=xxx` 过滤）
- `DELETE /logs` - 清除所有日志
- `DELETE /logs?sessionId=xxx` - 清除特定会话的日志
- `GET /health` - 健康检查

## 日志清理

**清除所有日志：**
```bash
curl -X DELETE http://localhost:PORT/logs
```

**清除特定会话的日志：**
```bash
curl -X DELETE "http://localhost:PORT/logs?sessionId=sess_xxx"
```

> 建议：新一轮调试开始时，先清除旧日志避免混淆。

## 安全警告 ⚠️

**敏感数据保护（重要）：**
- **禁止记录敏感信息**：密码、token、API key、信用卡号、身份证号等
- AI 生成日志代码时，**必须自动过滤敏感字段**，使用 `***` 或 `REDACTED` 替代

**敏感字段自动过滤规则：**
```javascript
// ❌ 错误示例 - 直接记录可能包含敏感信息的表单数据
fetch('...', {body:JSON.stringify({data:{password:form.password.value}})})

// ✅ 正确示例 - 过滤敏感字段后再记录
const sanitize = (obj) => {
  const sensitive = ['password','pwd','token','secret','key','credit','ssn','apikey'];
  const safe = {...obj};
  for (const k of Object.keys(safe)) {
    if (sensitive.some(s => k.toLowerCase().includes(s))) safe[k] = '***';
  }
  return safe;
};
fetch('...', {body:JSON.stringify({data:sanitize({email, password})})})
// 结果: {data:{email:'user@example.com', password:'***'}}
```

**必须过滤的敏感字段名（不区分大小写）：**
- `password`, `pwd`, `pass`
- `token`, `access_token`, `refresh_token`, `auth`
- `secret`, `api_key`, `apikey`, `key`
- `credit_card`, `card_number`, `cvv`
- `ssn`, `id_number`, `passport`

## 注意事项

1. **敏感数据** - **必须过滤敏感字段**，禁止记录密码、token 等
2. **必须注入探测日志** - 用于判断是网络问题还是代码未执行
3. **生产环境** - 务必移除调试代码
4. **错误处理** - fetch 必须加 `.catch(()=>{})` 避免阻塞主逻辑
5. **本地开发** - 仅用于本地开发，不要暴露到公网
