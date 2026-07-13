// Manual test runner that validates the built CLI works correctly without
// vitest (whose rollup native binding is blocked in some sandboxed macOS
// environments). Mirrors the assertions in test/gen.test.ts.
//
//   node test/gen.node-test.mjs
//
import { spawnSync } from 'child_process';
import assert from 'assert';

const CLI = 'dist/cli.cjs';

function gen(args) {
  const res = spawnSync('node', [CLI, 'gen', ...args], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`dev-log gen ${args.join(' ')} failed:\n${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    process.exitCode = 1;
  }
}

const LANGS = ['js','ts','python','go','swift','kotlin','dart','cpp','rust','java','csharp','php','ruby'];

console.log('gen: language support');
for (const lang of LANGS) {
  check(`${lang} snippet contains endpoint/session/type/data`, () => {
    const code = gen(['--lang', lang, '--session', 'sess_aaaaaaaa', '--type', 'state', '--data', 'DATA']);
    assert.ok(code.includes('http://localhost:7331'), `expected endpoint in:\n${code}`);
    assert.ok(code.includes('sess_aaaaaaaa'), `expected session in:\n${code}`);
    assert.ok(code.includes('state'), `expected type in:\n${code}`);
    assert.ok(code.includes('DATA'), `expected data in:\n${code}`);
  });
}

console.log('gen: ready probe');
check('ready emits __ready__ and location fields, ignores data', () => {
  const code = gen(['--lang', 'js', '--ready', '--data', 'SHOULD_NOT_APPEAR']);
  assert.ok(code.includes('__ready__'));
  assert.ok(code.includes('location.href'));
  assert.ok(code.includes('location.protocol'));
  assert.ok(!code.includes('SHOULD_NOT_APPEAR'));
});

console.log('gen: defaults');
check('defaults type to state', () => {
  const code = gen(['--lang', 'js']);
  assert.ok(code.includes("'state'"));
});
check('generates a session id when none provided', () => {
  const code = gen(['--lang', 'js']);
  assert.match(code, /sess_[0-9a-f]{8}/);
});
check('accepts a custom url', () => {
  const code = gen(['--lang', 'js', '--url', 'https://abc.loca.lt']);
  assert.ok(code.includes('https://abc.loca.lt'));
});

console.log('gen: errors');
check('unsupported language errors out', () => {
  const res = spawnSync('node', [CLI, 'gen', '--lang', 'brainfuck'], { encoding: 'utf8' });
  assert.notStrictEqual(res.status, 0);
  assert.match(res.stderr + res.stdout, /Unsupported language/);
});

console.log(`\n${passed} passed`);
