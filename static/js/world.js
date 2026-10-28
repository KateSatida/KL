// The game world: map, players, movement, and drawing everything on the canvas.
import { composeLook, loadImage, SIZE } from "./sprites.js";
import { isModalOpen } from "./ui.js";

const NEAR_STATION = 50;   // how close (px) you must be to use a station

export class World {
  constructor(canvas, config, stations) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.config = config;
    this.w = config.world;
    this.stations = stations;      // [{def, module}]
    this.players = new Map();      // id -> player
    this.me = null;
    this.keys = new Set();
    this.target = null;            // tap-to-walk destination
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.nearStation = null;
    this.onNearStation = () => {};
    this.onMove = () => {};
    this.background = null;
    if (this.w.background) loadImage(this.w.background).then((img) => { this.background = img; });

    addEventListener("resize", () => this.resize());
    addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea") || isModalOpen()) return;
      this.keys.add(e.key.toLowerCase());
      if ((e.key === "e" || e.key === "Enter") && this.nearStation) this.nearStation.open();
    });
    addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener("blur", () => this.keys.clear());
    canvas.addEventListener("pointerdown", (e) => this.onPointer(e));
    this.resize();
  }

  resize() {
    const dpr = devicePixelRatio || 1;
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    // Zoom so the view feels the same on phones and big screens.
    this.camera.zoom = Math.max(0.7, Math.min(1.3, Math.min(innerWidth / 900, innerHeight / 650))) * dpr;
  }

  toWorld(clientX, clientY) {
    const dpr = devicePixelRatio || 1;
    const z = this.camera.zoom;
    return { x: clientX * dpr / z + this.camera.x, y: clientY * dpr / z + this.camera.y };
  }

  onPointer(e) {
    const p = this.toWorld(e.clientX, e.clientY);
    // Tapping a station's custom area (e.g. projector) first
    for (const s of this.stations) {
      if (s.module.onClick && inside(p, s.def, 0) && s.module.onClick(p)) return;
    }
    this.target = p;
  }

  // ---- players --------------------------------------------------------------
  async upsertPlayer(data, isMe = false) {
    const existing = this.players.get(data.id);
    const p = existing || { ...data, rx: data.x, ry: data.y, bubble: null, sprite: null };
    Object.assign(p, data);
    if (isMe) { this.me = p; p.rx = p.x; p.ry = p.y; }
    this.players.set(p.id, p);
    p.sprite = await composeLook(p.look);
    return p;
  }

  removePlayer(id) { this.players.delete(id); }

  showBubble(id, text) {
    const p = this.players.get(id);
    if (p) p.bubble = { text, until: performance.now() + 6000 };
  }

  nearbyPlayers(radius) {
    if (!this.me) return [];
    return [...this.players.values()].filter((p) => p !== this.me && dist(p, this.me) <= radius);
  }

  // ---- loop -----------------------------------------------------------------
  start() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.draw(now);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    const me = this.me;
    if (!me) return;
    let dx = 0, dy = 0;
    const k = this.keys;
    if (!isModalOpen()) {
      if (k.has("arrowleft") || k.has("a")) dx -= 1;
      if (k.has("arrowright") || k.has("d")) dx += 1;
      if (k.has("arrowup") || k.has("w")) dy -= 1;
      if (k.has("arrowdown") || k.has("s")) dy += 1;
    }
    if (dx || dy) this.target = null;
    else if (this.target) {
      const tx = this.target.x - me.x, ty = this.target.y - me.y;
      const d = Math.hypot(tx, ty);
      if (d < 4) this.target = null; else { dx = tx / d; dy = ty / d; }
    }
    const len = Math.hypot(dx, dy);
    const moving = len > 0;
    if (moving) {
      const step = this.w.speed * dt / len;
      me.x = clamp(me.x + dx * step, 16, this.w.width - 16);
      me.y = clamp(me.y + dy * step, 40, this.w.height - 8);
      if (dx) me.dir = dx < 0 ? -1 : 1;
    }
    if (moving !== me.moving || moving) { me.moving = moving; this.onMove(me); }
    me.rx = me.x; me.ry = me.y;

    // Smoothly slide other players toward their latest position
    for (const p of this.players.values()) {
      if (p === me) continue;
      p.rx += (p.x - p.rx) * Math.min(1, dt * 10);
      p.ry += (p.y - p.ry) * Math.min(1, dt * 10);
    }

    // Which station am I standing at?
    const near = this.stations.find((s) => s.module.open && inside(me, s.def, NEAR_STATION)) || null;
    if (near !== this.nearStation) { this.nearStation = near; this.onNearStation(near); }

    // Camera follows me
    const z = this.camera.zoom;
    const vw = this.canvas.width / z, vh = this.canvas.height / z;
    this.camera.x = this.w.width < vw ? (this.w.width - vw) / 2 : clamp(me.x - vw / 2, 0, this.w.width - vw);
    this.camera.y = this.w.height < vh ? (this.w.height - vh) / 2 : clamp(me.y - vh / 2, 0, this.w.height - vh);
  }

  draw(now) {
    const { ctx, camera } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#e9d6cc";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, -camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.imageSmoothingEnabled = false;

    this.drawFloor();
    for (const s of this.stations) (s.module.draw || drawStation)(ctx, s.def, now, this);
    for (const d of this.config.decorations || []) {
      ctx.font = `${d.size || 32}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(d.emoji, d.x, d.y);
    }

    const scale = this.w.spriteScale;
    const statusR = this.w.statusRadius;
    const sorted = [...this.players.values()].sort((a, b) => a.ry - b.ry);
    for (const p of sorted) {
      const size = SIZE * scale;
      const bob = p.moving ? Math.abs(Math.sin(now / 90)) * 3 : 0;
      const x = p.rx, y = p.ry;
      // shadow
      ctx.fillStyle = "#00000022";
      ctx.beginPath(); ctx.ellipse(x, y, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (p.sprite) {
        ctx.save();
        ctx.translate(x, y - size - bob + 2);
        if (p.dir === -1) { ctx.scale(-1, 1); ctx.translate(-size / 2, 0); } else ctx.translate(-size / 2, 0);
        ctx.drawImage(p.sprite, 0, 0, size, size);
        ctx.restore();
      }
      label(ctx, p.name, x, y + 16, p === this.me ? "#c2577a" : "#4a3640");
      const near = p === this.me || (this.me && dist(p, this.me) <= statusR);
      const bubble = p.bubble && p.bubble.until > now ? p.bubble.text : null;
      if (bubble) speech(ctx, bubble, x, y - size - 8, "#ffffff");
      else if (p.status && near) speech(ctx, p.status, x, y - size - 8, "#fff6d6");
    }
  }

  drawFloor() {
    const { ctx, w } = this;
    if (this.background) { ctx.drawImage(this.background, 0, 0, w.width, w.height); return; }
    ctx.fillStyle = w.floorColor;
    ctx.fillRect(0, 0, w.width, w.height);
    ctx.fillStyle = w.floorPattern;
    for (let y = 0; y < w.height; y += 80) {
      for (let x = (y / 80) % 2 ? 0 : 40; x < w.width; x += 80) ctx.fillRect(x, y, 40, 40);
    }
    // aisle carpet
    ctx.fillStyle = "#e9a7b866";
    ctx.fillRect(w.width / 2 - 60, 300, 120, w.height - 300);
    ctx.strokeStyle = "#c8a68e";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w.width - 8, w.height - 8);
  }
}

// ---- drawing helpers (also used by station modules) ---------------------------

export function drawStation(ctx, s) {
  ctx.fillStyle = s.color || "#fff";
  roundRect(ctx, s.x, s.y, s.w, s.h, 18);
  ctx.fill();
  ctx.strokeStyle = "#00000022";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = "56px serif";
  ctx.fillText(s.icon || "⭐", s.x + s.w / 2, s.y + s.h / 2 + 10);
  label(ctx, s.label, s.x + s.w / 2, s.y + s.h - 18, "#4a3640", 18);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function label(ctx, text, x, y, color = "#4a3640", size = 14) {
  ctx.font = `700 ${size}px Mali, sans-serif`;
  ctx.textAlign = "center";
  ctx.save();
  ctx.shadowColor = color === "#ffffff" ? "#000000" : "#ffffff";
  ctx.shadowBlur = 4;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function speech(ctx, text, x, y, bg) {
  ctx.font = "600 13px Mali, sans-serif";
  const lines = wrap(ctx, text, 180).slice(0, 3);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const h = lines.length * 16 + 10;
  ctx.fillStyle = bg;
  ctx.strokeStyle = "#00000033";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x + 5, y); ctx.fill();
  ctx.fillStyle = "#4a3640";
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, x, y - h + 18 + i * 16));
}

export function wrap(ctx, text, maxWidth) {
  const words = text.split(/(\s+)/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line + word;
    if (ctx.measureText(test).width > maxWidth && line.trim()) { lines.push(line.trim()); line = word.trimStart(); }
    else line = test;
    // very long words / Thai text without spaces: hard-break
    while (ctx.measureText(line).width > maxWidth) {
      let i = line.length - 1;
      while (i > 1 && ctx.measureText(line.slice(0, i)).width > maxWidth) i--;
      lines.push(line.slice(0, i)); line = line.slice(i);
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const inside = (p, r, pad) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
