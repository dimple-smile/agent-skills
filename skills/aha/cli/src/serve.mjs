#!/usr/bin/env node
// @dimples/aha · serve —— 本地静态服务 + 索引页（零依赖）
//
// 默认端口 7332（避开 dev-log 的 7331）。索引页列出目录下 *.html，
// 按修改时间倒序 —— 已生成的解释页一眼可见。

import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { realpathSync, readdirSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { existsSync, mkdirSync, statSync, readFileSync, writeFileSync, unlinkSync, openSync } from "node:fs";
import { homedir } from "node:os";

export const DEFAULT_PORT = 7332;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function listPages(dir) {
  const names = (await readdir(dir)).filter((n) => n.endsWith(".html"));
  const withMeta = await Promise.all(
    names.map(async (n) => {
      const p = join(dir, n);
      const mtime = (await stat(p)).mtimeMs;
      let title = "", dek = "", level = "";
      try {
        const raw = await readFile(p, "utf8");
        title = (raw.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "")
          .replace(/\s*[·-]\s*(?:aha|aha)\s*图解\s*$/i, "").trim();
        dek = (raw.match(/<p class="lead">([\s\S]*?)<\/p>/i)?.[1] ?? "")
          .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (dek.length > 72) {
          // 编辑部式截断：优先在标点处收束，其次词边界，不腰斩半句
          const cut = dek.slice(0, 72);
          const punct = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("，"), cut.lastIndexOf("；"), cut.lastIndexOf("、"), cut.lastIndexOf("！"), cut.lastIndexOf("？"));
          dek = punct > 36 ? cut.slice(0, punct + 1) : cut.replace(/\s*\S*$/, "") + "…";
        }
        level = raw.match(/class="badge">([^<]+)</)?.[1]?.trim() ?? "";
      } catch { /* 读不了的页退回文件名展示 */ }
      return { name: n, mtime, title, dek, level };
    })
  );
  return withMeta.sort((a, b) => b.mtime - a.mtime);
}

