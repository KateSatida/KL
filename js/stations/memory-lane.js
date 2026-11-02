// Memory Lane: easels showing your photos; tap for a slideshow with captions.
// Photos come from a Google Drive folder set on the admin page (🖼️ Memory
// Lane tab), or else from this station's "photos" in config/game.json.
import { el, openModal } from "../ui.js";
import { loadImage } from "../sprites.js";
import { listDrivePhotos, photoFromLink } from "../drive.js";

export default function memoryLane(def, game) {
  let photos = def.photos || [];
  const images = new Map();
  // load each photo; if the first address fails, try its backup (Drive)
  const loadAll = () => {
    for (const p of photos) {
      p.key ||= p.image;                                     // stays the same if we switch address
      if (images.has(p.key)) continue;
      images.set(p.key, null);
      loadImage(p.image).then(async (img) => {
        if (!img && p.fallback) {
          img = await loadImage(p.fallback);
          if (img) p.image = p.fallback;                     // the slideshow uses the working address
        }
        images.set(p.key, img);
      });
    }
  };
  const fromDrive = async () => {
    const m = game.config.memories || {};
    // 1) photo links pasted on the admin page (no API key needed)
    const pasted = (m.links || []).map((p) => photoFromLink(p.link, p.caption)).filter(Boolean);
    if (pasted.length) { photos = pasted; loadAll(); }
    else if (m.links) { photos = def.photos || []; loadAll(); }     // all links removed: back to the default photos
    // 2) a whole Drive folder (needs an API key)
    try {
      const list = await listDrivePhotos(m.folder, m.apiKey);
      if (list?.length) { photos = list; loadAll(); }
    } catch (e) {
      console.warn("Memory Lane: could not read the Google Drive folder:", e.message);
    }
  };
  loadAll();
  fromDrive();
  game.on("settings", (s) => {
    if (Object.keys(s).some((k) => k.startsWith("memor") || k === "google_api_key")) setTimeout(fromDrive, 100);
  });
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
      const p = photos[i];
      img.onerror = () => { if (p.fallback && !img.src.startsWith(p.fallback)) img.src = p.fallback; };
      img.src = p.image;
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
        const photo = photos.length && images.get(photos[(n + cycle) % photos.length].key);
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
