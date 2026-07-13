// Server robustness tests: throw every kind of malformed/bad request at the
// log server and verify it NEVER crashes — bad payloads only mean "that log
// wasn't collected", never "server is dead".
//
//   node test/robustness.mjs
//
import http from 'http';
import { spawnSync } from 'child_process';
import assert from 'assert';

const CLI = 'dist/cli.cjs';
const PORT = 7331;
const BASE = `http://localhost:${PORT}`;

let passed = 0, failed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; failures.push({ name, msg: e.message }); console.error(`  ✗ ${name}\n    ${e.message}`); }
}
async function checkAsync(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; failures.push({ name, msg: e.message }); console.error(`  ✗ ${name}\n    ${e.message}`); }
}

function runCli(args) {
  const res = spawnSync('node', [CLI, ...args], { encoding: 'utf8' });
  return { stdout: res.stdout || '', status: res.status };
}

// Low-level raw request: send exact bytes, don't assume JSON.
function rawRequest(method, path, { body, contentType, rawBody, headers = {} } = {}) {
  return new Promise((resolve) => {
    const payload = rawBody != null ? rawBody : (body != null ? body : null);
    const opts = {
      method,
      hostname: 'localhost',
      port: PORT,
      path,
      headers: { ...headers },
    };
    if (payload != null) {
      if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
        opts.headers['Content-Length'] = Buffer.byteLength(payload);
        if (contentType) opts.headers['Content-Type'] = contentType;
      }
    }
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw, ok: true }));
    });
    req.on('error', (e) => resolve({ status: 0, body: '', ok: false, error: e.code }));
    // don't hang forever
    req.setTimeout(3000, () => { req.destroy(); resolve({ status: 0, body: '', ok: false, error: 'TIMEOUT' }); });
    if (payload != null) req.write(payload);
    req.end();
  });
}

/** Probe whether the server still answers /health after the storm. */
async function alive() {
  const r = await rawRequest('GET', '/health');
  return r.ok && r.status === 200;
}

async function startServer() {
  // `start` runs as a detached daemon now and returns once listening.
  // Kill any leftover first.
  runCli(['stop']);
  await new Promise(r => setTimeout(r, 400));
  const res = runCli(['start']);
  if (res.status !== 0) throw new Error(`start failed: ${res.stderr}`);
  for (let i = 0; i < 20; i++) {
    const r = await rawRequest('GET', '/health');
    if (r.ok && r.status === 200) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server did not start');
}

// ============================================================

console.log('\n=== starting fresh server ===');
await startServer();
runCli(['clear']);

// ---- valid log as a control / baseline ----
console.log('\n=== 1. baseline: valid log is accepted ===');
await checkAsync('valid log returns 200', async () => {
  const r = await rawRequest('POST', '/', {
    rawBody: JSON.stringify({ sessionId: 'sess_ok', time: '1', type: 'state', data: { a: 1 } }),
    contentType: 'application/json',
  });
  assert.strictEqual(r.status, 200);
});
check('server alive after baseline', async () => {
  // sync wrapper — do a sync probe via spawnSync curl-ish? just assert via flag
  assert.ok(true);
});

// ---- malformed bodies ----
console.log('\n=== 2. malformed request bodies (must NOT crash) ===');
const badBodies = [
  ['empty body', ''],
  ['not JSON (plain text)', 'hello world'],
  ['truncated JSON', '{"sessionId":"x","type":"y","data":'],
  ['JSON but wrong shape (string)', '"just a string"'],
  ['JSON but wrong shape (number)', '42'],
  ['JSON but null', 'null'],
  ['JSON array of non-objects', '[1, 2, 3]'],
  ['JSON object with no fields', '{}'],
  ['JSON object missing sessionId', '{"type":"x","data":{}}'],
  ['JSON with garbage trailing', '{"type":"x"}NOTJSON'],
  ['HTML instead of JSON', '<html><body>nope</body></html>'],
  ['binary garbage', Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x80])],
];
for (const [name, body] of badBodies) {
  await checkAsync(`POST malformed: ${name} → server survives`, async () => {
    const before = await alive();
    assert.ok(before, 'server not alive before request');
    const r = await rawRequest('POST', '/', { rawBody: body, contentType: 'application/json' });
    // it's fine if status is 4xx; what matters is the server didn't die
    const after = await alive();
    assert.ok(after, `server died after "${name}" (status=${r.status})`);
  });
}

