import { useEffect, useRef, useState } from "react";
import { Eraser, Highlighter, Pen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "highlighter" | "eraser";
const COLORS = [
  { token: "--ink", className: "bg-ink" },
  { token: "--marker-red", className: "bg-marker-red" },
  { token: "--marker-blue", className: "bg-marker-blue" },
  { token: "--marker-green", className: "bg-marker-green" },
  { token: "--marker-yellow", className: "bg-marker-yellow" },
];

/** A tiny in-page version of the extension so visitors can try it right away. */
export function DemoCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("--marker-red");
  const [touched, setTouched] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const prev = document.createElement("canvas");
      prev.width = canvas.width;
      prev.height = canvas.height;
      if (canvas.width) prev.getContext("2d")?.drawImage(canvas, 0, 0);
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (prev.width) ctx.drawImage(prev, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const value = getComputedStyle(document.documentElement).getPropertyValue(color).trim();
    ctx.save();
    ctx.lineCap = tool === "highlighter" ? "square" : "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = value;
    ctx.lineWidth = tool === "pen" ? 4 : tool === "highlighter" ? 20 : 30;
    if (tool === "highlighter") {
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = "multiply";
    }
    if (tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };

  const clear = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  };

  return (
    <div className="sketch-card overflow-hidden shadow-hard-lg">
      {/* Fake browser chrome */}
      <div className="flex items-center gap-2 border-b-2 border-ink bg-secondary px-4 py-3">
        <span className="size-3 rounded-full border-2 border-ink bg-marker-red" />
        <span className="size-3 rounded-full border-2 border-ink bg-marker-yellow" />
        <span className="size-3 rounded-full border-2 border-ink bg-marker-green" />
        <div className="ml-3 flex-1 truncate rounded-full border-2 border-ink bg-card px-3 py-1 text-xs text-muted-foreground">
          https://any-website.com/article
        </div>
      </div>

      <div className="relative h-[340px] select-none bg-card sm:h-[380px]">
        {/* Fake page content */}
        <div className="pointer-events-none space-y-4 p-6 sm:p-8">
          <div className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            Quarterly design review
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            The new checkout flow reduced drop-off by 18%. We still need to revisit the shipping step
            and the confirmation screen before launch.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[64, 82, 48].map((h, i) => (
              <div key={i} className="flex h-24 items-end rounded-lg border-2 border-ink bg-secondary p-2">
                <div className="w-full rounded bg-marker-blue" style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          aria-label="Drawing area — try drawing here"
          className={cn("absolute inset-0 size-full touch-none", tool === "eraser" ? "cursor-cell" : "cursor-crosshair")}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            setTouched(true);
            const p = point(e);
            last.current = p;
            stroke(p, p);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const p = point(e);
            stroke(last.current, p);
            last.current = p;
          }}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
          }}
        />

        {!touched && (
          <div className="pointer-events-none absolute right-6 top-16 rotate-[-6deg] font-hand text-3xl text-primary animate-wiggle">
            try drawing here ↓
          </div>
        )}

        {/* Mini toolbar */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl border-2 border-ink bg-paper p-1.5 shadow-hard">
          {(
            [
              ["pen", Pen],
              ["highlighter", Highlighter],
              ["eraser", Eraser],
            ] as const
          ).map(([t, Icon]) => (
            <button
              key={t}
              aria-label={t}
              aria-pressed={tool === t}
              onClick={() => setTool(t)}
              className={cn(
                "grid size-8 place-items-center rounded-lg transition-colors",
                tool === t ? "bg-ink text-paper" : "hover:bg-secondary",
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
          <div className="mx-1 h-6 w-px bg-input" />
          {COLORS.map((c) => (
            <button
              key={c.token}
              aria-label={`color ${c.token.replace("--", "")}`}
              aria-pressed={color === c.token}
              onClick={() => {
                setColor(c.token);
                if (tool === "eraser") setTool("pen");
              }}
              className={cn(
                "size-5 rounded-full border-2 border-ink transition-transform hover:scale-110",
                c.className,
                color === c.token && "ring-2 ring-ink ring-offset-2 ring-offset-paper",
              )}
            />
          ))}
          <div className="mx-1 h-6 w-px bg-input" />
          <button aria-label="clear" onClick={clear} className="grid size-8 place-items-center rounded-lg hover:bg-secondary">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
