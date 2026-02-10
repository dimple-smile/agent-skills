# Dev Log Skill 设计文档

## 概述

Dev Log 是一个 Agent Skill，用于解决 AI 调试前端代码时需要用户手动复制控制台日志的痛点。通过启动本地日志服务，将 console.log 转为 HTTP 请求，让 AI 能够自动获取运行时日志。

## 核心问题

在使用 AI 生成前端代码时，调试或确认效果需要 console.log，但输出语句只能在运行后由用户手动打开控制台复制结果给 AI 查看，效率很低。

## 解决方案

1. 启动一个本地 Node.js HTTP 服务接收日志
2. 将 console.log 改为 fetch 请求发送到服务接口
3. AI 可自行查看日志，无需用户手动复制

## 架构设计

### 三大组件

| 组件 | 说明 |
|------|------|
| 日志服务器 | Node.js HTTP 服务器，随机端口，后台运行 |
| 日志发送器 | 单行 fetch 语句，插入到用户代码中 |
| 日志读取器 | 读取 dev-logs.json 文件，按 sessionId 过滤 |

### 文件结构

```
./
├── pid.txt          # 服务进程 ID
├── port.txt         # 服务端口
└── dev-logs.json    # 日志文件（每行一个 JSON）
```

## 技术细节

### 端口分配

使用 `server.listen(0)` 获取随机可用端口，避免端口冲突。

### 进程管理

- 启动后将 PID 写入 `pid.txt`
- 启动前检查 `pid.txt`，如果存在则先关闭旧进程
- 使用 curl 测试现有服务是否正常，正常则复用

### 日志格式

每行一个 JSON（JSONL 格式）：

```json
{"sessionId":"abc123","time":"14:23:05.123","type":"state","data":{"count":0}}
```

字段说明：
- `sessionId`: 会话 ID，AI 内存中生成和记忆
- `time`: 时间戳，格式 HH:mm:ss.SSS
- `type`: 日志类型标签（如 state/user/error）
- `data`: 日志数据，任意可序列化内容

### 代码注入规则

AI 在需要调试的语句**下一行**插入 fetch：

```javascript
// 原代码
const result = calculate(x, y);

// 修改后
const result = calculate(x, y);
fetch('http://localhost:54321',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    sessionId:'SESSION_ID',
    time:TIME,
    type:'TYPE',
    data:DATA
  })
}).catch(()=>{})
```

简化为单行：

```javascript
fetch('http://localhost:PORT',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'SID',time:'TIME',type:'TYPE',data:DATA})}).catch(()=>{})
```

### 日志清除时机

1. 新一轮调试开始时
2. 用户明确要求时

### 多会话隔离

- 每个 AI 会话有独立的 sessionId（内存中）
- 日志都写入同一个 `dev-logs.json`
- AI 读取日志时用自己的 sessionId 过滤
- 如果 AI "忘记" sessionId，根据时间戳推断最近的日志

## 完整使用流程

1. AI 激活技能
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

## 服务端实现

### 单行启动脚本逻辑

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

### 服务检查逻辑

```bash
# 测试现有服务
if [ -f port.txt ]; then
  curl -s http://localhost:$(cat port.txt) > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "服务正常"
  else
    echo "服务异常，重启"
  fi
fi
```

## 注意事项

1. **端口冲突**: 使用随机端口避免
2. **CORS**: 本地开发通常无跨域问题
3. **性能**: 生产环境务必移除此调试代码
4. **安全性**: 仅用于本地开发，不要暴露到公网
5. **错误处理**: fetch 请求必须加 `.catch(()=>{})` 避免阻塞

## 设计依据

根据 2024-2025 年最佳实践研究，JSON 是 AI/LLM 应用的最佳日志格式：
- 普遍可解析
- 工具支持好（ELK、Splunk、structlog）
- LLM 友好
- 易于查询分析

参考资料：
- [LLM Output Formats: Why JSON Costs More Than TSV](https://david-gilbertson.medium.com/llm-output-formats-why-json-costs-more-than-tsv-ebaf590bd541)
- [How to Use LLMs for Log File Analysis](https://www.splunk.com/en_us/blog/learn/log-file-analysis-llms.html)
- [JSON Logging Best Practices - Loggly](https://www.loggly.com/use-cases/json-logging-best-practices/)
