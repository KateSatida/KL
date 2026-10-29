// Outdoor scenery: grass lawn, pixel-art decorations and day/night lighting.
//
// Decorations come from "decorations" in config/game.json:
//   { "image": "assets/decor/lamp_post.png", "night": "assets/decor/lamp_post_night.png",
//     "x": 480, "y": 520, "scale": 2, "layer": "sorted" }
// x/y is the bottom-centre of the picture. layer: "ground" (under everyone),
// "sorted" (people can walk in front/behind, default) or "top" (over everyone,
// e.g. hanging lights). Bright yellow/white pixels in a night picture glow.
import { loadImage } from "./sprites.js";

// ---- day or night? -----------------------------------------------------------
// config "time": { "mode": "auto" | "day" | "night", "nightFrom": "18:00", "dayFrom": "06:00" }
// "auto" uses each guest's phone clock. Add ?time=night or ?time=20:30 to the
// link to preview.
const toMinutes = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };

export function isNightNow(timeCfg = {}, now = new Date()) {
  const param = new URLSearchParams(location.search).get("time");
  const mode = param || timeCfg.mode || "auto";
  if (mode === "day" || mode === "night") return mode === "night";
  const minutes = /^\d{1,2}:\d{2}$/.test(mode) ? toMinutes(mode) : now.getHours() * 60 + now.getMinutes();
  const night = toMinutes(timeCfg.nightFrom || "18:00"), day = toMinutes(timeCfg.dayFrom || "06:00");
  return night > day ? (minutes >= night || minutes < day) : (minutes >= night && minutes < day);
}

// Find the bright pixels of a "night" picture: those become glowing lights.
export function findGlowPoints(img) {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  const seen = new Set(), points = [];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const [r, gr, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 200 || r < 245 || gr < 225 || b < 140 || b > 235) continue;   // light-bulb colours only (e.g. #fff3b0)
      const key = `${Math.floor(x / 5)},${Math.floor(y / 5)}`;    // one light per 5x5 block
      if (seen.has(key)) continue;
      seen.add(key);
      points.push({ x, y, color: "rgb(255,190,110)" });          // warm light
    }
  }
  return points.slice(0, 24);
}

export class Scenery {
  constructor(config) {
    this.world = config.world;
    this.theme = config.world.theme || {};
    this.time = config.time || {};
    this.decor = [];
    this.night = isNightNow(this.time);
    this.darkness = this.night ? 1 : 0;      // 0 = day, 1 = full night (fades smoothly)
    this.lightCanvas = document.createElement("canvas");
    setInterval(() => { this.night = isNightNow(this.time); }, 15000);
    this.load(config.decorations || []);
  }

  async load(list) {
    this.decor = await Promise.all(list.map(async (d) => {
      const item = { scale: 2, layer: "sorted", ...d, img: null, nightImg: null, glows: [] };
      if (d.image) item.img = await loadImage(d.image);
      if (d.overlay) item.overlayImg = await loadImage(d.overlay);
      if (d.night) {
        item.nightImg = await loadImage(d.night);
        if (item.nightImg) item.glows = findGlowPoints(item.nightImg);
      }
      return item;
    }));
  }

  update(dt) {
    const target = this.night ? 1 : 0;
    this.darkness += Math.sign(target - this.darkness) * Math.min(Math.abs(target - this.darkness), dt / 2);
  }

  // ---- drawing -----------------------------------------------------------------
  drawGround(ctx) {
    const { width: W, height: H } = this.world, t = this.theme;
    ctx.fillStyle = t.grass || "#9ed27f";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = t.grassStripe || "#95c975";                // mowed stripes
    for (let x = 0; x < W; x += 160) ctx.fillRect(x, 0, 80, H);
    ctx.fillStyle = t.grassTuft || "#7fb35f";                  // little tufts
    for (let i = 0; i < 260; i++) {
      const x = (i * 977) % W, y = (i * 613 + (i % 7) * 97) % H;
      ctx.fillRect(x, y, 4, 2); ctx.fillRect(x + 2, y - 2, 2, 2);
    }
    const pw = 130, px = W / 2 - pw / 2, top = 300;            // stone aisle
    ctx.fillStyle = t.path || "#eadfca";
    ctx.fillRect(px, top, pw, H - top);
    ctx.fillStyle = t.pathEdge || "#cdbd9f";
    for (let y = top; y < H; y += 40) {
      ctx.fillRect(px, y, pw, 3);
      ctx.fillRect(px + ((y / 40) % 2 ? pw / 2 : pw / 4), y, 3, 40);
    }
    ctx.fillStyle = t.hedge || "#5f8f4a";                      // hedge border
    ctx.fillRect(0, 0, W, 10); ctx.fillRect(0, H - 10, W, 10);
    ctx.fillRect(0, 0, 10, H); ctx.fillRect(W - 10, 0, 10, H);
  }

