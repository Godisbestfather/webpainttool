// Inkover — paint overlay injected into the current page.
// Running this file again toggles the overlay instead of creating a second one.
(() => {
  if (window.__inkover) {
    window.__inkover.toggle();
    return;
  }

  // ---------- State ----------
  const COLORS = ["#1d1d24", "#ffffff", "#e84832", "#f5a524", "#f7d21e", "#2bb673", "#2f7cf6", "#b04ce8"];
  const SIZES = { pen: 4, highlighter: 22, eraser: 28, line: 4, arrow: 4, rect: 4, ellipse: 4 };
  const state = {
    visible: true,
    tool: "pen",
    color: "#e84832",
    sizes: { ...SIZES },
    fill: false,
    drawing: false,
    points: [],
    start: null,
    undo: [],
    redo: [],
  };
  const MAX_HISTORY = 40;

  // ---------- DOM (isolated in a shadow root so page CSS can't leak in) ----------
  const host = document.createElement("inkover-root");
  host.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  const ICONS = {
    pointer: '<path d="M5 3l14 7-6 2-2 6z"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    highlighter: '<path d="M9 14l-4 4v2h5l3-3"/><path d="M9 14l7-9 3 3-9 7z"/><path d="M4 21h16" opacity=".5"/>',
    eraser: '<path d="M7 20h11"/><path d="M4 15l9-10 7 7-8 8H8z"/><path d="M9 10l6 6"/>',
    line: '<path d="M5 19L19 5"/>',
    arrow: '<path d="M5 19L19 5"/><path d="M10 5h9v9"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
    ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>',
    fill: '<rect x="4" y="6" width="16" height="12" rx="1.5" fill="currentColor"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
    clear: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    save: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  };
  const svg = (name) =>
    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

  const TOOLS = [
    ["pointer", "Use page (V)"],
    ["pen", "Pen (P)"],
    ["highlighter", "Highlighter (H)"],
    ["eraser", "Eraser (E)"],
    ["line", "Line (L)"],
    ["arrow", "Arrow (A)"],
    ["rect", "Rectangle (R)"],
    ["ellipse", "Ellipse (O)"],
  ];

  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
      canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; touch-action: none; }
      #main { pointer-events: auto; }
      #preview { pointer-events: none; }
      .passthrough #main { pointer-events: none; }
      .bar {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
        display: flex; align-items: center; gap: 4px; padding: 6px;
        background: #fbf6ea; color: #1d1d24;
        border: 2px solid #1d1d24; border-radius: 14px;
        box-shadow: 4px 4px 0 #1d1d24;
        pointer-events: auto; user-select: none; font-size: 12px;
      }
      .bar.hidden { display: none; }
      .grip { cursor: grab; color: #8a8576; padding: 4px 2px; display: grid; place-items: center; }
      .grip:active { cursor: grabbing; }
      .sep { width: 1px; align-self: stretch; margin: 4px 3px; background: #d6cfbd; }
      button {
        all: unset; display: grid; place-items: center; width: 32px; height: 32px;
        border-radius: 9px; cursor: pointer; color: #1d1d24; transition: background .12s, transform .12s;
      }
      button:hover { background: #efe6d1; }
      button:active { transform: translateY(1px); }
      button[aria-pressed="true"] { background: #1d1d24; color: #fbf6ea; }
      button:disabled { opacity: .35; cursor: default; background: transparent; }
      .swatches { display: flex; gap: 4px; padding: 0 2px; }
      .sw {
        width: 20px; height: 20px; border-radius: 50%; border: 2px solid #1d1d24;
        cursor: pointer; padding: 0; transition: transform .12s;
      }
      .sw:hover { transform: scale(1.12); }
      .sw[aria-pressed="true"] { box-shadow: 0 0 0 2px #fbf6ea, 0 0 0 4px #1d1d24; }
      .custom { position: relative; width: 20px; height: 20px; border-radius: 50%; border: 2px dashed #1d1d24; overflow: hidden; cursor: pointer;
        background: conic-gradient(#e84832, #f7d21e, #2bb673, #2f7cf6, #b04ce8, #e84832); }
      .custom input { position: absolute; inset: -6px; opacity: 0; cursor: pointer; width: 40px; height: 40px; }
      .size { display: flex; align-items: center; gap: 6px; padding: 0 4px; }
      .size input { width: 84px; accent-color: #e84832; }
      .dot { width: 22px; height: 22px; display: grid; place-items: center; }
      .dot span { display: block; border-radius: 50%; background: currentColor; }
      .toast {
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: #1d1d24; color: #fbf6ea; padding: 8px 14px; border-radius: 10px;
        font-size: 13px; opacity: 0; transition: opacity .2s; pointer-events: none;
      }
      .toast.show { opacity: 1; }
    </style>
    <div id="wrap">
      <canvas id="main"></canvas>
      <canvas id="preview"></canvas>
      <div class="bar" id="bar">
        <div class="grip" id="grip" title="Drag to move">${svg("grip")}</div>
        ${TOOLS.map(([t, label]) => `<button data-tool="${t}" title="${label}" aria-label="${label}">${svg(t)}</button>`).join("")}
        <button id="fill" title="Fill shapes (F)" aria-label="Fill shapes">${svg("fill")}</button>
        <div class="sep"></div>
        <div class="swatches">
          ${COLORS.map((c) => `<button class="sw" data-color="${c}" style="background:${c}" title="${c}" aria-label="Color ${c}"></button>`).join("")}
          <label class="custom" title="Custom color"><input type="color" id="picker" value="#e84832"></label>
        </div>
        <div class="sep"></div>
        <div class="size">
          <div class="dot" id="dot"><span></span></div>
          <input type="range" id="size" min="1" max="80" title="Brush size ([ / ])">
        </div>
        <div class="sep"></div>
        <button id="undo" title="Undo (Ctrl+Z)" aria-label="Undo">${svg("undo")}</button>
        <button id="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${svg("redo")}</button>
        <button id="clear" title="Clear all" aria-label="Clear all">${svg("clear")}</button>
        <button id="save" title="Save screenshot (S)" aria-label="Save screenshot">${svg("save")}</button>
        <div class="sep"></div>
        <button id="close" title="Close (Esc)" aria-label="Close">${svg("close")}</button>
      </div>
      <div class="toast" id="toast"></div>
    </div>
  `;

  const $ = (sel) => root.querySelector(sel);
  const wrap = $("#wrap");
  const main = $("#main");
  const preview = $("#preview");
  const bar = $("#bar");
  const ctx = main.getContext("2d");
  const pctx = preview.getContext("2d");
  const sizeInput = $("#size");
  const picker = $("#picker");

  // ---------- Canvas sizing (HiDPI aware, keeps drawing on resize) ----------
  let dpr = window.devicePixelRatio || 1;
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const nextDpr = window.devicePixelRatio || 1;
    const snapshot = document.createElement("canvas");
    snapshot.width = main.width;
    snapshot.height = main.height;
    if (main.width && main.height) snapshot.getContext("2d").drawImage(main, 0, 0);
    for (const c of [main, preview]) {
      c.width = Math.round(w * nextDpr);
      c.height = Math.round(h * nextDpr);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (snapshot.width) ctx.drawImage(snapshot, 0, 0, snapshot.width * (nextDpr / dpr), snapshot.height * (nextDpr / dpr));
    dpr = nextDpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // ---------- History ----------
  function snapshot() {
    return ctx.getImageData(0, 0, main.width, main.height);
  }
  function pushHistory() {
    state.undo.push(snapshot());
    if (state.undo.length > MAX_HISTORY) state.undo.shift();
    state.redo = [];
    syncButtons();
  }
  function restore(img) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, main.width, main.height);
    if (img) ctx.putImageData(img, 0, 0);
    ctx.restore();
  }
  function undo() {
    if (!state.undo.length) return;
    state.redo.push(snapshot());
    restore(state.undo.pop());
    syncButtons();
  }
  function redo() {
    if (!state.redo.length) return;
    state.undo.push(snapshot());
    restore(state.redo.pop());
    syncButtons();
  }
  function clearAll() {
    pushHistory();
    restore(null);
    toast("Cleared — Ctrl+Z to bring it back");
  }

  // ---------- Drawing ----------
  const size = () => state.sizes[state.tool] || 4;
  const isShape = (t) => t === "line" || t === "arrow" || t === "rect" || t === "ellipse";

  function strokeStyle(c) {
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = state.color;
    c.fillStyle = state.color;
    c.lineWidth = size();
  }

  function drawFreehand(c, pts) {
    if (!pts.length) return;
    c.beginPath();
    if (pts.length < 3) {
      const p = pts[0];
      c.arc(p.x, p.y, c.lineWidth / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last.x, last.y);
    c.stroke();
  }

  function drawShape(c, a, b, shift) {
    let x2 = b.x;
    let y2 = b.y;
    if (shift) {
      if (state.tool === "rect" || state.tool === "ellipse") {
        const d = Math.max(Math.abs(x2 - a.x), Math.abs(y2 - a.y));
        x2 = a.x + d * Math.sign(x2 - a.x || 1);
        y2 = a.y + d * Math.sign(y2 - a.y || 1);
      } else {
        // snap lines to 45° steps
        const ang = Math.round(Math.atan2(y2 - a.y, x2 - a.x) / (Math.PI / 4)) * (Math.PI / 4);
        const len = Math.hypot(x2 - a.x, y2 - a.y);
        x2 = a.x + Math.cos(ang) * len;
        y2 = a.y + Math.sin(ang) * len;
      }
    }
    c.beginPath();
    if (state.tool === "line" || state.tool === "arrow") {
      c.moveTo(a.x, a.y);
      c.lineTo(x2, y2);
      c.stroke();
      if (state.tool === "arrow") {
        const ang = Math.atan2(y2 - a.y, x2 - a.x);
        const head = Math.max(12, c.lineWidth * 3.2);
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x2 - head * Math.cos(ang - Math.PI / 7), y2 - head * Math.sin(ang - Math.PI / 7));
        c.lineTo(x2 - head * Math.cos(ang + Math.PI / 7), y2 - head * Math.sin(ang + Math.PI / 7));
        c.closePath();
        c.fill();
        c.stroke();
      }
      return;
    }
    if (state.tool === "rect") {
      c.rect(Math.min(a.x, x2), Math.min(a.y, y2), Math.abs(x2 - a.x), Math.abs(y2 - a.y));
    } else {
      c.ellipse((a.x + x2) / 2, (a.y + y2) / 2, Math.abs(x2 - a.x) / 2, Math.abs(y2 - a.y) / 2, 0, 0, Math.PI * 2);
    }
    if (state.fill) c.fill();
    else c.stroke();
  }

  function clearPreview() {
    pctx.save();
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.restore();
  }

  function renderPreview(shift) {
    clearPreview();
    strokeStyle(pctx);
    if (state.tool === "pen" || state.tool === "highlighter") {
      if (state.tool === "highlighter") pctx.lineCap = "square";
      drawFreehand(pctx, state.points);
    } else if (isShape(state.tool) && state.start && state.points.length) {
      drawShape(pctx, state.start, state.points[state.points.length - 1], shift);
    }
  }

  function commitPreview() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = state.tool === "highlighter" ? 0.38 : 1;
    if (state.tool === "highlighter") ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(preview, 0, 0);
    ctx.restore();
    clearPreview();
  }

  function eraseSegment(a, b) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function pos(e) {
    return { x: e.clientX, y: e.clientY };
  }

  main.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || state.tool === "pointer") return;
    e.preventDefault();
    main.setPointerCapture(e.pointerId);
    pushHistory();
    state.drawing = true;
    const p = pos(e);
    state.start = p;
    state.points = [p];
    preview.style.opacity = state.tool === "highlighter" ? "0.38" : "1";
    if (state.tool === "eraser") eraseSegment(p, p);
    else renderPreview(e.shiftKey);
  });

  main.addEventListener("pointermove", (e) => {
    if (!state.drawing) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const p = pos(ev);
      if (state.tool === "eraser") {
        eraseSegment(state.points[state.points.length - 1], p);
      }
      state.points.push(p);
    }
    if (state.tool !== "eraser") renderPreview(e.shiftKey);
  });

  function endStroke() {
    if (!state.drawing) return;
    state.drawing = false;
    if (state.tool !== "eraser") commitPreview();
    state.points = [];
    state.start = null;
  }
  main.addEventListener("pointerup", endStroke);
  main.addEventListener("pointercancel", endStroke);

  // ---------- Toolbar ----------
  function setTool(t) {
    state.tool = t;
    wrap.classList.toggle("passthrough", t === "pointer");
    main.style.cursor = t === "pointer" ? "default" : t === "eraser" ? cursorFor("eraser") : "crosshair";
    syncButtons();
  }

  function cursorFor() {
    const s = Math.max(8, Math.min(size(), 96));
    const half = s / 2;
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${s + 2}" height="${s + 2}"><circle cx="${half + 1}" cy="${half + 1}" r="${half}" fill="rgba(255,255,255,.4)" stroke="#1d1d24" stroke-width="1.5"/></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}") ${half + 1} ${half + 1}, crosshair`;
  }

  function setColor(c) {
    state.color = c;
    if (state.tool === "eraser" || state.tool === "pointer") setTool("pen");
    syncButtons();
  }

  function setSize(v) {
    if (state.tool === "pointer") return;
    state.sizes[state.tool] = Math.max(1, Math.min(80, v));
    if (state.tool === "eraser") main.style.cursor = cursorFor();
    syncButtons();
  }

  function syncButtons() {
    root.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === state.tool)));
    root.querySelectorAll("[data-color]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.color.toLowerCase() === state.color.toLowerCase())),
    );
    $("#fill").setAttribute("aria-pressed", String(state.fill));
    $("#undo").disabled = !state.undo.length;
    $("#redo").disabled = !state.redo.length;
    sizeInput.disabled = state.tool === "pointer";
    sizeInput.value = String(size());
    const d = Math.max(3, Math.min(size(), 22));
    const dot = $("#dot span");
    dot.style.width = d + "px";
    dot.style.height = d + "px";
    dot.style.color = state.tool === "eraser" ? "#8a8576" : state.color;
    dot.style.opacity = state.tool === "highlighter" ? ".5" : "1";
  }

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.tool) setTool(btn.dataset.tool);
    else if (btn.dataset.color) setColor(btn.dataset.color);
    else if (btn.id === "fill") {
      state.fill = !state.fill;
      syncButtons();
    } else if (btn.id === "undo") undo();
    else if (btn.id === "redo") redo();
    else if (btn.id === "clear") clearAll();
    else if (btn.id === "save") save();
    else if (btn.id === "close") hide();
  });
  picker.addEventListener("input", () => setColor(picker.value));
  sizeInput.addEventListener("input", () => setSize(Number(sizeInput.value)));

  // Drag the toolbar by its grip.
  (() => {
    const grip = $("#grip");
    let drag = null;
    grip.addEventListener("pointerdown", (e) => {
      const r = bar.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const x = Math.max(4, Math.min(window.innerWidth - bar.offsetWidth - 4, e.clientX - drag.dx));
      const y = Math.max(4, Math.min(window.innerHeight - bar.offsetHeight - 4, e.clientY - drag.dy));
      bar.style.left = x + "px";
      bar.style.top = y + "px";
      bar.style.transform = "none";
    });
    grip.addEventListener("pointerup", () => (drag = null));
  })();

  // ---------- Save screenshot ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function save() {
    bar.classList.add("hidden");
    // Wait two frames so the toolbar is gone from the capture.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        chrome.runtime.sendMessage({ type: "inkover:capture" }, (res) => {
          bar.classList.remove("hidden");
          if (!res || !res.ok) {
            toast("Couldn't capture this page");
            return;
          }
          const a = document.createElement("a");
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
          a.href = res.dataUrl;
          a.download = `inkover-${stamp}.png`;
          a.click();
          toast("Screenshot saved");
        });
      }),
    );
  }

  // ---------- Keyboard ----------
  const KEYS = { v: "pointer", p: "pen", h: "highlighter", e: "eraser", l: "line", a: "arrow", r: "rect", o: "ellipse" };
  function onKey(e) {
    if (!state.visible) return;
    const t = e.composedPath()[0];
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && t !== sizeInput) return;
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    let handled = true;
    if (mod && k === "z") e.shiftKey ? redo() : undo();
    else if (mod && k === "y") redo();
    else if (mod) handled = false;
    else if (k === "escape") hide();
    else if (KEYS[k] && !e.altKey) setTool(KEYS[k]);
    else if (k === "f") {
      state.fill = !state.fill;
      syncButtons();
    } else if (k === "s") save();
    else if (k === "[") setSize(size() - 2);
    else if (k === "]") setSize(size() + 2);
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  window.addEventListener("keydown", onKey, true);

  // ---------- Show / hide ----------
  function show() {
    state.visible = true;
    host.style.display = "";
    resize();
  }
  function hide() {
    state.visible = false;
    endStroke();
    host.style.display = "none";
  }
  function toggle() {
    state.visible ? hide() : show();
  }

  window.__inkover = { toggle };
  setTool("pen");
  toast("Paint mode on — press Esc to hide");
})();
