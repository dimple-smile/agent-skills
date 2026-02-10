---
name: dev-log
description: 通过本地 HTTP 服务自动获取前端运行时日志。当 AI 需要调试前端代码、查看变量值、追踪执行流程或验证功能效果时使用。
version: 1.0.0
tags:
  - debugging
  - frontend
  - developer-tools
---

# Dev Log

将前端代码的 console.log 输出通过 HTTP 接口实时发送，让 AI 能够自动获取运行时日志，无需用户手动复制控制台内容。

## When to Use

使用此技能的情况：
- AI 生成的前端代码需要调试时
- 需要查看运行时变量值或函数执行结果时
- 需要追踪代码执行流程时
- 需要验证前端逻辑是否按预期工作时
- 用户说"操作完成了"、"你看下结果"、"好了"等提示时

用户操作后，AI 应该主动读取日志文件查看结果，而不是等待用户手动提供。

## Examples

### Example 1: 代码调试场景

```markdown
User: 这个 React 组件的状态更新有问题，帮我调试一下

Agent: [uses dev-log skill]
我来帮你调试这个状态更新问题。首先让我启动日志服务，然后添加日志追踪状态变化。

[检查并启动日志服务]
[生成 sessionId: sess_abc123]
[清空日志文件]
[读取端口号: 54321]

现在我会在关键位置添加日志：
```javascript
const [count, setCount] = useState(0);

// 添加日志
fetch('http://localhost:54321',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    sessionId:'sess_abc123',
    time:'14:23:05.123',
    type:'state',
    data:{count,action:'before_setCount'}
  })
}).catch(()=>{})

setCount(1);
```

请操作一下，然后告诉我完成。

User: 好的，操作完成了

Agent: [读取 dev-logs.json，过滤 sessionId='sess_abc123']
从日志看到：
- 14:23:05.123 state: {count:0,action:'before_setCount'}
- 14:23:06.234 state: {count:1,action:'after_setCount'}
- 14:23:06.235 effect: useEffect triggered

我发现 useEffect 依赖项可能有问题...
```

### Example 2: 验证功能效果

```markdown
User: 帮我写一个表单验证，我需要确认验证逻辑是否正确

Agent: [uses dev-log skill]
好的，我会添加日志来记录验证过程，确保你能看到验证结果。

[启动日志服务，生成 sessionId]
[读取端口号: 54321]

这是带验证日志的表单代码：
```javascript
const validateForm = (data) => {
  const results = {};

  // 邮箱验证
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  fetch('http://localhost:54321',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'sess_xyz789',
      time:new Date().toTimeString().split(' ')[0],
      type:'validation',
      data:{field:'email',value:data.email,valid:emailValid}
    })
  }).catch(()=>{});
  results.email = emailValid;

  // 密码验证
  const passwordValid = data.password.length >= 8;
  fetch('http://localhost:54321',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'sess_xyz789',
      time:new Date().toTimeString().split(' ')[0],
      type:'validation',
      data:{field:'password',length:data.password.length,valid:passwordValid}
    })
  }).catch(()=>{});
  results.password = passwordValid;

  return results;
};
```

你操作完告诉我一声，我来查看验证日志。

User: 操作完了

Agent: [读取并过滤日志]
日志显示验证结果：
- 14:25:10.123 validation: {field:'email',value:'test@example.com',valid:true}
- 14:25:10.124 validation: {field:'password',length:5,valid:false}

从日志看，密码验证失败了，因为长度只有5位，需要至少8位。需要调整验证提示...
```

### Example 3: 追踪异步流程

```markdown
User: 这个数据请求的流程有问题，帮我看看

Agent: [uses dev-log skill]
我来添加请求流程的日志追踪，找出问题所在。

[启动日志服务，生成 sessionId]
[读取端口号]

这是带请求追踪的代码：
```javascript
useEffect(() => {
  fetch('http://localhost:54321',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'sess_flow123',
      time:new Date().toTimeString().split(' ')[0],
      type:'request',
      data:{step:'start',url:'/api/data'}
    })
  }).catch(()=>{});

  fetch('/api/data')
    .then(res => {
      fetch('http://localhost:54321',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'sess_flow123',
          time:new Date().toTimeString().split(' ')[0],
          type:'response',
          data:{step:'received',status:res.status}
        })
      }).catch(()=>{});
      return res.json();
    })
    .then(data => {
      fetch('http://localhost:54321',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'sess_flow123',
          time:new Date().toTimeString().split(' ')[0],
          type:'parsed',
          data:{step:'parsed',success:true}
        })
      }).catch(()=>{});
      setData(data);
    })
    .catch(err => {
      fetch('http://localhost:54321',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'sess_flow123',
          time:new Date().toTimeString().split(' ')[0],
          type:'error',
          data:{step:'error',message:err.message}
        })
      }).catch(()=>{});
    });
}, []);
```

User: 完成

Agent: [读取并过滤日志]
日志显示请求链路：
- 14:30:01.100 request: {step:'start',url:'/api/data'}
- 14:30:01.450 response: {step:'received',status:200}
- 14:30:01.500 error: {step:'error',message:'Unexpected token < in JSON'}

问题找到了！API 返回状态 200，但响应不是 JSON 格式。可能是返回了 HTML 错误页面...
```

