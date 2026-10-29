// Memory Lane: easels showing your photos; tap for a slideshow with captions.
// Photos are listed in config/game.json → this station's "photos".
import { el, openModal } from "../ui.js";
import { loadImage } from "../sprites.js";

export default function memoryLane(def, game) {
  const photos = def.photos || [];
  const images = new Map();
  for (const p of photos) loadImage(p.image).then((img) => images.set(p.image, img));
  let easel = null, sign = null;
  loadImage("assets/stations/easel.png").then((i) => { easel = i; });
  loadImage("assets/stations/memory_sign.png").then((i) => { sign = i; });

  const open = (start = 0) => {
    if (!photos.length) return openModal(`${def.icon} ${def.label}`, el("p", {}, "Photos coming soon 💕"));
    let i = start;
    const img = el("img", { class: "memory-photo", alt: "" });
    const caption = el("p", { class: "memory-caption" });
    const count = el("small", { class: "muted" });
    const show = (n) => {
      i = (n + photos.length) % photos.length;
      img.src = photos[i].image;
      caption.textContent = photos[i].caption || "";
      count.textContent = `${i + 1} / ${photos.length}`;
    };
    const timer = setInterval(() => show(i + 1), 6000);
    show(i);
    openModal(`${def.icon} ${def.label}`, el("div", { class: "memory" },
      img, caption,
      el("div", { class: "row", style: "justify-content:center" },
        el("button", { class: "btn", onclick: () => show(i - 1) }, "◀"), count,
        el("button", { class: "btn", onclick: () => show(i + 1) }, "▶")),
    ), () => clearInterval(timer));
  };

  // three easels; each shows a different photo, changing every few seconds
  const easelSpots = (d) => [0.2, 0.5, 0.8].map((f) => ({ x: d.x + d.w * f, y: d.y + d.h - 40 }));

  return {
    open: () => open(0),
    onClick: () => { open(0); return true; },
    draw(ctx, d, now) {
      if (sign) ctx.drawImage(sign, Math.round(d.x + d.w / 2 - 40), d.y + 50, 80, 80);
      const cycle = Math.floor(now / 4000);
      easelSpots(d).forEach((s, n) => {
        if (!easel) return;
        const k = 3, w = easel.width * k, h = easel.height * k, x = Math.round(s.x - w / 2), y = Math.round(s.y - h);
        ctx.fillStyle = "#00000022";
        ctx.beginPath(); ctx.ellipse(s.x, s.y - 2, w * 0.45, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(easel, x, y, w, h);
        const photo = photos.length && images.get(photos[(n + cycle) % photos.length].image);
        if (!photo) return;
        const fx = x + 3 * k, fy = y + 3 * k, fw = 18 * k, fh = 16 * k;       // inside the frame
        const r = Math.max(fw / photo.width, fh / photo.height);
        const sw = fw / r, sh = fh / r;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, fx, fy, fw, fh);
        ctx.restore();
      });
    },
  };
}
