// Projector screen in the world that shows a random single every few seconds.
import { el, openModal } from "../ui.js";
import { label, roundRect, wrap } from "../world.js";
import { loadImage } from "../sprites.js";
import { browseSingles, singleCard } from "./singles.js";

export default function projector(def, game) {
  let list = [];
  let current = null;
  let img = null;

  const pick = async () => {
    if (!list.length) { current = null; img = null; return; }
    const others = list.length > 1 ? list.filter((s) => s.id !== current?.id) : list;
    current = others[Math.floor(Math.random() * others.length)];
    img = await loadImage(current.image);
  };
  const refresh = async () => { list = await game.backend.listSingles().catch(() => list); await pick(); };

  refresh();
  setInterval(pick, (def.rotateSeconds || 7) * 1000);
  game.on("singles", refresh);

  const open = () => {
    openModal(`${def.icon} ${def.label}`, el("div", {},
      current ? el("div", { style: "max-width:260px;margin:0 auto 16px" }, singleCard(current)) : null,
      el("h3", {}, "All singles"),
      browseSingles(game),
    ));
  };

  return {
    open,
    onClick: () => { open(); return true; },
    draw(ctx, d) {
      // stand + screen
      ctx.fillStyle = "#5a4a5a";
      ctx.fillRect(d.x + d.w / 2 - 6, d.y + d.h, 12, 30);
      ctx.fillStyle = d.color;
      roundRect(ctx, d.x, d.y, d.w, d.h, 10);
      ctx.fill();
      const pad = 12, sx = d.x + pad, sy = d.y + pad, sw = d.w - pad * 2, sh = d.h - pad * 2 - 26;
      ctx.fillStyle = "#fdfbff";
      ctx.fillRect(sx, sy, sw, sh);
      if (current && img) {
        const side = sh - 8;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        // crop image to a square
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, sx + 6, sy + 4, side, side);
        ctx.restore();
        const tx = sx + side + 16 + (sw - side - 16) / 2;
        label(ctx, current.name, tx, sy + 40, "#c2577a", 20);
        label(ctx, `@${current.instagram}`, tx, sy + 66, "#4a3640", 14);
        ctx.font = "600 12px Mali, sans-serif";
        ctx.fillStyle = "#7a6a74";
        wrap(ctx, current.bio || "", sw - side - 30).slice(0, 4)
          .forEach((l, i) => ctx.fillText(l, tx, sy + 92 + i * 15));
      } else {
        label(ctx, "💘 Visit the Single Station", sx + sw / 2, sy + sh / 2, "#c2577a", 16);
        label(ctx, "to appear here!", sx + sw / 2, sy + sh / 2 + 22, "#4a3640", 13);
      }
      label(ctx, `${d.icon} ${d.label} · tap to view`, d.x + d.w / 2, d.y + d.h - 12, "#ffffff", 14);
    },
  };
}
