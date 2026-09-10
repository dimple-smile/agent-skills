import { useEffect, useRef, useState } from "react";
import { createMsgSphere, type MsgSphere } from "../msg-sphere/create-msg-sphere";

interface Word {
  w: string;
  gallery?: string;
  compactHide?: boolean;
}

const WORDS: Word[] = [
  { w: "RAG" },
  { w: "Agent", compactHide: true },
  { w: "Transformer", gallery: "attention", compactHide: true },
  { w: "Diffusion" },
  { w: "MoE" },
  { w: "Attention", gallery: "attention" },
  { w: "LoRA", compactHide: true },
  { w: "RLHF" },
  { w: "Embedding", compactHide: true },
  { w: "CoT" },
  { w: "MCP", compactHide: true },
  { w: "多模态" },
  { w: "量化", compactHide: true },
  { w: "蒸馏" },
  { w: "Prompt", compactHide: true },
  { w: "Copilot" },
  { w: "对齐", compactHide: true },
  { w: "涌现" },
  { w: "向量库", compactHide: true },
  { w: "微调" },
  { w: "幻觉", compactHide: true },
  { w: "长上下文" },
  { w: "Tool Use", compactHide: true },
  { w: "知识图谱" },
  { w: "预训练", compactHide: true },
  { w: "Token" },
  { w: "温度", compactHide: true },
  { w: "强化学习" },
  { w: "推理", compactHide: true },
  { w: "思维链" },
  { w: "梯度", compactHide: true },
  { w: "反向传播" },
  { w: "Softmax", compactHide: true },
  { w: "归一化" },
  { w: "分词", compactHide: true },
  { w: "语料" },
  { w: "插件", compactHide: true },
  { w: "缓存" },
  { w: "并发", compactHide: true },
  { w: "分布式" },
  { w: "数据库", compactHide: true },
  { w: "编译器" },
  { w: "递归", compactHide: true },
  { w: "采样" },
];

const IDLE_QUOTES = [
  "这些东西……都是啥?",
  "每一个都听说过,没有一个真懂",
  "搜了三篇帖子,问号更多了",
  "别装了,问号都写在脸上了",
];

const AHA_QUOTES = ["噢!原来如此!", "懂了懂了,就是这么回事!", "原来这么简单?!", "顿悟时刻——"];

/** 确定性伪随机 */
const srand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 飘落名词:两侧落下,中央让给 slogan */
interface SatState {
  xf: number;
  y: number;
  vy: number;
  swayA: number;
  swayF: number;
  phase: number;
  depth: number;
  side: 0 | 1;
  ox: number;
  x: number;
}

const SATS: SatState[] = WORDS.map((_, i) => ({
  xf: 0,
  y: srand(i + 51) * 1200,
  vy: 0,
  swayA: 8 + srand(i + 11) * 18,
  swayF: 0.14 + srand(i + 21) * 0.22,
  phase: srand(i + 31) * Math.PI * 2,
  depth: 0.35 + srand(i + 41) * 0.65,
  side: (srand(i + 61) > 0.5 ? 1 : 0) as 0 | 1,
  ox: 0,
  x: 0,
}));


