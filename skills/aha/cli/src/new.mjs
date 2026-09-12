// —— aha new：脚手架命令实现（基线结束后并入 src/cli.mjs / serve.mjs 旁）——
// 设计要点：
// 1. 骨架 = canonical tokens 逐字 + 工具条 + FOUC bootstrap + 引擎 + 七节空槽
// 2. 未填充状态即通过 11 门（样板永远绿，只有内容 Edit 能弄红）
// 3. 槽标记唯一（<!--SLOT:n-->），Edit 的 old_string 无歧义

import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ensurePagesDir, storageChoice, suggestNonCDrive, ahaRoot } from "./home.mjs";
import { readdirSync } from "node:fs";
import { CANONICAL_TOKENS } from "./canonical-tokens.mjs";

export function scaffoldHtml(title, slug) {
  const css = CANONICAL_TOKENS; // canonical 已随 src/ 发布，不依赖仓库 assets/
  const lang = /[一-鿿]/.test(title) ? "zh-CN" : "en";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · aha 图解</title>
<style>
${css}
</style>
<script>
/* 主题 bootstrap：越早执行越不闪（FOUC 防护） */
(() => { try {
  const r = document.documentElement;
  r.dataset.theme = localStorage.getItem("aha-theme") ||
    (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const p = localStorage.getItem("aha-preset"); if (p) r.dataset.preset = p;
} catch (e) {} })();
</script>
</head>
<body>
<div class="toolbar">
  <button type="button" data-tb-theme aria-label="切换深浅色">◐</button>
  <button type="button" data-tb-preset aria-label="切换配色风格">◈ 暖</button>
  <button type="button" data-tb-share aria-haspopup="true" aria-expanded="false">分享</button>
</div>
<div class="share-pop" data-share-pop hidden><div data-share-body></div></div>

<div class="container page">

  <!-- ===== 第 1 层：一句话核心 ===== -->
  <header class="section" style="margin-top:0">
    <p class="eyebrow">aha · 概念图解</p>
    <div class="hero-head">
      <h1 class="display">${title}</h1>
      <span class="badge">起点 L1 · （依据）</span>
    </div>
    <p class="lead"><strong>（SLOT1: 一句话说清）</strong></p>
    <div class="pipe" role="img" aria-label="（SLOT1: 主视觉链路 aria 描述）">
      <div class="hp"><b>（SLOT1）</b><span></span></div>
      <span class="arrow" aria-hidden="true">→</span>
      <div class="hp"><b>（SLOT1）</b><span></span></div>
      <span class="arrow" aria-hidden="true">→</span>
      <div class="hp"><b>（SLOT1）</b><span></span></div>
    </div>
  </header>

  <!-- ===== 第 2 层：为什么存在 ===== -->
  <section class="section">
    <p class="eyebrow" data-n="01">为什么需要它</p>
    <h2>（SLOT2: 标题）</h2>
    <!-- SLOT2: before/after 对比卡 + 大白话 callout -->
  </section>

  <!-- ===== 第 3 层：直觉 ===== -->
  <section class="section">
    <p class="eyebrow" data-n="02">先建立一个直觉</p>
    <h2>（SLOT3: 标题）</h2>
    <!-- SLOT3: .analogy 类比框 + .analogy-limit 失效边界（必填） -->
  </section>

  <!-- ===== 第 4 层：真实机制 ===== -->
  <section class="section">
    <p class="eyebrow" data-n="03">真实机制</p>
    <h2>（SLOT4: 标题）</h2>
    <!-- SLOT4: 大白话先行；流程配模拟器（下方 SIM_STEPS 填数据）；
         核心机制必须有图形载体（SVG 取色 var()） -->
    <div class="sim" data-sim>
      <div class="sim-stage">
        <div class="sim-node" data-node="a"><span class="k">（中文标签）</span><span data-node-text>待命</span></div>
        <div class="sim-node" data-node="b"><span class="k">（中文标签）</span><span data-node-text>待命</span></div>
        <div class="sim-node" data-node="c"><span class="k">（中文标签）</span><span data-node-text>待命</span></div>
      </div>
      <p class="sim-narration" data-sim-narration aria-live="polite"></p>
      <div class="sim-controls">
        <button type="button" data-sim-reset>重置</button>
        <button type="button" data-sim-prev>上一步</button>
        <button type="button" data-sim-next>下一步</button>
        <button type="button" data-sim-play>播放</button>
        <span class="sim-progress" data-sim-progress>– / –</span>
      </div>
    </div>
  </section>

  <!-- ===== 第 5 层：容易混淆 ===== -->
  <section class="section">
    <p class="eyebrow" data-n="04">容易混淆的</p>
    <h2>（SLOT5: 标题）</h2>
    <!-- SLOT5: .compare 对比卡（主角 .compare-highlight），每卡 .out 输出行 -->
  </section>

  <!-- ===== 第 6 层：边界与失败 ===== -->
  <section class="section">
    <p class="eyebrow" data-n="05">边界与失败模式</p>
    <h2>（SLOT6: 标题）</h2>
    <!-- SLOT6: .fails 一字标签 + 误区 .callout-warn + 适用 .callout-ok -->
  </section>

  <!-- ===== 第 7 层：记 ===== -->
  <div class="takeaway">
    <p>（SLOT7: 一句话公式，关键词 <mark>mark</mark> 2-6 处）</p>
  </div>

</div>

<script>
const SIM_STEPS = [
  /* SLOT4: 步骤数据（旁白中文引号「“ ”」），不用模拟器则整段删除（含 [SIM-ENGINE]） */
];
const SIM_MS_PER_STEP = 2400;
</script>
<script>
/* [SIM-ENGINE] 播放器逻辑 —— 禁止修改（canonical 在 reference.html） */
(() => {
  for (const root of document.querySelectorAll("[data-sim]")) {
    const steps = SIM_STEPS, last = steps.length - 1;
    const nodes = new Map();
    for (const el of root.querySelectorAll("[data-node]")) nodes.set(el.dataset.node, el);
    const narration = root.querySelector("[data-sim-narration]");
    const progress  = root.querySelector("[data-sim-progress]");
    const btnReset  = root.querySelector("[data-sim-reset]");
    const btnPrev   = root.querySelector("[data-sim-prev]");
    const btnNext   = root.querySelector("[data-sim-next]");
    const btnPlay   = root.querySelector("[data-sim-play]");
    let i = -1, timer = null;
    const idleTexts = new Map(
      [...nodes.values()].map(el => [el, el.querySelector("[data-node-text]")?.textContent ?? ""])
    );
    const render = (idx) => {
      if (idx < 0) {
        for (const [id, el] of nodes) {
          el.className = "sim-node is-waiting";
          const t = el.querySelector("[data-node-text]");
          if (t) t.textContent = idleTexts.get(el);
        }
        narration.textContent = "进入视野后会自动播放一次；也可以用下方按钮逐步查看。";
        progress.textContent = "– / " + steps.length;
        return;
      }
      const s = steps[idx];
      for (const [id, el] of nodes) {
        el.className = "sim-node is-" + (s.nodes[id] ?? "waiting");
        if (s.set && s.set[id] !== undefined) {
          const t = el.querySelector("[data-node-text]");
          if (t) t.innerHTML = s.set[id];
        }
      }
      narration.textContent = s.say;
      progress.textContent = (idx + 1) + " / " + steps.length;
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; btnPlay.textContent = "播放"; } };
    const go = (idx) => { i = Math.max(-1, Math.min(idx, last)); render(i); };
    btnNext.addEventListener("click", () => { stop(); go(i + 1); });
    btnPrev.addEventListener("click", () => { stop(); go(i - 1); });
    btnReset.addEventListener("click", () => { stop(); go(-1); });
    btnPlay.addEventListener("click", () => {
      if (timer) return stop();
      if (i >= last) go(-1);
      btnPlay.textContent = "暂停";
      timer = setInterval(() => { if (i >= last) return stop(); go(i + 1); }, SIM_MS_PER_STEP);
    });
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      if (e.matches) { stop(); go(last); }
    });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { go(last); }
    else {
      let played = false;
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting) && !played) {
          played = true; io.disconnect(); btnPlay.click();
        }
      }, { threshold: 0.45 });
      io.observe(root);
    }
    render(-1);
  }
})();
</script>
<script>
/* [TOOLBAR] 页面工具条 —— 主题/风格/分享（canonical 在 reference.html） */
(() => {
  const root = document.documentElement;
  const PRESETS = ["warm", "pop", "ink"];
  const LABEL = { warm: "暖", pop: "跳", ink: "静" };
  root.dataset.theme = localStorage.getItem("aha-theme") ||
    (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  let preset = localStorage.getItem("aha-preset") || "warm";
  root.dataset.preset = preset;
  const themeBtn = document.querySelector("[data-tb-theme]");
  const presetBtn = document.querySelector("[data-tb-preset]");
  const shareBtn = document.querySelector("[data-tb-share]");
  const paint = () => { presetBtn.textContent = "◈ " + LABEL[preset]; };
  paint();
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("aha-theme", root.dataset.theme);
  });
  presetBtn.addEventListener("click", () => {
    preset = PRESETS[(PRESETS.indexOf(preset) + 1) % PRESETS.length];
    root.dataset.preset = preset;
    localStorage.setItem("aha-preset", preset);
    paint();
  });
  const pop = document.querySelector("[data-share-pop]");
  const body = pop.querySelector("[data-share-body]");
  const setPop = (open) => { pop.hidden = !open; shareBtn.setAttribute("aria-expanded", String(open)); };
  const isLocal = !location.hostname.endsWith(".trycloudflare.com");
  if (!isLocal) { shareBtn.remove(); pop.remove(); }
  if (isLocal) shareBtn.addEventListener("click", async () => {
    setPop(pop.hidden);
    if (pop.hidden) return;
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { setPop(false); document.removeEventListener("keydown", esc); } });
    document.addEventListener("click", function out(e) { if (!pop.contains(e.target) && e.target !== shareBtn) { setPop(false); document.removeEventListener("click", out); } });
    const token = document.querySelector('meta[name="aha-share-token"]')?.content;
    if (!token) {
      body.innerHTML = "直接打开的本地文件开不了公网链接。<br>在终端运行 <code>npx @dimples/aha serve</code> 后从索引页访问本页，或 <code>npx @dimples/aha share</code>。";
      return;
    }
    const H = { "x-aha-token": token };
    body.textContent = "建立隧道…";
    await fetch("/api/share", { method: "POST", headers: H });
    const timer = setInterval(async () => {
      try {
        const s = await (await fetch("/api/share", { headers: H })).json();
        if (s.phase === "running") {
          clearInterval(timer);
          body.innerHTML = "";
          const full = s.url + location.pathname;
          const a = document.createElement("a");
          a.href = a.textContent = full;
          const cp = document.createElement("button");
          cp.textContent = "复制";
          cp.onclick = () => { navigator.clipboard.writeText(full); cp.textContent = "已复制"; };
          const note = document.createElement("div");
          note.className = "hint";
          note.textContent = "临时链接，serve 进程退出即失效";
          body.append(a, cp, note);
        } else if (s.phase === "error") {
          clearInterval(timer);
          body.textContent = "失败：" + (s.message || "未知错误");
        } else {
          body.textContent = s.phase === "installing" ? "安装 cloudflared 中（首次约一分钟）…" : "建立隧道…";
        }
      } catch { }
    }, 1000);
  });
})();
</script>
</body>
</html>
`;
}

/** aha new <slug> [标题] —— 幂等：已存在则拒绝 */
export function newCommand(slugArg, titleArg) {
  // slug 只作文件名用:非法字符归一为 "-",整段剥掉首尾连字符;
  // 纯中文等清洗后为空 → 报用法错(agent 应传 ASCII kebab-case,中文放标题参数)
  const slug = (slugArg ?? "").replace(/[^a-z0-9-]/gi, "-").replace(/^-+|-+$/g, "");
  if (!slug) { console.error("用法: aha new <slug> [标题]"); process.exit(2); }
  if (windowsStorageGuard()) process.exit(2);
  const page = join(ensurePagesDir(), slug + ".html");
  if (existsSync(page)) { console.error(`已存在: ${page}（换 slug 或直接编辑它）`); process.exit(2); }
  const title = titleArg ?? slug;
  writeFileSync(page, scaffoldHtml(title, slug));
  console.log(`脚手架已生成: ${page}`);
  console.log(`  含: canonical tokens + 工具条 + 引擎 + 七节空槽（SLOT1-7）`);
  console.log(`  下一步: 逐槽 Edit 填内容（禁止整页 Write），完成后 aha check`);
  return page;
}

/**
 * Windows 存储选择闸门(storageChoice 决策):首次使用必须选位置,
 * 有存量页面则选迁移或留守。返回 true 表示拦下(调用方退出码 2)——
 * 由调用方(agent)把选项转述给用户,选定后跑一条 aha config 命令再重跑。
 * 选过一次即写入 config.json,之后永不打扰。参数可注入,便于测试文案。
 * @param {"none"|"first"|"migrate"} [action]
 * @param {string} [suggested]
 * @param {number} [count] 存量篇数(仅 migrate 文案用)
 * @returns {boolean}
 */
export function windowsStorageGuard(action = storageChoice(), suggested = suggestNonCDrive() ?? "D:\\aha", count = readdirSync(ahaRoot()).filter((n) => n.endsWith(".html")).length) {
  if (action === "none") return false;
  console.error("aha: 需要先决定 HTML 产物的存储位置(当前默认在 C 盘)。");
  if (action === "first") {
    console.error(`  推荐:${suggested}(检测到该盘空间充足)—— 也可换成任意其他目录`);
    console.error(`  设置:aha config "${suggested}"   之后重新运行本命令`);
  } else {
    console.error(`  检测到 ${count} 篇存量页面在 C 盘,二选一:`);
    console.error(`  1) 迁移到其他盘(推荐):aha config "${suggested}" --migrate`);
    console.error(`  2) 继续存放在 C 盘:aha config --keep-c`);
    console.error(`  选定后重新运行本命令`);
  }
  return true;
}
