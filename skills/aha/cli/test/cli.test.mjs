import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/cli.mjs";

test("parseArgs: commands, positionals, --port N and --port=N", () => {
  assert.deepEqual(parseArgs(["check", "a.html"]), { cmd: "check", positionals: ["a.html"], opts: {} });
  assert.deepEqual(parseArgs(["serve", "--port", "8080"]), { cmd: "serve", positionals: [], opts: { port: 8080 } });
  assert.deepEqual(parseArgs(["serve", "--port=8080", "dir"]), { cmd: "serve", positionals: ["dir"], opts: { port: 8080 } });
});

test("parseArgs: bad ports rejected (B4) — abc / 99999 / 80.5 / missing value", () => {
  for (const bad of [["serve", "--port", "abc"], ["serve", "--port", "99999"], ["serve", "--port", "80.5"], ["serve", "--port"]]) {
    assert.throws(() => parseArgs(bad), /--port/);
  }
});

test("parseArgs: unknown flags rejected", () => {
  assert.throws(() => parseArgs(["serve", "--evil"]), /未知选项/);
});

test("BL1: bin symlink execution works (npx form) — not a silent no-op", async () => {
  const { symlinkSync, mkdirSync, rmSync, chmodSync } = await import("node:fs");
  const { execFileSync } = await import("node:child_process");
  const { tmpdir } = await import("node:os");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const binDir = join(tmpdir(), "aha-bin-smoke");
  rmSync(binDir, { recursive: true, force: true });
  mkdirSync(binDir);
  const bin = join(binDir, "aha");
  const real = fileURLToPath(new URL("../src/cli.mjs", import.meta.url));
  symlinkSync(real, bin);
  chmodSync(bin, 0o755);
  const out = execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  rmSync(binDir, { recursive: true, force: true });
  assert.ok(out.includes("aha ——"), "经符号链接执行必须输出帮助而非静默");
});

test("B4 command-level: serve on occupied port exits 1 with friendly message", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { fileURLToPath } = await import("node:url");
  const { startServer } = await import("../src/serve.mjs");
  const exec = promisify(execFile);
  const blocker = await startServer({ dir: process.cwd(), port: 0 });
  try {
    const cli = fileURLToPath(new URL("../src/cli.mjs", import.meta.url));
    await exec(process.execPath, [cli, "serve", "--port", String(blocker.port)]);
    assert.fail("应当以非 0 退出");
  } catch (e) {
    assert.ok(/已被占用/.test(e.stderr + e.stdout), "应输出人话提示: " + (e.stderr || e.stdout));
    assert.notEqual(e.code, 0);
  } finally {
    blocker.close();
  }
});

test("aha new: scaffold passes all gates before any content fill", async () => {
  const { scaffoldHtml } = await import("../src/new.mjs");
  const { checkHtml } = await import("../src/check.mjs");
  const html = scaffoldHtml("测试概念", "test-concept");
  const res = checkHtml(html);
  const failed = res.gates.filter(g => g.status === "fail");
  assert.deepEqual(failed.map(g => g.id), [], `空槽骨架应过全部门: ${JSON.stringify(failed)}`);
  // 槽标记齐全且唯一
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    assert.ok(html.includes(`SLOT${n}`), `缺 SLOT${n}`);
  }
  assert.ok(html.includes("[SIM-ENGINE]"), "缺引擎");
  assert.ok(html.includes("[TOOLBAR]"), "缺工具条");
  assert.ok(html.includes("aha-design-tokens"), "缺 canonical tokens");
});