function indexHtml(pages, dir, token) {
  // —— 「概念书架」编辑部目录页：刊头 + 编号条目 + 元数据（标题/一句话核心/起点级别）
  const d = new Date();
  const rows = pages.map((p, i) => {
    const num = String(i + 1).padStart(2, "0");
    const title = esc(p.title || p.name.replace(/\.html$/, ""));
    const dek = esc(p.dek);
    const lvl = esc((p.level.match(/L\d/) || [""])[0]);
    const date = new Date(p.mtime).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
    const hero = i === 0 && pages.length > 1;
    return `<a class="entry${hero ? " hero" : ""}" href="/${encodeURIComponent(p.name)}">
      <span class="num">${num}</span>
      <span class="mid">
        <span class="etitle">${title}</span>
        ${dek ? `<span class="dek">${dek}</span>` : ""}
      </span>
      <span class="side"><time>${lvl ? `<b class="lv">${lvl}</b> · ` : ""}${date}</time><b class="go">→</b></span>
    </a>`;
  }).join("\n");
  const count = pages.length;
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aha · 概念书架</title>
<style>
:root{
  --bg:#161210;--surface:#1f1915;--panel:#27201a;--line:#423629;--line-2:#5c4b39;
  --t1:#f7f1e7;--t2:#d9cdba;--t3:#a99b82;--t4:#9b8f7c;
  --accent:#ffab2e;--accent-ink:#241a09;--accent-soft:rgba(255,171,46,.14);
}
@media (prefers-color-scheme: light){
  :root{--bg:#fbf6ec;--surface:#ffffff;--panel:#f5eddd;--line:#ded1b6;--line-2:#c8b48f;
  --t1:#271f12;--t2:#5f5540;--t3:#72654b;--t4:#766851;
  --accent:#8f4e00;--accent-ink:#fffaf0;--accent-soft:rgba(163,91,0,.11)}
}
*{box-sizing:border-box}
html{color-scheme:dark light}
body{margin:0;background:var(--bg);color:var(--t1);
  font:16px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB",sans-serif;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:52rem;margin:0 auto;padding:4.5rem 1.6rem 5rem}
/* —— 刊头 —— */
.mast{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.wordmark{font-size:clamp(3rem,9vw,4.6rem);font-weight:800;letter-spacing:-.03em;line-height:.95;margin:0}
.wordmark i{font-style:normal;color:var(--accent)}
.tagline{color:var(--t2);margin:.9rem 0 0;font-size:1.02rem}
.tagline b{color:var(--t1);font-weight:650}
.meta{color:var(--t4);font:500 .72rem/1.7 ui-monospace,Menlo,monospace;margin-top:.45rem;word-break:break-all}
.sharelink{background:none;border:none;padding:0;color:var(--t2);cursor:pointer;white-space:nowrap;
  font:600 .88rem/1 inherit;text-decoration:underline;text-decoration-color:var(--line-2);text-underline-offset:.35em;transition:color .18s}
.sharelink:hover{color:var(--accent);text-decoration-color:var(--accent)}
.sharest{font:500 .78rem/1 ui-monospace,Menlo,monospace;color:var(--t3);align-self:center}
.shareurl{margin-top:.6rem;font:500 .8rem/1.6 ui-monospace,Menlo,monospace;word-break:break-all}
.shareurl a{color:var(--accent)}
.shareurl button{background:var(--surface);color:var(--t2);border:1px solid var(--line-2);
  border-radius:999px;padding:.3em .8em;margin-left:.6em;font-size:.72rem;cursor:pointer}
/* —— 目录条目 —— */
.rule{height:3px;background:var(--accent);margin:2.6rem 0 0;border-radius:2px}
.entry{display:grid;grid-template-columns:3.2rem 1fr auto;gap:1.1rem;align-items:baseline;
  padding:1.05rem .4rem;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;
  transition:background .18s}
.entry:hover{background:var(--surface)}
.num{font:600 .8rem/2 ui-monospace,Menlo,monospace;color:var(--t4);transition:color .18s}
.entry:hover .num{color:var(--accent)}
.mid{min-width:0}
.etitle{display:block;font-size:1.22rem;font-weight:650;line-height:1.35;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dek{display:block;color:var(--t3);font-size:.86rem;margin-top:.45rem;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.side{display:flex;gap:.7rem;align-items:baseline;white-space:nowrap}
time{font:500 .76rem/1 ui-monospace,Menlo,monospace;color:var(--t3);font-variant-numeric:tabular-nums}
.lv{color:var(--accent);font-weight:650}
.legend{color:var(--t4);font:500 .7rem/1.6 ui-monospace,Menlo,monospace;margin:.7rem 0 0;letter-spacing:.02em}
.go{color:var(--t4);font-weight:400;opacity:0;transform:translateX(-4px);transition:.18s}
.entry:hover .go{opacity:1;transform:none;color:var(--accent)}
/* 首篇 = 编辑部位级 */
.entry.hero{grid-template-columns:3.2rem 1fr auto;padding:1.5rem .4rem}
.entry.hero .etitle{font-size:clamp(1.55rem,4.5vw,2.05rem);font-weight:750;white-space:normal;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.entry.hero .dek{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:.92rem}
/* 空书架 */
.empty{padding:3.2rem .4rem;border-bottom:1px solid var(--line);color:var(--t3)}
.empty b{display:block;color:var(--t1);font-size:1.3rem;margin-bottom:.4rem}
.foot{margin-top:2.2rem;color:var(--t4);font:500 .72rem/1.8 ui-monospace,Menlo,monospace}
@media (max-width:34rem){
  .wrap{padding:3rem 1.1rem 3.5rem}
  .entry{grid-template-columns:2.2rem 1fr;gap:.7rem}
  .side{grid-column:2;justify-content:flex-start;margin-top:.2rem}
}
@media (prefers-reduced-motion: reduce){*{transition:none!important}}
</style></head><body>
<div class="wrap">
  <header class="mast">
    <div>
      <h1 class="wordmark">a<i>h</i>a</h1>
      <p class="tagline">概念书架 —— 把复杂讲成一张图。<b>已编译 ${count} 篇</b></p>
      <p class="legend">L1 零基础 · L2 相邻背景 · L3 已入门 —— 起点越高，讲得越深</p>
      <p class="meta">${esc(dir)}</p>
    </div>
    <div>
      <button type="button" class="sharelink" data-share>分享这面书架 ↗</button>
      <span class="sharest" data-share-status></span>
      <div class="shareurl" data-share-url hidden></div>
    </div>
  </header>
  <div class="rule"></div>
  ${count ? rows : `<div class="empty"><b>书架还是空的</b>对一个概念说“aha 某某”，第一页图解会出现在这里。</div>`}
  <p class="foot">aha serve · 页面即链接 · npx @dimples/aha share 可直接开公网</p>
</div>
<script>
(() => {
  const TOKEN = ${JSON.stringify(token)};
  const btn = document.querySelector("[data-share]");
  const st = document.querySelector("[data-share-status]");
  const box = document.querySelector("[data-share-url]");
  const H = { "x-aha-token": TOKEN };
  const LABEL = { idle: "", installing: "安装 cloudflared 中（首次约一分钟）…",
                  starting: "建立隧道…", running: "", error: "" };
  const tick = async () => {
    const s = await (await fetch("/api/share", { headers: H })).json();
    st.textContent = s.message || LABEL[s.phase] || s.phase;
    if (s.phase === "running") {
      clearInterval(poll);
      box.hidden = false;
      box.innerHTML = "";
      const a = document.createElement("a");
      a.href = a.textContent = s.url;
      const cp = document.createElement("button");
      cp.textContent = "复制";
      cp.onclick = () => { navigator.clipboard.writeText(s.url); cp.textContent = "已复制"; };
      box.append(a, cp);
      btn.disabled = false;
    } else if (s.phase === "error") {
      clearInterval(poll);
      btn.disabled = false;
    }
  };
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    st.textContent = "启动中…";
    await fetch("/api/share", { method: "POST", headers: H });
    poll = setInterval(tick, 1000);
    tick();
  });
  let poll;
})();
</script>
</body></html>`;
}

/**
 * 解析服务目录：显式指定的目录必须存在（否则抛错）；
 * 未指定 → 统一主页 ~/.aha（自动创建），所有生成页都住在那里。
 * @param {string | undefined} dirArg
 * @param {string} [cwd]
 * @param {string} [home]
 * @returns {string}
 */
export function resolveServeDir(dirArg, cwd = process.cwd(), home = homedir()) {
  if (dirArg) {
    const dir = resolve(cwd, dirArg);
    if (!existsSync(dir)) throw new Error(`目录不存在: ${dir}`);
    if (!statSync(dir).isDirectory()) throw new Error(`不是目录（serve 只服务目录）: ${dir}`);
    return dir;
  }
  const dir = join(home, ".aha");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * @param {{ dir?: string, port?: number, tunnel?: (port: number, onStatus?: Function) =>
 *            Promise<{ url: string, stop: () => void }> }} opts
 *        tunnel: 隧道工厂（测试注入用）；缺省用 share.mjs 的 webTunnelFactory
 * @returns {Promise<{ port: number, close: () => void, dir: string, shareToken: string }>}
 */
export function startServer(opts = {}) {
  const dir = resolve(opts.dir ?? ".");
  const port = opts.port ?? 7332;
  const shareToken = randomUUID();

  // —— 分享状态机：idle → installing/starting → running | error ——
  // 隧道工厂按需解析：显式注入（测试）或动态加载真实现（避免与 share.mjs 循环 import）
  let tunnelFactory = opts.tunnel ?? null;
  let current = null; // { url, stop }
  let pending = null;
  let shareState = { phase: "idle" };
  // 安装期子进程登记表：close() 时一并回收，杜绝孤儿（评审 B6）
  const killables = [];
  const api = (req, res) => {
    // 公网侧防护：经 Cloudflare 边缘来的请求带 cf-ray，API 一律拒绝
    if (req.headers["cf-ray"]) {
      res.writeHead(403).end(JSON.stringify({ error: "API 不经隧道开放" }));
      return true;
    }
    if (req.headers["x-aha-token"] !== shareToken) {
      res.writeHead(401).end(JSON.stringify({ error: "bad token" }));
      return true;
    }
    if (req.method === "POST") {
      if (!current && !pending) {
        pending = (async () => {
          try {
            if (!tunnelFactory) {
              const { webTunnelFactory } = await import("./share.mjs");
              tunnelFactory = webTunnelFactory;
            }
            shareState = { phase: "starting" };
            const t = await tunnelFactory(port, {
              onStatus: (phase, message) => { shareState = { phase, message }; },
              onDown: () => {
                // 隧道死亡：状态翻 error 并清 current，允许重试（评审 B5）
                current = null;
                shareState = { phase: "error", message: "隧道已断开，可重试分享" };
              },
              killables,
            });
            current = t;
            shareState = { phase: "running", url: t.url };
          } catch (e) {
            shareState = { phase: "error", message: e.message };
          } finally {
            pending = null;
          }
        })();
      }
      res.writeHead(200).end(JSON.stringify(shareState));
      return true;
    }
    res.writeHead(200).end(JSON.stringify(shareState));
    return true;
  };

  return new Promise((resolveP, rejectP) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname === "/api/share" && api(req, res)) return;
        let pathname;
        try {
          pathname = decodeURIComponent(url.pathname);
        } catch {
          res.writeHead(400).end("bad encoding"); // 评审 M6：坏百分号编码
          return;
        }
        // 目录穿越防护：解析 + 符号链接双重收紧（评审 M7：stat 会跟随 symlink）
        const target = normalize(join(dir, pathname));
        if (target !== dir && !target.startsWith(dir + sep)) {
          res.writeHead(404).end("not found");
          return;
        }
        if (target !== dir) {
          try {
            const [rp, rpDir] = [realpathSync(target), realpathSync(dir)];
            if (!rp.startsWith(rpDir + sep) && rp !== rpDir) {
              res.writeHead(404).end("not found");
              return;
            }
          } catch { /* realpath 失败说明文件不存在，走下面的 stat 分支 */ }
        }
        // 仅本机会话注入分享 token；经隧道（cf-ray）的公开访客不注入
        // —— 页内按钮对 trycloudflare 域名隐藏，公开侧不存在双重分享路径
        const injectToken = req.headers["cf-ray"]
          ? (html) => html
          : (html) => {
              const metaTag = '<meta name="aha-share-token"';
              const meta = `<meta name="aha-share-token" content="${shareToken}">`;
              // 去重判定必须认 meta 标签本身 —— 页面工具条 JS 会引用这个名字，裸字符串会误判已注入
              if (html.includes(metaTag)) return html;
              if (html.includes("</head>")) return html.replace("</head>", `${meta}</head>`);
              if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}${meta}`);
              return meta + html;
            };
        const st = await stat(target).catch(() => null);
        if (st?.isFile()) {
          if (target.toLowerCase().endsWith(".html")) {
            // 注入本会话分享 token：页面内工具条的分享按钮据此调用 /api/share。
            // file:// 直开不含此 meta，分享按钮会转而显示 CLI 指引。
            res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
            res.end(injectToken(await readFile(target, "utf8")));
            return;
          }
          const body = await readFile(target);
          res.writeHead(200, {
            "content-type": MIME[extname(target).toLowerCase()] ?? "application/octet-stream",
          });
          res.end(body);
          return;
        }
        if (st?.isDirectory() || url.pathname === "/") {
          const idx = join(target, "index.html");
          if (existsSync(idx) && target !== dir) {
            res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
            res.end(injectToken(await readFile(idx, "utf8"))); // 子目录 index 同样注入（评审 M5）
            return;
          }
          const pages = await listPages(dir);
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(indexHtml(pages, dir, shareToken));
          return;
        }
        res.writeHead(404).end("not found");
      } catch (e) {
        console.error(`aha serve: ${req.url} -> ${e.message}`);
        res.writeHead(500).end("error");
      }
    });
    server.on("error", rejectP);
    server.listen(port, "127.0.0.1", () =>
      resolveP({
        port: server.address().port,
        close: () => {
          if (current) current.stop(); // 隧道随服务一起关，链接即刻失效
          for (const c of killables) c.kill("SIGTERM"); // 安装子进程一并回收（评审 B6）
          server.close();
        },
        dir,
        shareToken,
      })
    );
  });
}

