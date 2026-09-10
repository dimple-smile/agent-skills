import { Lock } from "lucide-react";
import type { ReactNode } from "react";

interface BrowserFrameProps {
  url: string;
  src: string;
  alt: string;
  className?: string;
  /** 顶部工具列右侧的附加内容 */
  right?: ReactNode;
}

/** 浏览器样机框:红绿灯 + 地址栏 + 截图 */
export function BrowserFrame({ url, src, alt, className = "", right }: BrowserFrameProps) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-line bg-ink-850 shadow-frame ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-line bg-ink-800 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-line/70 bg-ink-900/70 px-3 py-1">
          <Lock size={10} className="shrink-0 text-mint" />
          <span className="truncate font-mono text-[11px] text-cream-3">{url}</span>
        </div>
        {right}
      </div>
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </figure>
  );
}
