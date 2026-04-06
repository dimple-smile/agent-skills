---
name: dev-log
description: AI debugging collaboration solution. Collects runtime logs via HTTP requests, allowing AI to automatically analyze logs after user operations - no screenshots or console copying needed. Supports 14 languages including JavaScript, Python, Go, Swift, Kotlin, and more.
version: 2.0.0
tags:
  - debugging
  - frontend
  - developer-tools
---

# Dev Log

Send runtime logs via HTTP requests in real time, enabling AI to automatically retrieve and analyze them — no need for users to manually copy console output.

## When to Use

**The AI should proactively identify and use this skill when:**

1. **Generating frontend code** - If the generated code may need debugging/verification, use dev-log by default for log collection
2. **User says "help me debug", "something's wrong", "check why"** - Need to inspect runtime state
3. **Need to trace async flows** - Execution flow of fetch, Promise, async/await
4. **Need to validate logic** - Form validation, state updates, conditional checks, etc.
5. **Need to view variable values** - Especially dynamically generated or user-input values
6. **User says "done", "take a look", "ready"** - User has completed the operation, AI should read the logs

**When NOT to use:**
- Pure static content generation (e.g., HTML templates)
- Very simple one-time verification
- User explicitly states no debugging needed
- Code is entirely backend (Node.js server-side)

## Starting the Server

**Start command:**
```bash
cd skills/dev-log && node dist/index.cjs
```

The service will automatically:
1. Start an HTTP server (random port)
2. Start a local tunnel
3. Print available addresses

**Example startup output:**
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

## Address Selection Guide

| Scenario | Address to Use | Notes |
|----------|---------------|-------|
| Local HTTP page | `http://localhost:PORT` | Local address |
| Mobile/Tablet (same WiFi) | `http://IP:PORT` | Network address |
| Local HTTPS page | `https://xxx.loca.lt` | Tunnel address (HTTPS included) |
| Mobile/Tablet (different network) | `https://xxx.loca.lt` | Tunnel address |
| Remote server / VM | `https://xxx.loca.lt` | Tunnel address |

## Reading Logs

**Read all logs:**
```bash
curl http://localhost:PORT/logs
```

**Filter by sessionId:**
```bash
curl "http://localhost:PORT/logs?sessionId=sess_xxx"
```

## Code Generation Rules

### 1. Must inject `__ready__` probe log

Every time log code is generated, a `__ready__` probe log **must** be injected first to determine network connectivity:

```javascript
fetch('HOST:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'__ready__',data:{url:location.href,protocol:location.protocol}})}).catch(()=>{})
```

### 2. Then inject business logs

```javascript
fetch('HOST:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'LOG_TYPE',data:DATA})}).catch(()=>{})
```

## Multi-Language Templates

### JavaScript (Web)

**Probe log:**
```javascript
fetch('HOST:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SESSION_ID',time:new Date().toTimeString().split(' ')[0],type:'__ready__',data:{url:location.href,protocol:location.protocol}})}).catch(()=>{})
```

**Business log:**
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

## Template Variable Reference

- `HOST`: Server address, choose based on scenario:
  - Local HTTP page → `http://localhost`
  - Mobile/Tablet (same WiFi) → Network IP (e.g., `http://192.168.1.100`, displayed at server startup)
  - HTTPS page / Remote → Tunnel address (read from `skills/dev-log/dist/tunnel-url.txt`)
- `PORT`: Read from `skills/dev-log/dist/port.txt`
- `SESSION_ID`: AI-generated session ID (format: `sess_` + 8 random characters)
- `TIME`: Timestamp (e.g., `14:23:05` or `new Date().toTimeString().split(' ')[0]`)
- `LOG_TYPE`: Log type (recommended: `state`/`error`/`validation`/`request`/`response`/`click`, etc.)
- `DATA`: Any data object to log (**must filter sensitive information**)

## Diagnostic Flow

### Step 1: Read Logs

