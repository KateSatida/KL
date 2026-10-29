// Wishing tree: guests hang a coloured ribbon with a wish; ribbons appear on the tree.
import { el, openModal, closeModal, toast, timeAgo } from "../ui.js";
import { drawStation } from "../world.js";

const COLORS = ["#ff5d8f", "#ffd166", "#8ec9f0", "#b5e48c", "#c38fd6", "#ffffff"];
// The leafy part of the tree picture (in its pixels), where ribbons can hang
const CANOPY = { x: 48, y: 34, rx: 32, ry: 20 };

export const hash = (str) => {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

export default function wishingTree(def, game) {
  let wishes = [];
  const refresh = async () => { wishes = await game.backend.listWishes().catch(() => wishes); };
  refresh();
  game.on("wish", refresh);

  // where the tree picture sits (same rule as other station buildings)
  const box = () => {
    const k = def.artScale || 3, w = 96 * k, h = 96 * k;
    return { x: def.x + def.w / 2 - w / 2, y: def.y + def.h - 34 - h, k };
  };
  // each wish always hangs in the same spot (based on its id)
  const spot = (w) => {
    const h = hash(w.id), a = (h % 360) * Math.PI / 180, r = Math.sqrt(((h >>> 9) % 1000) / 1000);
    return { x: CANOPY.x + Math.cos(a) * CANOPY.rx * r, y: CANOPY.y + Math.sin(a) * CANOPY.ry * r };
  };

  const wishNode = (w) => el("div", { class: "msg" },
    el("span", { class: "ribbon", style: `background:${w.color}` }), " ",
    el("b", {}, w.name || "Guest"), " ", el("small", {}, timeAgo(w.created_at)), el("div", {}, w.text));

  const open = () => {
    let color = COLORS[0];
    const text = el("textarea", { rows: 2, maxlength: 140, placeholder: "Your wish for the couple… 🌟" });
    const swatches = el("div", { class: "palette", style: "justify-content:flex-start" });
    for (const c of COLORS) {
      swatches.append(el("button", { class: "swatch" + (c === color ? " selected" : ""), style: `background:${c}`, onclick: (e) => {
        color = c;
        for (const b of swatches.children) b.classList.toggle("selected", b === e.currentTarget);
      } }));
    }
    const list = el("div", { class: "wall" }, el("p", { class: "muted" }, "Loading…"));
    game.backend.listWishes().then((ws) => list.replaceChildren(...(ws.length ? ws.map(wishNode) : [el("p", { class: "muted" }, "No wishes yet. Be the first!")])));
    const hang = el("button", { class: "btn primary", onclick: async () => {
      const t = text.value.trim().slice(0, 140);
      if (!t) return toast("Write your wish first 🌟");
      hang.disabled = true;
      try {
        await game.backend.addWish({ name: game.state.name, text: t, color });
        game.broadcast("wish");
        toast("Your wish is on the tree 🌳💖");
        closeModal();
      } catch (e) { toast(e.message, 6000); hang.disabled = false; }
    } }, "🎀 Hang my wish");
    openModal(`${def.icon} ${def.label}`, el("div", {},
      el("p", { class: "muted" }, def.intro || "Tie a ribbon with your wish for the couple. Everyone can read the ribbons on the tree."),
      text, el("label", {}, "Ribbon colour"), swatches,
      el("div", { style: "margin:10px 0" }, hang),
      el("h3", {}, "Wishes"), list,
    ));
  };

  return {
    open,
    onClick: () => { open(); return true; },
    draw(ctx, d, now, world) {
      drawStation(ctx, d, now, world);
      const b = box();
      for (const w of wishes.slice(0, def.maxRibbons || 90)) {
        const s = spot(w);
        const x = Math.round(b.x + s.x * b.k), y = Math.round(b.y + s.y * b.k);
        const sway = Math.round(Math.sin(now / 700 + (hash(w.id) % 10)) * 1.5);
        ctx.fillStyle = "#00000033";
        ctx.fillRect(x - 3, y + 1, 7, 4);
        ctx.fillStyle = w.color;
        ctx.fillRect(x - 3, y, 6, 4);                      // knot
        ctx.fillRect(x - 4 + sway, y + 4, 3, 10);          // two tails
        ctx.fillRect(x + 1 + sway, y + 4, 3, 13);
      }
    },
  };
}
