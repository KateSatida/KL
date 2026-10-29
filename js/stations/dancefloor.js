// Dance floor: light-up tiles, speakers and a disco ball. Guests standing still
// on it dance (see World.drawPlayer). The music button plays on your phone only.
import { el, openModal } from "../ui.js";
import { roundRect } from "../world.js";
import { loadImage } from "../sprites.js";
import { isPlaying, toggleMusic } from "../music.js";

const DAY = ["#ffd6e0", "#ffe9b8", "#d6ecff", "#e3f7d9", "#efd9ff"];
const NIGHT = ["#ff5d8f", "#ffd166", "#4cc9f0", "#80ed99", "#c77dff"];

export default function danceFloor(def, game) {
  const img = {};
  for (const name of ["speaker", "disco_ball", "disco_ball_night"]) loadImage(`assets/stations/${name}.png`).then((i) => { img[name] = i; });

  const open = () => {
    const btn = el("button", { class: "btn primary big", onclick: () => {
      btn.textContent = toggleMusic(def.music) ? "⏹ Stop music" : "🎵 Play music";
    } }, isPlaying() ? "⏹ Stop music" : "🎵 Play music");
    openModal(`${def.icon} ${def.label}`, el("div", { style: "text-align:center" },
      el("p", {}, def.intro || "Stand still on the dance floor and your character dances! 💃🕺"),
      btn,
      el("p", { class: "muted" }, "The music plays on your phone only."),
    ));
  };

  return {
    open,
    draw(ctx, d, now, world) {
      const night = world.scenery.darkness > 0.5;
      const pal = night ? NIGHT : DAY, tile = 40;
      const cols = Math.floor(d.w / tile), rows = Math.floor((d.h - 40) / tile);
      const ox = d.x + (d.w - cols * tile) / 2, oy = d.y + 10;
      ctx.fillStyle = "#3a3a46";
      roundRect(ctx, ox - 6, oy - 6, cols * tile + 12, rows * tile + 12, 8);
      ctx.fill();
      const beat = Math.floor(now / (night ? 450 : 1200));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = pal[(r * 3 + c * 2 + beat) % pal.length];
          ctx.fillRect(ox + c * tile + 1, oy + r * tile + 1, tile - 2, tile - 2);
        }
      }
      const sp = img.speaker;
      if (sp) {
        const bounce = Math.round(Math.abs(Math.sin(now / 230)) * 2);
        ctx.drawImage(sp, ox - 52, oy + 10 - bounce, 48, 84);
        ctx.drawImage(sp, ox + cols * tile + 4, oy + 10 - bounce, 48, 84);
      }
      const ball = night ? img.disco_ball_night : img.disco_ball;
      if (ball) ctx.drawImage(ball, Math.round(d.x + d.w / 2 - 24), oy - 66, 48, 60);
    },
    // moving coloured spotlights at night
    lights: (d) => {
      const t = performance.now() / 900, cx = d.x + d.w / 2, cy = d.y + d.h / 2 - 20;
      return ["rgb(255,93,143)", "rgb(76,201,240)", "rgb(255,209,102)", "rgb(199,125,255)"].map((color, i) => ({
        x: cx + Math.cos(t + i * Math.PI / 2) * d.w * 0.3, y: cy + Math.sin(t * 1.3 + i * Math.PI / 2) * d.h * 0.25,
        r: 120, strength: 0.9, color,
      }));
    },
  };
}