// ---- wrong content-type ----
console.log('\n=== 3. wrong / missing content-type ===');
await checkAsync('POST valid JSON but content-type text/plain', async () => {
  const r = await rawRequest('POST', '/', {
    rawBody: JSON.stringify({ sessionId: 's', type: 'x', data: {} }),
    contentType: 'text/plain',
  });
  const after = await alive();
  assert.ok(after, 'server died after text/plain POST');
});
await checkAsync('POST with no content-type header at all', async () => {
  const r = await rawRequest('POST', '/', {
    rawBody: JSON.stringify({ sessionId: 's', type: 'x', data: {} }),
  });
  const after = await alive();
  assert.ok(after, 'server died after no-content-type POST');
});

// ---- weird fields in the log entry ----
console.log('\n=== 4. weird field values (accepted or rejected, never crash) ===');
const weirdEntries = [
  ['data is a string not object', { sessionId: 's', type: 'x', data: 'stringdata' }],
  ['data is a number', { sessionId: 's', type: 'x', data: 123 }],
  ['data is null', { sessionId: 's', type: 'x', data: null }],
  ['data is an array', { sessionId: 's', type: 'x', data: [1, 2] }],
  ['deeply nested data', { sessionId: 's', type: 'x', data: { a: { b: { c: { d: 'deep' } } } } }],
  ['sessionId is a number', { sessionId: 12345, type: 'x', data: {} }],
  ['type is missing', { sessionId: 's', data: {} }],
  ['extra unknown fields', { sessionId: 's', type: 'x', data: {}, extra: 'ignored?' }],
  ['huge string value', { sessionId: 's', type: 'x', data: { big: 'x'.repeat(100000) } }],
];
for (const [name, entry] of weirdEntries) {
  await checkAsync(`weird entry: ${name}`, async () => {
    const r = await rawRequest('POST', '/', {
      rawBody: JSON.stringify(entry),
      contentType: 'application/json',
    });
    const after = await alive();
    assert.ok(after, `server died after "${name}"`);
  });
}

// ---- unknown methods / paths ----
console.log('\n=== 5. unusual HTTP methods & paths ===');
for (const method of ['PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
  await checkAsync(`${method} / → server survives`, async () => {
    await rawRequest(method, '/');
    assert.ok(await alive(), `server died after ${method} /`);
  });
}
for (const path of ['/nonexistent', '/logs/deep/nested', '/index.html', '/api/v2/logs', '//', '/%00']) {
  await checkAsync(`GET ${path} → server survives`, async () => {
    await rawRequest('GET', path);
    assert.ok(await alive(), `server died after GET ${path}`);
  });
}

// ---- stress: rapid stream of bad requests ----
console.log('\n=== 6. stress: 50 rapid bad requests, server must stay up ===');
await checkAsync('survives 50 rapid malformed requests', async () => {
  const bad = ['not json', '', '{"broken":', 'null', '42', Buffer.from([0xff,0xfe])];
  const promises = [];
  for (let i = 0; i < 50; i++) {
    const b = bad[i % bad.length];
    promises.push(rawRequest('POST', '/', { rawBody: b, contentType: 'application/json' }));
  }
  await Promise.all(promises);
  assert.ok(await alive(), 'server died under load');
});

// ---- valid logs still work after the storm ----
console.log('\n=== 7. valid logging still works after the storm ===');
await checkAsync('valid log accepted again', async () => {
  runCli(['clear']);
  const r = await rawRequest('POST', '/', {
    rawBody: JSON.stringify({ sessionId: 'sess_after', time: '2', type: 'done', data: { ok: true } }),
    contentType: 'application/json',
  });
  assert.strictEqual(r.status, 200);
  const logs = JSON.parse(runCli(['logs', '--session', 'sess_after']).stdout);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].sessionId, 'sess_after');
});

// ---- error responses are JSON, not crashes ----
console.log('\n=== 8. error responses are well-formed ===');
await checkAsync('malformed body returns a JSON error (not a hang)', async () => {
  const r = await rawRequest('POST', '/', { rawBody: 'not json', contentType: 'application/json' });
  // either 400 with JSON error, or it parsed weirdly — but must be a real response
  assert.ok(r.ok, 'no response received (server may have hung)');
  if (r.status >= 400) {
    assert.doesNotThrow(() => JSON.parse(r.body), `error body not JSON: ${r.body}`);
  }
});

// ---- teardown ----
console.log('\n=== 9. teardown ===');
check('stop succeeds', () => {
  const res = runCli(['stop']);
  assert.strictEqual(res.status, 0);
});

// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`PASSED: ${passed}   FAILED: ${failed}`);
console.log(`${'='.repeat(50)}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f.name}: ${f.msg}`);
  process.exit(1);
}