/** CLI 入口 */
export async function serveCommand(dirArg, opts = {}) {
  let dir;
  try {
    dir = resolveServeDir(dirArg);
  } catch (e) {
    console.error(`aha serve: ${e.message}`);
    process.exit(2);
  }
  let server;
  try {
    server = await startServer({ dir, port: Number(opts.port ?? DEFAULT_PORT) });
  } catch (e) {
    console.error(friendlyListenError(e, opts.port ?? DEFAULT_PORT)); // 评审 B4：不再裸栈
    process.exit(1);
  }
  console.log(`aha serve · ${dir}`);
  console.log(`  →  http://127.0.0.1:${server.port}   （主页：历史生成列表）`);
  console.log("  页面地址：http://127.0.0.1:" + server.port + "/<slug>.html");
  console.log("  Ctrl-C 停止；索引页或页面工具条的分享按钮可开公网链接");
  // Web 流程里由 /api/share 启动的隧道与安装子进程都挂在 server 上；
  // 进程退出（含 kill）必须一并回收，否则 cloudflared / brew 成为孤儿
  const cleanup = () => {
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

/** listen 阶段错误 → 人话（评审 B4；share.mjs 复用） */
export function friendlyListenError(e, port) {
  if (e?.code === "EADDRINUSE") {
    return `aha: 端口 ${port} 已被占用（可能已有一个 serve/share 在跑）。试试 --port 其他值。`;
  }
  return `aha: 启动失败：${e?.message ?? e}`;
}

// —— 后台守护（dev-log 同构）：aha start / aha stop ——

const probe = async (port, ms = 600) => {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(ms) });
    return res.status === 200;
  } catch { return false; }
};

