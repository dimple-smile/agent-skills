/**
 * Dev-log JavaScript 测试
 * 测试 HTTP 请求 + __ready__ 探测
 */

const PORT = process.env.PORT || '3000';
const HOST = process.env.HOST || 'host.docker.internal';
const SESSION_ID = 'sess_js_' + Math.random().toString(36).slice(2, 10);

async function sendLog(type, data) {
  const body = JSON.stringify({
    sessionId: SESSION_ID,
    time: new Date().toTimeString().split(' ')[0],
    type,
    data
  });

  try {
    const res = await fetch(`http://${HOST}:${PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    return res.ok;
  } catch (e) {
    console.error('❌ 发送失败:', e.message);
    return false;
  }
}

async function main() {
  console.log(`=== JavaScript 测试 (PORT=${PORT}) ===\n`);

  // 1. 探测日志
  const ready = await sendLog('__ready__', { runtime: 'node', url: 'docker://js' });
  if (!ready) {
    console.error('❌ 探测失败，无法连接 dev-log 服务');
    process.exit(1);
  }
  console.log('✅ 探测成功');

  // 2. 业务日志
  await sendLog('state', { count: 0, message: '初始化' });
  console.log('✅ 业务日志发送成功');

  console.log(`\n✅ JavaScript 测试通过 (sessionId: ${SESSION_ID})`);
}

main().catch(e => { console.error('❌ 测试失败:', e); process.exit(1); });
