// Bouquet toss: a guest at the station taps "Toss the bouquet!", a bouquet
// flies to them (everyone sees it) and they catch a random flower: it's added
// to their outfit and a card shows the flower's meaning and a random note
// from the couple. They can toss again for another flower.
//
// config/game.json → this station:
//   "bouquets": [{ "name", "image" (32x32 PNG, held in the hand), "meaning" }, …]
//   "notes":    ["assets/bouquet_notes/01.png", …]   (any PNG/JPG images)
import { el, openModal, closeModal, store, toast } from "../ui.js";
import { drawStation, inside } from "../world.js";

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

  // a toss (mine or another guest's): the bouquet flies from the stage to them
  game.on("bouquet", ({ id }) => {
    const world = game.world;
    const from = { x: def.x + def.w / 2, y: def.y + def.h - 34 - 110 };
    const start = performance.now(), flight = 1800;
    world.effects.push((ctx, now) => {
      const p = world.players.get(id);
      if (!p) return false;
      const to = { x: p.rx, y: p.ry - 60 };
      const t = Math.min(1, (now - start) / flight);
      if (t < 1) {
        drawBouquet(ctx, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 220, now);
      } else {
        for (let h = 0; h < 8; h++) {                                // hearts burst
          const a = (now / 500 + h * 0.8) % (Math.PI * 2), r = 26 + ((now / 25 + h * 13) % 30);
          ctx.fillStyle = ["#ff5d8f", "#ffd166", "#ffffff"][h % 3];
          ctx.fillRect(Math.round(to.x + Math.cos(a) * r), Math.round(to.y + Math.sin(a) * r * 0.6), 6, 6);
        }
      }
      return now - start < flight + 2500;
    });
    if (id === world.me?.id) setTimeout(catchOne, flight);
  });

  const toss = () => {
    closeModal();
    game.broadcast("bouquet", { id: game.world.me.id });
  };

  const open = () => {
    const mine = store.get("myBouquet");
    openModal(`${def.icon} ${def.label}`, el("div", { style: "text-align:center" },
      el("p", {}, def.intro || "Toss the bouquet and catch a random flower! You'll see what it means and get a little note from the couple. 💐"),
      el("button", { class: "btn green big", onclick: toss }, mine ? "💐 Toss again" : "💐 Toss the bouquet!"),
      mine ? el("p", {}, el("button", { class: "btn", onclick: () => showCard(mine) }, "🌸 See my bouquet card")) : null,
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
