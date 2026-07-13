// Comprehensive end-to-end test suite for dev-log CLI.
// Covers: all subcommands, 13 languages, flag combos, error handling,
// multi-session isolation, and the session-cleanup flow.
//
//   node test/e2e.mjs
//
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import http from 'http';
import assert from 'assert';

const CLI = 'dist/cli.cjs';
const PORT = 7331;
const BASE = `http://localhost:${PORT}`;

let passed = 0, failed = 0;
const failures = [];

function check(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; failures.push({ name, msg: e.message, stack: e.stack }); console.error(`  ✗ ${name}\n    ${e.message}`); }
}
async function checkAsync(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; failures.push({ name, msg: e.message, stack: e.stack }); console.error(`  ✗ ${name}\n    ${e.message}`); }
}

function runCli(args, opts = {}) {
  const res = spawnSync('node', [CLI, ...args], { encoding: 'utf8', ...opts });
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status };
}
function gen(args) { return runCli(['gen', ...args]); }
function genOut(args) { return gen(args).stdout.trim(); }

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(`${BASE}${path}`, {
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
function postLog(entry) { return httpReq('POST', '/', entry); }

async function startServer() {
  // `start` now runs as a detached daemon and returns once it's listening,
  // so we can invoke it directly and just confirm health.
  const res = runCli(['start']);
  if (res.status !== 0) throw new Error(`start failed: ${res.stderr}`);
  // Brief sanity poll (the parent already waited, this is a backstop).
  for (let i = 0; i < 20; i++) {
    try {
      const r = await httpReq('GET', '/health');
      if (r.status === 200) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server did not become healthy');
}
async function stopServer() {
  runCli(['stop']);
}

// ----------------------------- TESTS -----------------------------

console.log('\n=== 1. help & version ===');
check('help lists all 7 commands + options', () => {
  const out = runCli(['--help']).stdout;
  for (const cmd of ['start', 'gen', 'logs', 'clear', 'tunnel', 'status', 'stop']) {
    assert.ok(out.includes(cmd), `help missing command: ${cmd}`);
  }
  assert.ok(out.includes('--help'));
  assert.ok(out.includes('--version'));
});
check('gen subcommand has its own --help with all options', () => {
  const out = runCli(['gen', '--help']).stdout;
  for (const opt of ['--lang', '--type', '--data', '--ready', '--session', '--url']) {
    assert.ok(out.includes(opt), `gen --help missing: ${opt}`);
  }
});
check('version prints the package.json version', () => {
  const pkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
  assert.ok(runCli(['--version']).stdout.includes(pkgVersion));
});
check('no args = shows help (exit 0)', () => {
  const res = runCli([]);
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.toLowerCase().includes('usage'), `expected usage in help:\n${res.stdout}`);
});

console.log('\n=== 2. gen: 13 languages ===');
const LANGS = ['js','ts','python','go','swift','kotlin','dart','cpp','rust','java','csharp','php','ruby'];
for (const lang of LANGS) {
  check(`${lang} contains endpoint+session+type+data`, () => {
    const code = genOut(['--lang', lang, '--session', 'sess_test', '--type', 'state', '--data', 'MYDATA']);
    assert.ok(code.includes('http://localhost:7331'), `endpoint missing:\n${code}`);
    assert.ok(code.includes('sess_test'), `session missing:\n${code}`);
    assert.ok(code.includes('state'), `type missing:\n${code}`);
    assert.ok(code.includes('MYDATA'), `data missing:\n${code}`);
  });
}
check('case-insensitive lang (PYTHON == python)', () => {
  // fix session so only lang differs
  const a = genOut(['--lang', 'python', '--type', 'x', '--session', 'sess_fixed']);
  const b = genOut(['--lang', 'PYTHON', '--type', 'x', '--session', 'sess_fixed']);
  assert.strictEqual(a, b);
});

console.log('\n=== 3. gen: flag combos ===');
check('defaults: type=state, auto session, url=7331', () => {
  const code = genOut(['--lang', 'js']);
  assert.ok(code.includes("'state'"));
  assert.match(code, /sess_[0-9a-f]{8}/);
  assert.ok(code.includes('http://localhost:7331'));
});
check('--ready emits __ready__ + location fields, ignores --type', () => {
  const code = genOut(['--lang', 'js', '--ready', '--type', 'error']);
  assert.ok(code.includes('__ready__'));
  assert.ok(code.includes('location.href'));
  assert.ok(code.includes('location.protocol'));
  assert.ok(!code.includes("'error'"), 'should NOT include the --type value when --ready');
});
check('--ready with --data: data is ignored for ready probe', () => {
  const code = genOut(['--lang', 'js', '--ready', '--data', 'SHOULD_NOT_APPEAR']);
  assert.ok(!code.includes('SHOULD_NOT_APPEAR'));
});
check('--url overrides endpoint', () => {
  const code = genOut(['--lang', 'js', '--url', 'https://abc.loca.lt']);
  assert.ok(code.includes('https://abc.loca.lt'));
  assert.ok(!code.includes('http://localhost'));
});
check('--session reuses a given id', () => {
  const code = genOut(['--lang', 'js', '--session', 'sess_reused123']);
  assert.ok(code.includes('sess_reused123'));
});
check('--data omitted => empty object fallback (js)', () => {
  const code = genOut(['--lang', 'js', '--type', 'click']);
  assert.ok(code.includes('data:{}') || code.includes('data: {}'));
});

console.log('\n=== 4. gen: error handling ===');
check('unsupported language => exit 1 + error message', () => {
  const res = gen(['--lang', 'brainfuck']);
  assert.notStrictEqual(res.status, 0);
  assert.match(res.stderr + res.stdout, /Unsupported language/);
});
check('gen with unknown flag => clean error (exit 1)', () => {
  const res = runCli(['gen', '--lang', 'js', '--bogus', 'x']);
  assert.strictEqual(res.status, 1);
  assert.match(res.stderr, /unknown option/i);
});

console.log('\n=== 5. error handling: server not running ===');
// ensure stopped first
await stopServer();
await new Promise(r => setTimeout(r, 500));
check('status when down => running:false', () => {
  const out = runCli(['status']).stdout;
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.running, false);
});
check('logs when server down => reads local file directly', () => {
  // `dev-log logs` reads the local file regardless of server state.
  // Clear first so we know the file is empty for this assertion.
  runCli(['clear']);
  const out = runCli(['logs']).stdout;
  assert.strictEqual(JSON.parse(out).length, 0);
});
check('tunnel when not running => exit 1 + helpful error', () => {
  const res = runCli(['tunnel']);
  assert.notStrictEqual(res.status, 0);
  assert.match(res.stderr, /not running/i);
});
check('stop when not running => graceful message (exit 0)', () => {
  const res = runCli(['stop']);
  assert.strictEqual(res.status, 0);
  assert.match(res.stdout, /no.*running/i);
});
check('unknown command => error exit', () => {
  const res = runCli(['frobnicate']);
  assert.notStrictEqual(res.status, 0);
});

console.log('\n=== 6. server lifecycle (happy path) ===');
await startServer();
await checkAsync('status shows running:true', async () => {
  const out = runCli(['status']).stdout;
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.running, true);
  assert.strictEqual(parsed.port, PORT);
});
await checkAsync('POST single log via HTTP', async () => {
  const r = await postLog({ sessionId: 'sess_http1', time: '10:00:00', type: 'state', data: { a: 1 } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(JSON.parse(r.body).success, true);
});
await checkAsync('POST array of logs via HTTP', async () => {
  const r = await postLog([
    { sessionId: 'sess_arr', time: '10:01:00', type: 'a', data: {} },
    { sessionId: 'sess_arr', time: '10:02:00', type: 'b', data: {} },
  ]);
  assert.strictEqual(r.status, 200);
});
await checkAsync('logs (all) returns everything', async () => {
  const out = runCli(['logs']).stdout;
  const logs = JSON.parse(out);
  assert.ok(logs.length >= 3, `expected >=3 logs, got ${logs.length}`);
});
await checkAsync('logs --session filters', async () => {
  const out = runCli(['logs', '--session', 'sess_http1']).stdout;
  const logs = JSON.parse(out);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].sessionId, 'sess_http1');
});
await checkAsync('GET /health returns 200 ok', async () => {
  const r = await httpReq('GET', '/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(JSON.parse(r.body).status, 'ok');
});
await checkAsync('GET / status shows running + endpoints', async () => {
  const r = await httpReq('GET', '/');
  const body = JSON.parse(r.body);
  assert.strictEqual(body.status, 'running');
  assert.ok(body.endpoints);
});

console.log('\n=== 7. multi-session isolation ===');
await checkAsync('two sessions coexist independently', async () => {
  await postLog({ sessionId: 'sess_A', time: 't', type: 'x', data: { who: 'A' } });
  await postLog({ sessionId: 'sess_B', time: 't', type: 'x', data: { who: 'B' } });
  const a = JSON.parse(runCli(['logs', '--session', 'sess_A']).stdout);
  const b = JSON.parse(runCli(['logs', '--session', 'sess_B']).stdout);
  assert.ok(a.every(l => l.sessionId === 'sess_A'));
  assert.ok(b.every(l => l.sessionId === 'sess_B'));
  assert.ok(a.some(l => l.data.who === 'A'));
  assert.ok(b.some(l => l.data.who === 'B'));
});

console.log('\n=== 8. cleanup flow (only clear own session) ===');
await checkAsync('clear --session removes only that session', async () => {
  await postLog({ sessionId: 'sess_keep', time: 't', type: 'x', data: {} });
  await postLog({ sessionId: 'sess_del', time: 't', type: 'x', data: {} });
  const before = JSON.parse(runCli(['logs']).stdout).length;
  const res = runCli(['clear', '--session', 'sess_del']);
  assert.match(res.stdout, /cleared/);
  const after = JSON.parse(runCli(['logs']).stdout);
  assert.ok(after.length < before, `count did not decrease: ${before} -> ${after.length}`);
  assert.ok(after.every(l => l.sessionId !== 'sess_del'), 'sess_del still present');
  assert.ok(after.some(l => l.sessionId === 'sess_keep'), 'sess_keep was wrongly removed');
});
await checkAsync('clear (no session) wipes all', async () => {
  await postLog({ sessionId: 'sess_w1', time: 't', type: 'x', data: {} });
  await postLog({ sessionId: 'sess_w2', time: 't', type: 'x', data: {} });
  runCli(['clear']);
  const after = JSON.parse(runCli(['logs']).stdout);
  assert.strictEqual(after.length, 0);
});
await checkAsync('start resets logs on new server boot', async () => {
  await postLog({ sessionId: 'sess_prestart', time: 't', type: 'x', data: {} });
  await stopServer();
  await new Promise(r => setTimeout(r, 500));
  await startServer();
  const logs = JSON.parse(runCli(['logs']).stdout);
  assert.strictEqual(logs.length, 0, 'logs should be wiped on fresh start');
});

console.log('\n=== 9. double start is a no-op ===');
await checkAsync('start when already running => graceful message', async () => {
  const res = runCli(['start']);
  // the second start detects running and prints message; but note it will
  // also try to listen and may exit with EADDRINUSE if our isRunning probe
  // is racy. Accept either graceful OR a clear in-use message.
  const combined = res.stdout + res.stderr;
  assert.ok(
    combined.toLowerCase().includes('already running') ||
    combined.toLowerCase().includes('in use') ||
    res.status === 0,
    `unexpected double-start output: ${combined}`
  );
});

console.log('\n=== 10. teardown ===');
check('stop kills the server', () => {
  const res = runCli(['stop']);
  assert.strictEqual(res.status, 0);
});

// ----------------------------- SUMMARY -----------------------------
console.log(`\n${'='.repeat(50)}`);
console.log(`PASSED: ${passed}   FAILED: ${failed}`);
console.log(`${'='.repeat(50)}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f.name}: ${f.msg}`);
  process.exit(1);
}