After the user says "operation complete", the AI reads logs via HTTP:
```bash
curl "http://localhost:PORT/logs?sessionId=sess_xxx"
```

### Step 2: Assess the Situation

```
┌─────────────────────────────────────────────────────────────┐
│ Is there a __ready__ log?                                    │
├─────────────────────────────────────────────────────────────┤
│ ✅ Yes → Network connection is normal                        │
│         Are there business logs?                             │
│         ├─ Yes → Analyze logs, solve the problem             │
│         └─ No  → Code didn't execute                         │
│              → Confirm user actually performed the operation  │
│              → Check event bindings, trigger conditions       │
│                                                              │
│ ❌ No  → Network issue, ask user to confirm scenario:        │
│                                                              │
│   "No logs received. Please confirm your access scenario:    │
│                                                              │
│    A. Local browser HTTP page                                │
│    B. Local browser HTTPS page                               │
│    C. Mobile/Tablet (same WiFi)                              │
│    D. Mobile/Tablet (different network) / Remote server"     │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Switch Address Based on Scenario

| Scenario | Current Address | Switch To |
|----------|----------------|-----------|
| A | localhost | Refresh page and retry |
| B | http://localhost | Tunnel address (HTTPS included) |
| C | localhost | Network IP |
| D | localhost | Tunnel address |

**When switching addresses, show clearly:**
```
Before: fetch('http://localhost:PORT', {...})
After:  fetch('https://xxx.loca.lt', {...})
Reason: HTTPS page cannot request HTTP, using Tunnel address
```

**Note: No need to restart the server** — all addresses are already available from server startup.

## API Endpoints

- `GET /` - View server status and available addresses
- `POST /` or `POST /logs` - Submit logs
- `GET /logs` - Get all logs (optional `?sessionId=xxx` filter)
- `DELETE /logs` - Clear all logs
- `DELETE /logs?sessionId=xxx` - Clear logs for a specific session
- `GET /health` - Health check

## Log Cleanup

**Clear all logs:**
```bash
curl -X DELETE http://localhost:PORT/logs
```

**Clear logs for a specific session:**
```bash
curl -X DELETE "http://localhost:PORT/logs?sessionId=sess_xxx"
```

> Tip: Clear old logs before starting a new debugging session to avoid confusion.

## Security Warning ⚠️

**Sensitive Data Protection (Important):**
- **Never log sensitive information**: passwords, tokens, API keys, credit card numbers, ID numbers, etc.
- When AI generates log code, it **must automatically filter sensitive fields**, replacing them with `***` or `REDACTED`

**Sensitive field auto-filter rules:**
```javascript
// ❌ Wrong - logging form data that may contain sensitive information
fetch('...', {body:JSON.stringify({data:{password:form.password.value}})})

// ✅ Correct - filter sensitive fields before logging
const sanitize = (obj) => {
  const sensitive = ['password','pwd','token','secret','key','credit','ssn','apikey'];
  const safe = {...obj};
  for (const k of Object.keys(safe)) {
    if (sensitive.some(s => k.toLowerCase().includes(s))) safe[k] = '***';
  }
  return safe;
};
fetch('...', {body:JSON.stringify({data:sanitize({email, password})})})
// Result: {data:{email:'user@example.com', password:'***'}}
```

**Sensitive field names that must be filtered (case-insensitive):**
- `password`, `pwd`, `pass`
- `token`, `access_token`, `refresh_token`, `auth`
- `secret`, `api_key`, `apikey`, `key`
- `credit_card`, `card_number`, `cvv`
- `ssn`, `id_number`, `passport`

## Notes

1. **Sensitive data** - **Must filter sensitive fields**; never log passwords, tokens, etc.
2. **Must inject probe log** - Used to determine whether it's a network issue or code not executing
3. **Production environment** - Always remove debugging code
4. **Error handling** - fetch must include `.catch(()=>{})` to avoid blocking main logic
5. **Local development** - Only for local development; do not expose to the public internet
