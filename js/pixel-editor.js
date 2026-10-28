// 32x32 pixel drawing pad. Works with mouse, finger and stylus.
import { el } from "./ui.js";
import { SIZE } from "./sprites.js";

const PALETTE = [
  "#000000", "#3b2a2a", "#7a5a4a", "#ffffff", "#9e9e9e", "#ff5d8f", "#ff8fab", "#d23a4a",
  "#ff9f43", "#ffd166", "#b5e48c", "#6a994e", "#8ec9f0", "#2a3d6b", "#a77bd6", "#f7d2b3",
];

// guide: optional canvas shown faintly underneath (your character)
// initial: optional data URL to continue a previous drawing
export function pixelEditor({ guide, initial, onDone }) {
  const pixels = document.createElement("canvas");  // the real 32x32 drawing
  pixels.width = pixels.height = SIZE;
  const pctx = pixels.getContext("2d");

  const view = el("canvas", { width: 320, height: 320 });
  const vctx = view.getContext("2d");
  vctx.imageSmoothingEnabled = false;

  let color = PALETTE[5];
  let tool = "pen";
  let showGuide = true;
  const history = [];

  const render = () => {
    vctx.clearRect(0, 0, 320, 320);
    if (guide && showGuide) {
      vctx.globalAlpha = 0.35;
      vctx.drawImage(guide, 0, 0, 320, 320);
      vctx.globalAlpha = 1;
    }
    vctx.drawImage(pixels, 0, 0, 320, 320);
    vctx.strokeStyle = "#00000010";
    for (let i = 0; i <= SIZE; i++) {
      vctx.beginPath(); vctx.moveTo(i * 10, 0); vctx.lineTo(i * 10, 320); vctx.stroke();
      vctx.beginPath(); vctx.moveTo(0, i * 10); vctx.lineTo(320, i * 10); vctx.stroke();
    }
  };

  const snapshot = () => {
    history.push(pctx.getImageData(0, 0, SIZE, SIZE));
    if (history.length > 50) history.shift();
  };

  const cellAt = (e) => {
    const r = view.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / r.width * SIZE), Math.floor((e.clientY - r.top) / r.height * SIZE)];
  };

  const paint = (x, y) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    if (tool === "eraser") pctx.clearRect(x, y, 1, 1);
    else { pctx.fillStyle = color; pctx.fillRect(x, y, 1, 1); }
  };

  const fill = (x, y) => {
    const img = pctx.getImageData(0, 0, SIZE, SIZE);
    const d = img.data;
    const at = (i) => d.slice(i * 4, i * 4 + 4).join();
    const target = at(y * SIZE + x);
    const c = color.match(/\w\w/g).map((h) => parseInt(h, 16)).concat(255);
    if (target === c.join()) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) continue;
      const i = cy * SIZE + cx;
      if (at(i) !== target) continue;
      d.set(c, i * 4);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    pctx.putImageData(img, 0, 0);
  };

  let drawing = false;
  view.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    view.setPointerCapture(e.pointerId);
    snapshot();
    const [x, y] = cellAt(e);
    if (tool === "fill") { fill(x, y); render(); return; }
    drawing = true;
    paint(x, y);
    render();
  });
  view.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    paint(...cellAt(e));
    render();
  });
  view.addEventListener("pointerup", () => { drawing = false; });

  const swatches = el("div", { class: "palette" });
  const picker = el("input", { type: "color", value: color, title: "Any colour" });
  const selectColor = (c) => {
    color = c;
    picker.value = c;
    if (tool === "eraser") setTool("pen");
    for (const s of swatches.children) s.classList.toggle("selected", s.dataset.c === c);
  };
  for (const c of PALETTE) {
    swatches.append(el("button", { class: "swatch", style: `background:${c}`, "data-c": c, onclick: () => selectColor(c) }));
  }
  picker.addEventListener("input", () => selectColor(picker.value));

  const toolButtons = {};
  const setTool = (t) => {
    tool = t;
    for (const [k, b] of Object.entries(toolButtons)) b.classList.toggle("active", k === t);
  };
  for (const [t, label] of [["pen", "✏️ Pen"], ["eraser", "🧽 Eraser"], ["fill", "🪣 Fill"]]) {
    toolButtons[t] = el("button", { class: "tab", onclick: () => setTool(t) }, label);
  }
  setTool("pen");
  selectColor(color);

  const undo = () => { if (history.length) { pctx.putImageData(history.pop(), 0, 0); render(); } };
  const clear = () => { snapshot(); pctx.clearRect(0, 0, SIZE, SIZE); render(); };
  const toggleGuide = () => { showGuide = !showGuide; render(); };

  if (initial) {
    const img = new Image();
    img.onload = () => { pctx.drawImage(img, 0, 0); render(); };
    img.src = initial;
  }
  render();

  const isEmpty = () => !pctx.getImageData(0, 0, SIZE, SIZE).data.some((v, i) => i % 4 === 3 && v);

  return el("div", { class: "pixel-editor" },
    el("div", { class: "row" }, Object.values(toolButtons), picker),
    view,
    swatches,
    el("div", { class: "row" },
      el("button", { class: "btn small", onclick: undo }, "↩ Undo"),
      el("button", { class: "btn small", onclick: clear }, "🗑 Clear"),
      guide ? el("button", { class: "btn small", onclick: toggleGuide }, "👤 Guide on/off") : null,
      el("button", { class: "btn small primary", onclick: () => onDone(isEmpty() ? null : pixels.toDataURL("image/png")) }, "✔ Use drawing"),
    ),
  );
}