## Implementation

### 服务启动流程

1. **检查现有服务**
   ```bash
   if [ -f port.txt ]; then
     curl -s http://localhost:$(cat port.txt) > /dev/null 2>&1
     if [ $? -eq 0 ]; then
       echo "服务正常，复用现有服务"
     else
       echo "服务异常，需要重启"
     fi
   fi
   ```

2. **启动日志服务器**
   ```javascript
   const http=require('http'),fs=require('fs');
   // 1. 检查并杀掉旧进程
   const oldPid=fs.readFileSync('pid.txt','utf-8').trim();
   if(oldPid){try{process.kill(parseInt(oldPid));}catch(e){}}
   // 2. 创建服务器
   const logs=[];
   const server=http.createServer((req,res)=>{
     if(req.method==='POST'){
       let body='';
       req.on('data',c=>body+=c);
       req.on('end',()=>{
         logs.push(body);
         fs.appendFileSync('dev-logs.json',body+'\n');
         res.end('OK');
       });
     }else{
       res.end(logs.join('\n'));
     }
   });
   // 3. 启动并记录
   server.listen(0,()=>{
     const port=server.address().port;
     fs.writeFileSync('port.txt',port);
     fs.writeFileSync('pid.txt',process.pid);
     fs.writeFileSync('dev-logs.json','');
     console.log(`日志服务: http://localhost:${port}`);
   });
   ```

3. **文件结构**
   ```
   ./
   ├── pid.txt          # 服务进程 ID
   ├── port.txt         # 服务端口
   └── dev-logs.json    # 日志文件（JSONL 格式）
   ```

### 日志读取流程

1. **生成 sessionId**
   - AI 在内存中生成唯一 sessionId（如 `sess_abc123`）
   - 在整个调试会话中保持此 sessionId
   - 用于过滤日志，避免混淆不同会话的日志

2. **清空日志**
   - 新一轮调试开始时清空 `dev-logs.json`
   - 用户明确要求时也清空
   - 使用 `fs.writeFileSync('dev-logs.json', '')`

3. **读取端口号**
   ```bash
   cat port.txt
   ```

4. **读取并过滤日志**
   ```bash
   # 读取所有日志
   cat dev-logs.json

   # 过滤特定 sessionId 的日志
   grep "sessionId:'sess_abc123'" dev-logs.json
   ```

### 代码生成规则

在需要调试的语句**下一行**插入 fetch 请求：

```javascript
// 原代码
const result = calculate(x, y);

// 修改后
const result = calculate(x, y);
fetch('http://localhost:PORT',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    sessionId:'SESSION_ID',
    time:'TIME',
    type:'TYPE',
    data:DATA
  })
}).catch(()=>{})
```

简化为单行：

```javascript
fetch('http://localhost:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SID',time:'TIME',type:'TYPE',data:DATA})}).catch(()=>{})
```

### 日志格式

每行一个 JSON（JSONL 格式）：

```json
{"sessionId":"abc123","time":"14:23:05.123","type":"state","data":{"count":0}}
```

字段说明：
- `sessionId`: 会话 ID，AI 内存中生成和记忆
- `time`: 时间戳，格式 HH:mm:ss.SSS
- `type`: 日志类型标签（如 state/user/error/validation/request/response）
- `data`: 日志数据，任意可序列化内容

### 完整使用流程

1. AI 检测到需要调试 → 启动 dev-log 技能
2. AI 检查/启动服务
   - 读取 `port.txt`，尝试 curl 测试
   - 如果失败，启动新服务
3. AI 生成 sessionId（内存中）
4. AI 清空日志（新一轮调试）
5. AI 读取端口号
6. AI 生成带日志的代码
7. 用户执行操作
8. 用户告知"完成"
9. AI 读取 `dev-logs.json`，按 sessionId 过滤
10. AI 分析日志并给出结论

### 多会话隔离

- 每个 AI 会话有独立的 sessionId（内存中）
- 日志都写入同一个 `dev-logs.json`
- AI 读取日志时用自己的 sessionId 过滤
- 如果 AI "忘记" sessionId，根据时间戳推断最近的日志

### 注意事项

1. **端口冲突**: 使用 `server.listen(0)` 获取随机可用端口，避免冲突
2. **CORS**: 本地开发通常无跨域问题
3. **性能**: 生产环境务必移除此调试代码
4. **安全性**: 仅用于本地开发，不要暴露到公网
5. **错误处理**: fetch 请求必须加 `.catch(()=>{})` 避免阻塞
6. **进程管理**: 启动前检查 `pid.txt`，如果存在则先关闭旧进程
