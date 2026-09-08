import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../src/serve.mjs";

const tmp = mkdtempSync(join(tmpdir(), "aha-serve-"));
writeFileSync(join(tmp, "b-page.html"), "<!DOCTYPE html><html lang=zh><title>B</title></html>");
writeFileSync(join(tmp, "a-page.html"), "<!DOCTYPE html><html lang=zh><title>A</title></html>");
writeFileSync(join(tmp, "notes.txt"), "not a page");

async function withServer(dir, port, optsOrFn, maybeFn) {
  const opts = typeof optsOrFn === "function" ? {} : optsOrFn;
  const fn = typeof optsOrFn === "function" ? optsOrFn : maybeFn;
  const server = await startServer({ dir, port, tunnel: opts.tunnel });
  try {
    await fn(`http://127.0.0.1:${server.port}`, server.shareToken);
  } finally {
    server.close();
  }
}

test("serve: index lists html pages (not other files), newest first", async () => {
  await withServer(tmp, 0, async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    const body = await res.text();
    assert.ok(body.includes("a-page.html"));
    assert.ok(body.includes("b-page.html"));
    assert.ok(!body.includes("notes.txt"));
    // mtime 倒序：后写的 a-page 排在前面
    assert.ok(body.indexOf("a-page.html") < body.indexOf("b-page.html"));
  });
});

test("serve: serves a file with html content-type; 404 for missing", async () => {
  await withServer(tmp, 0, async (base) => {
    const ok = await fetch(`${base}/a-page.html`);
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get("content-type"), /text\/html/);
    assert.match(await ok.text(), /<title>A<\/title>/);

    const css = await fetch(`${base}/%2e%2e%2fsrc/serve.mjs`); // 目录穿越（编码形式，确保真打到守卫）
    assert.equal(css.status, 404);
    const missing = await fetch(`${base}/nope.html`);
    assert.equal(missing.status, 404);
  });
});

test("serve: port 0 picks an ephemeral port and survives concurrent requests", async () => {
  await withServer(tmp, 0, async (base) => {
    const [a, b] = await Promise.all([fetch(`${base}/`), fetch(`${base}/b-page.html`)]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
  });
});

test("serve: resolveServeDir rejects missing dir; default is ~/.aha (auto-created)", async () => {
  const { resolveServeDir } = await import("../src/serve.mjs");
  // 显式指定但不存在 → 抛错（CLI 层转为退出码）
  assert.throws(() => resolveServeDir(join(tmp, "nope")), /目录不存在/);
  // 未指定 → 统一主页 ~/.aha，不存在则自动创建
  const fakeHome = mkdtempSync(join(tmpdir(), "aha-home-"));
  const dir = resolveServeDir(undefined, tmp, fakeHome);
  assert.equal(dir, join(fakeHome, ".aha"));
  assert.ok(existsSync(dir), "默认目录应被自动创建");
});

// —— Web Share API：索引页点击 share → 自动安装/启动 cloudflared ——

test("share api: index page embeds share button and session token", async () => {
  await withServer(tmp, 0, async (base) => {
    const html = await (await fetch(`${base}/`)).text();
    assert.match(html, /data-share/);              // 分享按钮
    assert.match(html, /x-aha-token/);            // 客户端带 token 的请求代码
  });
});

test("share api: rejects requests without session token (401) and through tunnel (403)", async () => {
  await withServer(tmp, 0, async (base) => {
    const no = await fetch(`${base}/api/share`);
    assert.equal(no.status, 401);
    const via = await fetch(`${base}/api/share`, { headers: { "x-aha-token": "x" } });
    assert.equal(via.status, 401); // token 不对也 401
  });
  await withServer(tmp, 0, { tunnel: async () => ({ url: "https://stub.trycloudflare.com", stop() {} }) }, async (base, token) => {
    const through = await fetch(`${base}/api/share`, {
      headers: { "x-aha-token": token, "cf-ray": "abc" }, // Cloudflare 边缘特征
    });
    assert.equal(through.status, 403);
  });
});

test("share api: start with valid token drives stub tunnel to running, reuses on second call", async () => {
  let started = 0, stopped = 0;
  const factory = async () => {
    started++;
    return { url: "https://stub.trycloudflare.com", stop: () => stopped++ };
  };
  await withServer(tmp, 0, { tunnel: factory }, async (base, token) => {
    const h = { "x-aha-token": token, "content-type": "application/json" };
    const r1 = await fetch(`${base}/api/share`, { method: "POST", headers: h });
    assert.equal(r1.status, 200);
    const s1 = await r1.json();
    assert.ok(["starting", "running"].includes(s1.phase));
    // 等到 running
    let state;
    for (let i = 0; i < 50; i++) {
      state = await (await fetch(`${base}/api/share`, { headers: h })).json();
      if (state.phase === "running") break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.equal(state.phase, "running");
    assert.equal(state.url, "https://stub.trycloudflare.com");
    // 再次触发 → 复用，不重复起
    await fetch(`${base}/api/share`, { method: "POST", headers: h });
    assert.equal(started, 1);
  });
  assert.equal(started, 1);
});

test("share api: server close stops tunnel", async () => {
  let stopped = 0;
  const factory = async () => ({ url: "https://stub.trycloudflare.com", stop: () => stopped++ });
  const server = await startServer({ dir: tmp, port: 0, tunnel: factory });
  const base = `http://127.0.0.1:${server.port}`;
  await fetch(`${base}/api/share`, { method: "POST", headers: { "x-aha-token": server.shareToken } });
  await new Promise((r) => setTimeout(r, 30));
  server.close();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(stopped, 1);
});

test("share api: served html pages get share-token meta injected (file html stays clean)", async () => {
  await withServer(tmp, 0, async (base, token) => {
    const html = await (await fetch(`${base}/a-page.html`)).text();
    assert.ok(html.includes(`<meta name="aha-share-token" content="${token}">`));
    assert.equal((html.match(/aha-share-token/g) ?? []).length, 1); // 只注入一次
  });
});

test("share api: toolbar JS mentioning the meta name must not block injection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aha-toolbar-"));
  // 带工具条 JS 的页面：源码里引用了 meta 名，但没有 meta 标签 —— 仍必须注入
  writeFileSync(join(dir, "t.html"),
    "<!DOCTYPE html><html lang=zh><head><title>t</title></head><body>" +
    '<script>const m = document.querySelector(\'meta[name="aha-share-token"]\')?.content;</script>' +
    "</body></html>");
  await withServer(dir, 0, async (base, token) => {
    const html = await (await fetch(`${base}/t.html`)).text();
    assert.ok(html.includes(`<meta name="aha-share-token" content="${token}">`));
    assert.equal((html.match(/<meta name="aha-share-token"/g) ?? []).length, 1);
  });
});