const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

/**
 * 幂等启动后台 serve 守护（未运行则拉起 detached 子进程，已运行则复用）。
 * pid/日志落在服务目录：.serve.pid / .serve.log
 * @param {{ dir?: string, port?: number }} opts
 * @returns {Promise<{ pid: number, port: number, dir: string, reused: boolean, count: number }>}
 */
export async function startDaemon(opts = {}) {
  const dir = resolveServeDir(opts.dir);
  const port = Number(opts.port ?? DEFAULT_PORT);
  const pidFile = join(dir, ".serve.pid");
  const logFile = join(dir, ".serve.log");
  const count = readdirSync(dir).filter((n) => n.endsWith(".html")).length;

  if (existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, "utf8").trim());
    if (pidAlive(pid) && (await probe(port))) {
      return { pid, port, dir, reused: true, count };
    }
    unlinkSync(pidFile); // 陈旧 pid（进程已死或端口未监听）
  }
  if (await probe(port)) {
    // 端口被外部 serve 占用（如前台手跑的）—— 直接当作守护复用
    return { pid: -1, port, dir, reused: true, count };
  }

  const self = new URL("./cli.mjs", import.meta.url).pathname; // 入口必须是 cli.mjs（serve.mjs 只导出不执行）
  const logFd = openSync(logFile, "a");
  const child = spawn(process.execPath, [self, "serve", dir, "--port", String(port)], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  writeFileSync(pidFile, String(child.pid));
  for (let i = 0; i < 40 && !(await probe(port, 400)); i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!(await probe(port))) throw new Error(`守护启动失败，日志见 ${logFile}`);
  return { pid: child.pid, port, dir, reused: false, count };
}

