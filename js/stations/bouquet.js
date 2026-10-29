// Bouquet toss: singles stand in the circle. When the couple presses
// "Toss now!" on the admin page, everyone sees the bouquet fly to a random
// guest in the circle. The winner gets the bouquet added to their outfit.
import { el, openModal, closeModal, toast } from "../ui.js";
import { drawStation, inside, label } from "../world.js";

export const inCircle = (def, p) => inside(p, def, 0);

export default function bouquet(def, game) {
  // when the bouquet event arrives: animate it from the stage to the winner
  game.on("bouquet", ({ id, name }) => {
    const world = game.world;
    const from = { x: def.x + def.w / 2, y: def.y + def.h - 34 - 110 };
    const start = performance.now(), flight = 2600;
    toast("💐 The bouquet is flying…", 2500);
    world.effects.push((ctx, now) => {
      const p = world.players.get(id);
      const to = p ? { x: p.rx, y: p.ry - 60 } : from;
      const t = Math.min(1, (now - start) / flight);
      if (t < 1) {
        const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 260;
        drawBouquet(ctx, x, y, now);
        return true;
      }
      if (now - start < flight + 5000) {                    // hearts around the winner
        for (let i = 0; i < 10; i++) {
          const a = (now / 500 + i * 0.63) % (Math.PI * 2), r = 30 + ((now / 20 + i * 13) % 40);
          ctx.fillStyle = ["#ff5d8f", "#ffd166", "#ffffff"][i % 3];
          ctx.fillRect(Math.round(to.x + Math.cos(a) * r), Math.round(to.y + Math.sin(a) * r * 0.6), 6, 6);
        }
        label(ctx, `💐 ${name} caught it!`, to.x, to.y - 70, "#c2577a", 16);
        return true;
      }
      return false;
    });
    setTimeout(() => {
      toast(`🎉 ${name} caught the bouquet!`, 6000);
      if (id === world.me?.id) {
        game.setLook({ ...game.state.look, prop: "assets/props/bouquet.png" });
        toast("🎉 You caught the bouquet! 💐", 6000);
      }
    }, flight);
  });

  const open = () => {
    const n = [...game.world.players.values()].filter((p) => inCircle(def, { x: p.rx, y: p.ry })).length;
    const practice = !game.backend.online ? el("button", { class: "btn", onclick: () => {
      const inside_ = [...game.world.players.values()].filter((p) => inCircle(def, { x: p.rx, y: p.ry }));
      if (!inside_.length) return toast("Nobody is in the circle");
      const w = inside_[Math.floor(Math.random() * inside_.length)];
      closeModal();
      game.broadcast("bouquet", { id: w.id, name: w.name });
    } }, "🧪 Practice toss (demo mode)") : null;
    openModal(`${def.icon} ${def.label}`, el("div", {},
      el("p", {}, def.intro || "Single? Stand in the circle! When the couple tosses the bouquet, it lands on a lucky guest in the circle. 💐"),
      el("p", { class: "muted" }, `In the circle right now: ${n}`),
      practice,
    ));
  };

  return {
    open,
    draw(ctx, d, now, world) {
      // petal circle on the grass
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2 + 10, rx = d.w * 0.46, ry = d.h * 0.4;
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        ctx.fillStyle = ["#ff8fab", "#ffffff", "#ffd6a5"][i % 3];
        ctx.fillRect(Math.round(cx + Math.cos(a) * rx) - 3, Math.round(cy + Math.sin(a) * ry) - 3, 6, 6);
      }
      drawStation(ctx, d, now, world);
    },
  };
}

function drawBouquet(ctx, x, y, now) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(Math.sin(now / 120) * 0.4);
  ctx.fillStyle = "#6a994e"; ctx.fillRect(-3, 4, 6, 16);
  for (const [dx, dy, c] of [[-8, -4, "#ff8fab"], [0, -8, "#ffffff"], [8, -4, "#ff5d8f"], [-4, 2, "#ffd6a5"], [4, 2, "#ff8fab"]]) {
    ctx.fillStyle = c; ctx.fillRect(dx - 4, dy - 4, 8, 8);
  }
  ctx.restore();
}