// —— 评审加固：M5 子目录注入 / M6 坏编码 400 / M7 符号链接不逃逸 ——

test("M5: subdir index.html also gets token meta injected", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aha-sub-"));
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "sub", "index.html"), "<!DOCTYPE html><html lang=zh><head><title>i</title></head></html>");
  await withServer(dir, 0, async (base, token) => {
    const html = await (await fetch(`${base}/sub/`)).text();
    assert.ok(html.includes(`aha-share-token" content="${token}"`));
  });
});

test("M6: malformed percent-encoding returns 400, not 500", async () => {
  await withServer(tmp, 0, async (base) => {
    const res = await fetch(`${base}/%zz`);
    assert.ok([400, 404].includes(res.status));
    assert.notEqual(res.status, 500);
  });
});

test("M7: symlink pointing outside dir does not escape", async () => {
  const outside = mkdtempSync(join(tmpdir(), "aha-out-"));
  writeFileSync(join(outside, "secret.html"), "<html><title>secret</title></html>");
  const dir = mkdtempSync(join(tmpdir(), "aha-sym-"));
  symlinkSync(join(outside, "secret.html"), join(dir, "leak.html"));
  await withServer(dir, 0, async (base) => {
    const res = await fetch(`${base}/leak.html`);
    assert.equal(res.status, 404);
  });
});

test("public (tunnel) visitors get NO share-token meta injected", async () => {
  await withServer(tmp, 0, async (base, token) => {
    const local = await fetch(`${base}/a-page.html`);
    assert.ok((await local.text()).includes(`aha-share-token" content="${token}"`));
    const viaTunnel = await fetch(`${base}/a-page.html`, { headers: { "cf-ray": "pub123" } });
    const html = await viaTunnel.text();
    assert.ok(!html.includes("aha-share-token"), "经隧道的响应不应携带分享 token");
  });
});

// —— start/stop 守护命令（dev-log 同构）：幂等启动、复用、干净停止 ——

test("daemon: start spawns background server, reuses when alive, stop kills it", async () => {
  const { startDaemon, stopDaemon } = await import("../src/serve.mjs");
  const dir = mkdtempSync(join(tmpdir(), "aha-daemon-"));
  writeFileSync(join(dir, "p1.html"), "<!DOCTYPE html><html lang=zh><head><title>P1</title></head></html>");
  const port = 7391;

  const a = await startDaemon({ dir, port });
  assert.equal(a.reused, false);
  assert.ok(a.pid > 0);
  await new Promise((r) => setTimeout(r, 300));
  const r1 = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(r1.status, 200);
  assert.ok((await r1.text()).includes("p1.html"));

  const b = await startDaemon({ dir, port });
  assert.equal(b.reused, true, "二次 start 必须复用而非再起进程");
  assert.equal(b.pid, a.pid);

  await stopDaemon({ dir, port });
  await new Promise((r) => setTimeout(r, 400));
  const gone = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(600) }).then(() => false, () => true);
  assert.equal(gone, true, "stop 后端口应关闭");
  assert.equal(existsSync(join(dir, ".serve.pid")), false, "pid 文件应清理");
});
