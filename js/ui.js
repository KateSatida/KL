// Small UI helpers shared by every screen and station.

export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

let closeHandler = null;

export function openModal(title, body, onClose) {
  closeModal();
  $("#modal-title").textContent = title;
  const box = $("#modal-body");
  box.replaceChildren(body);
  $("#modal").classList.remove("hidden");
  closeHandler = onClose || null;
  document.dispatchEvent(new Event("modalopen"));
}

export function closeModal() {
  if (!$("#modal") || $("#modal").classList.contains("hidden")) return;
  $("#modal").classList.add("hidden");
  $("#modal-body").replaceChildren();
  const fn = closeHandler;
  closeHandler = null;
  if (fn) fn();
}

export const isModalOpen = () => !$("#modal").classList.contains("hidden");

$("#modal .modal-close")?.addEventListener("click", closeModal);
$("#modal")?.addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

let toastTimer;
export function toast(text, ms = 2500) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
}

// Simple tab bar. tabs = [{id, label, render: () => Node}]
export function tabs(list) {
  const bar = el("div", { class: "tabs" });
  const content = el("div");
  const show = (id) => {
    for (const b of bar.children) b.classList.toggle("active", b.dataset.id === id);
    content.replaceChildren(list.find((t) => t.id === id).render());
  };
  for (const t of list) bar.append(el("button", { class: "tab", "data-id": t.id, onclick: () => show(t.id) }, t.label));
  show(list[0].id);
  return el("div", {}, bar, content);
}

export const canvasToJpeg = (canvas, quality = 0.88) =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

// Read an image file and shrink it to a small JPEG so uploads stay fast.
export function fileToJpeg(file, maxSize = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      canvasToJpeg(c, quality).then(resolve);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function timeAgo(date) {
  const seconds = new Date(date).getTime() / 1000;
  const d = Date.now() / 1000 - seconds;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  return new Date(seconds * 1000).toLocaleDateString();
}

// Saved settings on this device (name, outfit, …). Never throws.
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};