  imageFor(d) {
    return this.darkness > 0.5 && d.nightImg ? d.nightImg : d.img;
  }

  drawDecor(ctx, d) {
    if (d.emoji) {                                           // old emoji style still works
      ctx.font = `${d.size || 32}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(d.emoji, d.x, d.y);
      return;
    }
    const img = this.imageFor(d);
    if (!img) return;
    const w = img.width * d.scale, h = img.height * d.scale;
    const x = Math.round(d.x - w / 2), y = Math.round(d.y - h);
    ctx.drawImage(img, x, y, w, h);
    // "overlay": a picture (e.g. your logo) fitted into "overlayBox" [x, y, w, h]
    // (in the decoration's own pixels), e.g. on the backdrop's drape
    const o = d.overlayImg;
    if (o && d.overlayBox) {
      const [bx, by, bw, bh] = d.overlayBox.map((v) => v * d.scale);
      const k = Math.min(bw / o.width, bh / o.height), ow = o.width * k, oh = o.height * k;
      ctx.save();
      ctx.imageSmoothingEnabled = k < 1;                    // big photo logos: smooth; pixel logos: crisp
      ctx.drawImage(o, Math.round(x + bx + (bw - ow) / 2), Math.round(y + by + (bh - oh) / 2), Math.round(ow), Math.round(oh));
      ctx.restore();
    }
  }

  layer(name) { return this.decor.filter((d) => (d.emoji ? "ground" : d.layer) === name); }

  // Light sources for the night overlay: [{x, y, r, color, strength}]
  decorLights() {
    const out = [];
    for (const d of this.decor) {
      if (!d.nightImg) continue;
      const w = d.nightImg.width * d.scale, h = d.nightImg.height * d.scale;
      for (const g of d.glows) {
        out.push({ x: d.x - w / 2 + (g.x + 0.5) * d.scale, y: d.y - h + (g.y + 0.5) * d.scale,
          r: d.glow || 46, color: g.color, strength: d.glowStrength ?? 1 });
      }
    }
    return out;
  }

  // Darken the world, cut soft holes where the lights are, then add a warm glow.
  drawNight(ctx, worldTransform, lights) {
    const dark = this.darkness;
    if (dark < 0.01) return;
    const t = this.theme;
    const lc = this.lightCanvas;
    if (lc.width !== ctx.canvas.width || lc.height !== ctx.canvas.height) {
      lc.width = ctx.canvas.width; lc.height = ctx.canvas.height;
    }
    const l = lc.getContext("2d");
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = "source-over";
    l.clearRect(0, 0, lc.width, lc.height);
    l.globalAlpha = dark * (t.nightDarkness ?? 0.62);
    l.fillStyle = t.nightColor || "#0b1033";
    l.fillRect(0, 0, lc.width, lc.height);
    l.globalAlpha = 1;
    l.globalCompositeOperation = "destination-out";
    l.setTransform(...worldTransform);
    for (const s of lights) {
      const g = l.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      g.addColorStop(0, `rgba(0,0,0,${0.9 * s.strength})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      l.fillStyle = g;
      l.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lc, 0, 0);
    ctx.setTransform(...worldTransform);
    ctx.globalCompositeOperation = "lighter";                 // warm glow on top
    for (const s of lights) {
      if (!s.color) continue;
      const r = s.r * 0.7;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, s.color.replace("rgb(", "rgba(").replace(")", `,${0.22 * dark * s.strength})`));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
}
