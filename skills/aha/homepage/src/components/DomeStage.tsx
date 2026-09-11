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
  { w: "KV Cache" },
  { w: "CNN", compactHide: true },
  { w: "RNN" },
  { w: "LSTM", compactHide: true },
  { w: "GAN" },
  { w: "VAE", compactHide: true },
  { w: "Dropout" },
  { w: "Residual", compactHide: true },
  { w: "位置编码" },
  { w: "Merkle Tree", compactHide: true },
  { w: "布隆过滤器" },
  { w: "Gossip", compactHide: true },
  { w: "幂等" },
  { w: "CAP 定理", compactHide: true },
  { w: "MVCC" },
  { w: "B+ Tree", compactHide: true },
  { w: "推测解码" },
  { w: "联邦学习", compactHide: true },
  { w: "同态加密" },
  { w: "过拟合", compactHide: true },
  { w: "正则化" },
  { w: "随机森林", compactHide: true },
  { w: "朴素贝叶斯" },
  { w: "t-SNE", compactHide: true },
  { w: "缩放定律" },
  { w: "上下文学习", compactHide: true },
  { w: "一致性哈希" },
  { w: "倒排索引", compactHide: true },
  { w: "马尔可夫" },
  { w: "蒙特卡洛", compactHide: true },
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
/** Fibonacci 球面(纬度带,黄金角均匀分布):词像卫星云绕球自转。
 *  带取赤道及以下半球(y≥-0.05,屏幕向下为正)——球冠与命令行区保持干净。 */
const FIB_Y_MIN = -0.26;
const FIB_Y_MAX = 0.62;
const FIB: { x: number; y: number; z: number }[] = WORDS.map((_, i) => {
  const y = FIB_Y_MAX - (FIB_Y_MAX - FIB_Y_MIN) * ((i + 0.5) / WORDS.length);
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const th = i * Math.PI * (3 - Math.sqrt(5)); // 黄金角
  return { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
});

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

  // —— 轨道词 rAF:Fibonacci 球壳绕 Y 慢转;hover 的词原地冻结(角度滞后),
  //     其余照转、从其身后穿过;松开后滞后指数衰减,平滑归队 ——
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let angle = Math.random() * Math.PI * 2; // 起始相位随机,每次进场布局不同
    const SPEED = 0.13; // rad/s
    const TILT = 0.12; // 轻微倾轴,呼应相机俯角
    const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
    const lag = new Float64Array(FIB.length); // 每词角度滞后(hover 冻结累积)
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { w, h } = size.current;
      if (w > 0) {
        // 球的屏幕标定(与 WGSL 相机一致):中心 59%vh,半径 ~36%vh
        const cx = w / 2;
        const cy = 0.59 * h;
        const ballR = 0.36 * h;
        const R = Math.min(ballR * 1.55, 0.47 * w);
        const dAng = reduced ? 0 : SPEED * dt;
        angle += dAng;
        const hov = hoverRef.current;
        FIB.forEach((p, i) => {
          const el = wordEls.current[i];
          if (!el) return;
          if (hov === i) lag[i] += dAng; // 冻结:把转过的量记为滞后
          else if (lag[i] !== 0) {
            lag[i] *= Math.exp(-2.5 * dt); // 松开:指数归队
            if (Math.abs(lag[i]) < 0.001) lag[i] = 0;
          }
          const a = angle - lag[i];
          const cosA = Math.cos(a), sinA = Math.sin(a);
          // 绕 Y 自转 → 绕 X 倾轴
          const x1 = p.x * cosA + p.z * sinA;
          const z1 = -p.x * sinA + p.z * cosA;
          const y2 = p.y * cosT - z1 * sinT;
          const z2 = p.y * sinT + z1 * cosT;
          // 轻透视(焦距 = 3 壳半径)
          const persp = 3 / (3 - z2);
          const sx = cx + x1 * R * persp;
          const sy = cy + y2 * R * persp;
          const depth = (z2 + 1) / 2; // 0 后 1 前
          const sc = (0.78 + 0.36 * depth) * (hov === i ? 1.16 : 1);
          let o = 0.3 + 0.62 * depth;
          // 后方词穿过球体剪影 → 遮挡淡出(画布不透明,用轮廓判定模拟)
          if (z2 < 0) {
            const distBall = Math.hypot(sx - cx, sy - cy);
            if (distBall < ballR) {
              const edge = Math.min(1, (ballR - distBall) / 26);
              o *= 1 - edge * 0.96;
            }
          }
          el.style.transform =
            `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
          el.style.opacity = (hov === i ? 1 : o).toFixed(3);
          el.style.zIndex = hov === i ? "9" : z2 > 0.02 ? "7" : "5";
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
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
            className={`absolute top-0 left-0 z-[5] will-change-transform ${
              word.compactHide ? "hidden md:block" : ""
            }`}
          >
            <button
              onMouseEnter={() => enter(i)}
              onMouseLeave={leave}
              onTouchStart={() => touch(i)}
              onClick={() => click(word)}
              className={`group relative flex items-baseline gap-0.5 rounded-lg px-2 py-0.5 font-mono text-[11.5px] transition-all md:text-[12.5px] [text-shadow:0_1px_3px_rgba(5,4,3,0.95),0_0_10px_rgba(5,4,3,0.85)] ${
                active ? "bg-ink-950/80 text-cream-1" : "text-cream-4 hover:text-cream-2"
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
