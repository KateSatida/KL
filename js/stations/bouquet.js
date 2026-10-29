// Bouquet toss: guests stand in the petal circle. When the couple presses
// "Toss now!" on the admin page, a bouquet flies to EVERYONE in the circle.
// Each guest catches a random flower (added to their outfit) and sees its
// meaning plus a random note card from the couple.
//
// config/game.json → this station:
//   "bouquets": [{ "name", "image" (32x32 PNG, held in the hand), "meaning" }, …]
//   "notes":    ["assets/bouquet_notes/01.png", …]   (any PNG/JPG images)
import { el, openModal, closeModal, store, toast } from "../ui.js";
import { drawStation, inside, label } from "../world.js";

export const inCircle = (def, p) => inside(p, def, 0);
const pickRandom = (list, avoid) => {
  const pool = list.length > 1 ? list.filter((x) => x !== avoid) : list;
  return pool[Math.floor(Math.random() * pool.length)];
};

export default function bouquet(def, game) {
  const bouquets = def.bouquets || [];
  const notes = def.notes || [];

  // the card: your flower, its meaning and a note from the couple
  const showCard = (caught) => {
    const flower = bouquets.find((b) => b.image === caught.image);
    if (!flower) return;
    openModal("💐 You caught a bouquet!", el("div", { class: "bouquet-card" },
      el("img", { class: "bouquet-flower", src: flower.image, alt: flower.name }),
      el("h2", {}, flower.name),
      el("p", { class: "bouquet-meaning" }, flower.meaning),
      caught.note ? el("img", { class: "bouquet-note", src: caught.note, alt: "A note from the couple" }) : null,
      el("p", { class: "muted" }, "It's now part of your outfit 🌸"),
    ));
  };

  const catchOne = () => {
    const last = store.get("myBouquet");
    const flower = pickRandom(bouquets, last?.image ? bouquets.find((b) => b.image === last.image) : null);
    if (!flower) return;
    const caught = { image: flower.image, note: pickRandom(notes, last?.note) || null };
    store.set("myBouquet", caught);
    game.setLook({ ...game.state.look, bonus: flower.image });
    showCard(caught);
  };

  // the toss: animate a bouquet to everyone standing in the circle
  game.on("bouquet", () => {
    const world = game.world;
    const from = { x: def.x + def.w / 2, y: def.y + def.h - 34 - 110 };
    const catchers = [...world.players.values()].filter((p) => inCircle(def, { x: p.rx, y: p.ry }));
    const meIn = world.me && inCircle(def, world.me);
    const start = performance.now(), flight = 2400;
    toast(catchers.length ? "💐 The bouquets are flying…" : "💐 The couple tossed the bouquet!", 2500);
    world.effects.push((ctx, now) => {
      const t = Math.min(1, (now - start) / flight);
      for (const [i, p] of catchers.entries()) {
        const to = { x: p.rx, y: p.ry - 60 };
        if (t < 1) {
          const k = Math.min(1, t * (1 + i * 0.08));
          drawBouquet(ctx, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 240, now + i * 50);
        } else {
          for (let h = 0; h < 6; h++) {                               // hearts burst
            const a = (now / 500 + h * 1.05 + i) % (Math.PI * 2), r = 26 + ((now / 25 + h * 13) % 30);
            ctx.fillStyle = ["#ff5d8f", "#ffd166", "#ffffff"][h % 3];
            ctx.fillRect(Math.round(to.x + Math.cos(a) * r), Math.round(to.y + Math.sin(a) * r * 0.6), 6, 6);
          }
        }
      }
      return now - start < flight + 3500;
    });
    setTimeout(() => {
      if (meIn) catchOne();
      else if (catchers.length) toast(`🎉 ${catchers.length} guest${catchers.length > 1 ? "s" : ""} caught a bouquet!`, 5000);
    }, flight);
  });

  const open = () => {
    const n = [...game.world.players.values()].filter((p) => inCircle(def, { x: p.rx, y: p.ry })).length;
    const mine = store.get("myBouquet");
    const practice = !game.backend.online ? el("button", { class: "btn", onclick: () => {
      closeModal();
      game.broadcast("bouquet", { at: Date.now() });
    } }, "🧪 Practice toss (demo mode)") : null;
    openModal(`${def.icon} ${def.label}`, el("div", {},
      el("p", {}, def.intro || "Stand in the circle! When the couple tosses the bouquets, everyone in the circle catches one: a random flower with its meaning and a note from the couple. 💐"),
      el("p", { class: "muted" }, `In the circle right now: ${n}`),
      mine ? el("button", { class: "btn primary", onclick: () => showCard(mine) }, "🌸 See my bouquet card") : null,
      practice,
    ));
  };

  return {
    open,
    draw(ctx, d, now, world) {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2 + 10, rx = d.w * 0.46, ry = d.h * 0.4;
      for (let i = 0; i < 48; i++) {                                // petal circle on the grass
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