/**
 * 停止守护：按 pid 文件 SIGTERM（serveCommand 自带清理链），清 pid 文件。
 * @param {{ dir?: string, port?: number }} opts
 */
export async function stopDaemon(opts = {}) {
  const dir = resolveServeDir(opts.dir);
  const port = Number(opts.port ?? DEFAULT_PORT);
  const pidFile = join(dir, ".serve.pid");
  if (existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, "utf8").trim());
    if (pidAlive(pid)) {
      process.kill(pid, "SIGTERM");
      for (let i = 0; i < 20 && pidAlive(pid) && i >= 0; i++) {
        await new Promise((r) => setTimeout(r, 150));
        if (!pidAlive(pid)) break;
      }
    }
    unlinkSync(pidFile);
  } else if (await probe(port)) {
    // 无 pidfile 的占用（前台手动跑的 / 旧版孤儿）：lsof 可用时按端口强停
    let pids = [];
    try {
      // 只取 LISTEN 状态（lsof -i tcp:PORT 会把客户端连接也列进来 ——
      // 曾把 stop 自己 probe 的连接杀掉，进程以 SIGTERM 143 自尽）
      const out = execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
      pids = out.split("\n").map(Number).filter((n) => n && n !== process.pid);
    } catch { /* 无 lsof（如 Windows）→ 走提示分支 */ }
    if (pids.length) {
      for (const pid of pids) { try { process.kill(pid, "SIGTERM"); } catch {} }
      for (let i = 0; i < 20 && (await probe(port, 300)); i++) await new Promise((r) => setTimeout(r, 150));
      if (await probe(port)) throw new Error(`端口 ${port} 的进程未能停止（pids: ${pids.join(",")}）`);
    } else {
      console.error(`aha stop: ${dir}/.serve.pid 不存在，且找不到 lsof —— 端口 ${port} 的服务请手动停止。`);
      process.exit(2);
    }
  }
}