export function DomeStage({ onWordClick }: { onWordClick?: (word: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sphereMountRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<MsgSphere | null>(null);
  const wordEls = useRef<(HTMLDivElement | null)[]>([]);
  const size = useRef({ w: 0, h: 0 });
  const cursor = useRef({ x: -9999, y: -9999 });

  // live = msg-sphere(WebGPU)运行中;不可用则舞台留空(无 CSS 降级)
  const [live, setLive] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [quote, setQuote] = useState(0);
  const hoverRef = useRef<number | null>(null);
  hoverRef.current = hovered;

  // —— msg-sphere 挂载 ——
  useEffect(() => {
    const mount = sphereMountRef.current;
    if (!mount) return;
    const ms = createMsgSphere(mount, {
      expression: "skeptical",
      onReady: () => setLive(true),
      onError: (error) => console.error("msg-sphere failed:", error),
    });
    sphereRef.current = ms;
    return () => {
      ms.dispose();
      sphereRef.current = null;
    };
  }, []);

  // —— 尺寸 / 光标 ——
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      size.current = { w: r.width, h: r.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r || r.width === 0) return;
      cursor.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // —— 复制彩蛋:点复制命令,顿悟球 O 一下再变回去 ——
  const extHoverRef = useRef<string | null>(null);
  useEffect(() => {
    let timer = 0;
    const onReact = () => {
      sphereRef.current?.changeExpression("surprised");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (hoverRef.current === null && extHoverRef.current === null) {
          sphereRef.current?.changeExpression("skeptical");
        }
      }, 1300);
    };
    // 轮播名词 hover 联动表情(飘落词在球旁边,轮播词在首屏下方)
    const onExtHover = (e: Event) => {
      const word = (e as CustomEvent).detail as string | null;
      extHoverRef.current = word;
      if (word) sphereRef.current?.changeExpression("surprised");
      else if (hoverRef.current === null) sphereRef.current?.changeExpression("skeptical");
    };
    window.addEventListener("aha:react", onReact);
    window.addEventListener("aha:word-hover", onExtHover);
    return () => {
      window.removeEventListener("aha:react", onReact);
      window.removeEventListener("aha:word-hover", onExtHover);
      window.clearTimeout(timer);
    };
  }, []);

  // —— 飘落 rAF:两侧落下(中央排除区) + hover 钉住 + 词间斥力 ——
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let excl = { l: 0.46 * (size.current.w || 1200), r: 0.54 * (size.current.w || 1200) };
    const measureExcl = () => {
      const copy = document.querySelector("#hero-copy");
      const stage = stageRef.current;
      const w = size.current.w;
      if (!copy || !stage || w === 0) return;
      const sr = stage.getBoundingClientRect();
      let left = Infinity, right = -Infinity;
      for (const k of Array.from(copy.children)) {
        const kr = k.getBoundingClientRect();
        if (kr.height < 4) continue;
        left = Math.min(left, kr.left - sr.left);
        right = Math.max(right, kr.right - sr.left);
      }
      excl.l = Math.min(0.80 * w, Math.max(0.15 * w, left - 90));
      excl.r = Math.max(0.20 * w, Math.min(0.85 * w, right + 90));
    };
    setTimeout(measureExcl, 50);
    const ro = new ResizeObserver(measureExcl);
    const copyEl = document.querySelector("#hero-copy");
    if (copyEl) ro.observe(copyEl);

    let raf = 0;
    let t = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      const { w, h } = size.current;
      if (w > 0) {
        for (let a = 0; a < SATS.length; a++) {
          const A = SATS[a];
          for (let b = a + 1; b < SATS.length; b++) {
            const B = SATS[b];
            const dx = B.x - A.x, dy = B.y - A.y;
            if (Math.abs(dy) > 42 || Math.abs(dx) > 150) continue;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 46) {
              const push = (46 - d) * 3.4 * dt;
              A.ox -= (dx / d) * push;
              B.ox += (dx / d) * push;
            }
          }
        }
        SATS.forEach((s, i) => {
          const el = wordEls.current[i];
          if (!el) return;
          if (s.vy === 0) s.vy = 14 + s.depth * 26;
          if (s.xf === 0) {
            s.xf = s.side === 0 ? 0.04 + srand(i + 5) * 0.36 : 0.60 + srand(i + 9) * 0.34;
          }
          const hov = hoverRef.current;
          if (hov !== i && !reduced) {
            s.y += s.vy * dt;
            if (s.y > h + 40) {
              s.y = -30 - Math.random() * 120;
              s.side = Math.random() > 0.5 ? 1 : 0;
              s.xf = s.side === 0
                ? 0.03 + Math.random() * (excl.l / w - 0.07)
                : excl.r / w + Math.random() * (0.97 - excl.r / w);
            }
            s.ox *= Math.max(0, 1 - 5 * dt);
            s.x = s.xf * w + Math.sin(t * s.swayF * Math.PI * 2 + s.phase) * s.swayA + s.ox;
            if (s.side === 0) s.x = Math.min(s.x, excl.l);
            else s.x = Math.max(s.x, excl.r);
            s.x = Math.max(20, Math.min(w - 20, s.x));
          }
          const scale = reduced ? 1 : 0.86 + s.depth * 0.3;
          const op = 0.45 + s.depth * 0.55;
          const rot = reduced ? 0 : Math.sin(t * s.swayF * Math.PI * 2 + s.phase) * 2.2;
          const sc = hov === i ? scale * 1.18 : scale;
          const o = hov === i ? 1 : op;
          el.style.transform =
            `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${sc})`;
          el.style.opacity = o.toFixed(3);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // —— idle 台词轮播 ——
  useEffect(() => {
    if (hovered !== null) return;
    const id = setInterval(() => setQuote((q) => (q + 1) % IDLE_QUOTES.length), 3200);
    return () => clearInterval(id);
  }, [hovered]);

  const enter = (i: number) => {
    setHovered(i);
    setVisited((v) => new Set(v).add(i));
    sphereRef.current?.changeExpression("surprised");
  };
  const leave = () => {
    setHovered(null);
    sphereRef.current?.changeExpression("skeptical");
  };
  const click = (word: Word) => {
    onWordClick?.(word.w);
  };
  const touch = (i: number) => {
    enter(i);
    setTimeout(() => {
      if (hoverRef.current === i) leave();
    }, 2400);
  };

  // 演示模式:?aha=词 → 自动进入顿悟态
  useEffect(() => {
    const demo = new URLSearchParams(location.search).get("aha");
    if (!demo) return;
    const idx = WORDS.findIndex((x) => x.w.toLowerCase() === demo.toLowerCase());
    if (idx < 0) return;
    const id = setTimeout(() => enter(idx), 1600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoveredWord = hovered !== null ? WORDS[hovered] : null;

  return (
    <div ref={stageRef} className="dome-stage absolute inset-0 overflow-hidden select-none">
      {/* ===== msg-sphere(WebGPU):整屏场景(球+舞台+雾) ===== */}
      <div
        ref={sphereMountRef}
        className={`absolute inset-0 transition-opacity duration-700 ${
          live ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 暗角 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[8] bg-[linear-gradient(90deg,rgba(0,0,0,0.30),transparent_22%_78%,rgba(0,0,0,0.30)),linear-gradient(180deg,rgba(0,0,0,0.22),transparent_28%_72%,rgba(0,0,0,0.40))]"
      />

      {/* 台词:锚在穹顶上方 */}
      <div className="pointer-events-none absolute inset-x-0 z-10 flex justify-center" style={{ bottom: "6svh" }}>
        <p className="flex h-8 items-center rounded-full bg-ink-950/70 px-4 font-mono text-sm backdrop-blur-sm [box-shadow:0_2px_16px_rgba(4,3,2,0.5)]">
              {hoveredWord ? (
                <span key={"a" + hoveredWord.w} className="quote-swap text-gold">
                  {AHA_QUOTES[(hovered ?? 0) % AHA_QUOTES.length]}
                  <span className="text-cream-3"> · 点击看怎么打开它</span>
                </span>
              ) : (
            <span key={"q" + quote} className="quote-swap text-cream-3">{IDLE_QUOTES[quote]}</span>
          )}
        </p>
      </div>

      {/* 名词:两侧飘落 */}
      {WORDS.map((word, i) => {
        const active = hovered === i;
        return (
          <div
            key={word.w}
            ref={(el) => {
              wordEls.current[i] = el;
            }}
            className={`absolute top-0 left-0 will-change-transform ${
              SATS[i].depth > 0.72 ? "z-[7]" : "z-[5]"
            } ${word.compactHide ? "hidden md:block" : ""}`}
          >
            <button
              onMouseEnter={() => enter(i)}
              onMouseLeave={leave}
              onTouchStart={() => touch(i)}
              onClick={() => click(word)}
              className={`group relative flex items-baseline gap-0.5 rounded-lg px-2 py-0.5 font-mono text-[11.5px] transition-all md:text-[12.5px] hover:bg-ink-950/50 [text-shadow:0_1px_3px_rgba(5,4,3,0.95),0_0_10px_rgba(5,4,3,0.85)] ${
                active ? "text-cream-1" : "text-cream-4 hover:text-cream-2"
              }`}
            >
              <span>{word.w}</span>
              <span className={`mark inline-block font-bold ${active ? "on" : ""}`}>
                {active ? "!" : "?"}
              </span>
              {visited.has(i) && !active && (
                <span className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold/70" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
