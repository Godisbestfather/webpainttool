import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Camera,
  Circle,
  Download,
  Eraser,
  Highlighter,
  MousePointer2,
  Move,
  Pen,
  Square,
  Undo2,
} from "lucide-react";
import { DemoCanvas } from "@/components/DemoCanvas";
import logo from "@/assets/inkover-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inkover — Paint on any webpage (Chrome extension)" },
      {
        name: "description",
        content:
          "Inkover is a free Chrome extension that lets you draw, highlight, add arrows and shapes on top of any webpage, then save a screenshot.",
      },
      { property: "og:title", content: "Inkover — Paint on any webpage" },
      {
        property: "og:description",
        content: "Draw, highlight and sketch on any website. Free Chrome extension.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ZIP_NAME = "inkover-extension.zip";

const FEATURES = [
  { icon: Pen, title: "Smooth pen", body: "Buttery strokes with automatic curve smoothing." },
  { icon: Highlighter, title: "Highlighter", body: "See-through marker that never hides the text below." },
  { icon: ArrowUpRight, title: "Arrows & lines", body: "Hold Shift to snap to perfect 45° angles." },
  { icon: Square, title: "Boxes & circles", body: "Outline or filled. Shift keeps them square." },
  { icon: Eraser, title: "Eraser", body: "Rub out any part of your drawing." },
  { icon: Undo2, title: "Undo & redo", body: "Forty steps of history, so mistakes cost nothing." },
  { icon: Camera, title: "Save screenshot", body: "One click saves the page plus your drawing as a PNG." },
  { icon: MousePointer2, title: "Use the page", body: "Switch to pointer mode to click and scroll, drawing stays." },
];

const SHORTCUTS: [string[], string][] = [
  [["Alt", "Shift", "P"], "Turn paint mode on / off"],
  [["P"], "Pen"],
  [["H"], "Highlighter"],
  [["E"], "Eraser"],
  [["A"], "Arrow"],
  [["L"], "Line"],
  [["R"], "Rectangle"],
  [["O"], "Ellipse"],
  [["F"], "Fill shapes"],
  [["V"], "Use the page"],
  [["[", "]"], "Brush size"],
  [["Ctrl", "Z"], "Undo"],
  [["S"], "Save screenshot"],
  [["Esc"], "Hide"],
];

function Index() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const download = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/${ZIP_NAME}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = ZIP_NAME;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen paper-grid">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="size-9" />
          <span className="font-display text-xl font-extrabold tracking-tight">Inkover</span>
        </div>
        <button onClick={download} className="btn-ink btn-paper !px-4 !py-2 text-sm">
          <Download className="size-4" /> Get it free
        </button>
      </header>

      {/* Hero */}
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1fr_1.1fr] lg:pt-16">
          <div>
            <p className="font-hand text-3xl text-primary">a Chrome extension</p>
            <h1 className="mt-2 text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl">
              Paint on <span className="highlight">any</span> webpage.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Circle the bug, point at the button, scribble a note. Inkover puts a sketchbook layer over
              every site — then saves it as a screenshot.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button onClick={download} disabled={status === "loading"} className="btn-ink btn-primary text-lg">
                <Download className="size-5" />
                {status === "loading" ? "Preparing…" : "Download for Chrome"}
              </button>
              <a href="#install" className="font-display font-bold underline decoration-2 underline-offset-4">
                How to install
              </a>
            </div>
            {status === "error" && (
              <p className="mt-3 text-sm text-destructive">Download failed — please try again.</p>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Works in Chrome, Edge, Brave, Arc &amp; Opera · Free · No account
            </p>
          </div>

          <DemoCanvas />
        </section>

        {/* Features */}
        <section className="border-y-2 border-ink bg-card">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-4xl font-extrabold sm:text-5xl">
              Every tool you reach for. <span className="font-hand font-bold text-marker-blue">Nothing more.</span>
            </h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <div
                  key={title}
                  className="sketch-card p-5 transition-transform hover:-translate-y-1"
                  style={{ rotate: `${[-1, 0.8, -0.5, 1][i % 4]}deg` }}
                >
                  <div className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-accent">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Install + shortcuts */}
        <section id="install" className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-extrabold">Install in a minute</h2>
            <ol className="mt-8 space-y-5">
              {[
                <>Download and <b>unzip</b> the file.</>,
                <>
                  Open <code className="rounded border-2 border-ink bg-card px-1.5 py-0.5 text-sm">chrome://extensions</code>{" "}
                  in your browser.
                </>,
                <>Turn on <b>Developer mode</b> (top-right switch).</>,
                <>Click <b>Load unpacked</b> and pick the unzipped folder.</>,
                <>Pin Inkover, open any site and click the icon — start drawing.</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-primary font-display font-extrabold text-primary-foreground shadow-hard">
                    {i + 1}
                  </span>
                  <span className="pt-1.5 text-lg">{step}</span>
                </li>
              ))}
            </ol>
            <button onClick={download} className="btn-ink btn-paper mt-10">
              <Download className="size-5" /> Download {ZIP_NAME}
            </button>
          </div>

          <div className="sketch-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-extrabold">Keyboard shortcuts</h3>
              <Move className="size-5 text-muted-foreground" />
            </div>
            <ul className="mt-6 divide-y-2 divide-dashed divide-input">
              {SHORTCUTS.map(([keys, label]) => (
                <li key={label} className="flex items-center justify-between py-2.5">
                  <span>{label}</span>
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="kbd">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Circle className="size-3 fill-current" /> Drag the toolbar by its dotted handle to move it.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-ink bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span className="font-hand text-2xl text-foreground">Inkover</span>
          <span>Chrome blocks extensions on chrome:// pages and the Web Store.</span>
        </div>
      </footer>
    </div>
  );
}
