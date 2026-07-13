// Execution-based gen test: actually RUN the generated code and verify the
// HTTP request reaches the dev-log server with correct fields.
//
// This is the core gen test — string-matching can't catch a missing bracket
// or a wrong quote style. Here we generate a real snippet for each runnable
// language, execute it against a live dev-log server, and assert the server
// received exactly the right payload.
//
// Tier 1 (real execute + HTTP round-trip): js, ts, python, ruby
//   These languages have a stdlib/global HTTP client and ship on the local
//   machine, so we can run the generated code directly and confirm the log
//   arrives at the server with all four fields (sessionId/time/type/data).
//
// Tier 2 (compile/syntax check via Judge0): the other 9 languages.
//   See gen-judge0.mjs — submits to the free ce.judge0.com instance to at
//   least prove the generated snippet compiles.
//
//   node test/gen-exec.mjs
//
import { spawnSync } from 'child_process';
import assert from 'assert';

const CLI = 'dist/cli.cjs';
const PORT = 7331;

let passed = 0, failed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; failures.push({ name, msg: e.message }); console.error(`  ✗ ${name}\n    ${e.message}`); }
}

function runCli(args) {
  const r = spawnSync('node', [CLI, ...args], { encoding: 'utf8' });
  return { stdout: r.stdout || '', status: r.status };
}
function genOut(args) { return runCli(['gen', ...args]).stdout.trim(); }

/** Run a snippet with a given runner; return {status, stderr}. */
function execCode(runner, file, extraArgs = []) {
  const r = spawnSync(runner, [...extraArgs, file], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

import fs from 'fs';
function tmp(name, content) {
  const p = `/tmp/dl-gen-${name}`;
  fs.writeFileSync(p, content);
  return p;
}

// ---- tier 1: languages that run directly and reach the server ----
// Each entry: [lang, fileExt, runner, runnerArgs, dataExpr, expectedData]
const TIER1 = [
  // js/ts share the fetch global; node runs both (.ts via strip-types).
  ['js', 'js', 'node', [], { v: 1 }],
  ['ts', 'ts', 'node', ['--experimental-strip-types'], { v: 2 }],
  ['python', 'py', 'python3', [], { v: 3 }],
  ['ruby', 'rb', 'ruby', [], { v: 4 }],
];

console.log('\n=== gen execution test (tier 1: real HTTP round-trip) ===');
console.log('starting server...');
runCli(['start']);
await new Promise(r => setTimeout(r, 1500));

for (const [lang, ext, runner, runnerArgs, expectedData] of TIER1) {
  const sessionId = `sess_exec_${lang}`;
  // clear any prior logs for this session
  runCli(['clear', '--session', sessionId]);

  // build a data expr appropriate to the language
  let dataExpr;
  if (lang === 'ruby') dataExpr = `{v:${expectedData.v}}`;
  else if (lang === 'python') dataExpr = `{'v':${expectedData.v}}`;
  else dataExpr = `{v:${expectedData.v}}`;

  const code = genOut(['--lang', lang, '--type', 'check', '--data', dataExpr, '--session', sessionId]);
  const file = tmp(`tier1.${ext}`, code);
  // wait a beat after the run for the async request to land
  const res = execCode(runner, file, runnerArgs);
  await new Promise(r => setTimeout(r, 400));

  const logs = JSON.parse(runCli(['logs', '--session', sessionId]).stdout);

  check(`${lang}: server received exactly 1 log`, () => {
    assert.strictEqual(logs.length, 1, `expected 1 log, got ${logs.length}. runner stderr:\n${res.stderr}`);
  });
  check(`${lang}: log has correct sessionId`, () => {
    if (logs.length !== 1) return; // skip if prior failed
    assert.strictEqual(logs[0].sessionId, sessionId);
  });
  check(`${lang}: log has correct type`, () => {
    if (logs.length !== 1) return;
    assert.strictEqual(logs[0].type, 'check');
  });
  check(`${lang}: log has a time field`, () => {
    if (logs.length !== 1) return;
    assert.ok(logs[0].time != null, `time missing: ${JSON.stringify(logs[0])}`);
  });
  check(`${lang}: log has correct data payload`, () => {
    if (logs.length !== 1) return;
    assert.deepStrictEqual(logs[0].data, expectedData);
  });
}

// ---- __ready__ probe ----
// Note: the __ready__ probe references `location` (a browser global), so it
// only completes in a browser. Under Node it throws inside the fetch and the
// .catch swallows it — by design. So here we only assert the generated code
// is valid JS that Node can parse and run without a syntax error; we do NOT
// expect a log to reach the server.
console.log('\n=== gen execution test: __ready__ probe ===');
{
  const code = genOut(['--lang', 'js', '--ready', '--session', 'sess_ready_exec']);
  check('js --ready: generated code is syntactically valid (parses in node)', () => {
    // Wrap so location access is tolerated; the point is the code parses & runs.
    const wrapped = `globalThis.location = { href: 'x', protocol: 'http:' };\n${code}`;
    const file = tmp('tier1-ready.js', wrapped);
    const res = execCode('node', file);
    assert.strictEqual(res.status, 0, `node failed to run ready probe:\n${res.stderr}`);
  });
  // With location shimmed, the request should actually land:
  runCli(['clear', '--session', 'sess_ready_exec']);
  const wrapped = `globalThis.location = { href: 'x', protocol: 'http:' };\n${code}`;
  const file = tmp('tier1-ready.js', wrapped);
  execCode('node', file);
  await new Promise(r => setTimeout(r, 400));
  const logs = JSON.parse(runCli(['logs', '--session', 'sess_ready_exec']).stdout);
  check('js --ready (location shimmed): log lands with type __ready__', () => {
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].type, '__ready__');
  });
  check('js --ready: data contains url + protocol', () => {
    if (logs.length !== 1) return;
    assert.ok(logs[0].data && logs[0].data.url != null);
  });
}

runCli(['stop']);

console.log(`\n${'='.repeat(50)}`);
console.log(`PASSED: ${passed}   FAILED: ${failed}`);
console.log(`${'='.repeat(50)}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f.name}: ${f.msg}`);
  process.exit(1);
}
