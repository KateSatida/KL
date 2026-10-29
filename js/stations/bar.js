// Drink bar: pick a drink to hold, PromptPay QR, and the bartender's message wall.
import { el, openModal, tabs, toast, timeAgo } from "../ui.js";
import { drawStation, drawStationFront, label } from "../world.js";
import { loadImage, SIZE } from "../sprites.js";

export default function bar(def, game) {
  const cfg = game.config.bar;
  let npcImg = null;
  if (def.npc) loadImage(def.npc.sprite).then((img) => { npcImg = img; });
  let wallList = null;   // the open message list, refreshed live

  const renderWall = async (list) => {
    const msgs = await game.backend.listMessages().catch(() => []);
    list.replaceChildren(...(msgs.length ? msgs.map(msgNode) : [el("p", { class: "muted" }, "No messages yet. Be the first!")]));
  };
  const msgNode = (m) => el("div", { class: "msg" }, el("b", {}, m.name), " ", el("small", {}, timeAgo(m.created_at)), el("div", {}, m.text));

  game.on("message", () => { if (wallList?.isConnected) renderWall(wallList); });

  const drinksTab = () => {
    const grid = el("div", { class: "options drinks" });
    const items = [{ label: "No drink", url: null }, ...game.config.layers.drinks];
    for (const d of items) {
      grid.append(el("button", {
        class: "option" + ((game.state.look.drink || null) === d.url ? " selected" : ""),
        onclick: () => {
          const look = { ...game.state.look };
          if (d.url) look.drink = d.url; else delete look.drink;
          game.setLook(look);
          for (const b of grid.children) b.classList.remove("selected");
          grid.children[items.indexOf(d)].classList.add("selected");
          toast(d.url ? `Here's your ${d.label}! 🥂` : "Drink put down");
        },
      }, d.url ? el("img", { src: d.url, alt: d.label }) : el("span", { class: "none" }, "🚫"), d.label));
    }
    return el("div", {}, el("p", { class: "muted" }, cfg.intro), grid);
  };

  const bartenderTab = () => {
    const lines = cfg.bartenderLines || [];
    const text = el("textarea", { rows: 2, maxlength: 500, placeholder: "Leave a message for everyone…" });
    wallList = el("div", { class: "wall" });
    renderWall(wallList);
    const send = async () => {
      if (!text.value.trim()) return;
      try {
        await game.backend.postMessage({ name: game.state.name, text: text.value.trim().slice(0, 500) });
        game.broadcast("message");
        text.value = "";
        toast("Message posted 💌");
      } catch (e) { toast(e.message); }
    };
    return el("div", {},
      el("div", { class: "bubble" }, "🤵 ", lines[Math.floor(Math.random() * lines.length)] || "Hello!"),
      text,
      el("div", { class: "row", style: "justify-content:flex-end;margin:6px 0" }, el("button", { class: "btn primary small", onclick: send }, "Post")),
      wallList,
    );
  };

  const supportTab = () => el("div", { class: "qr" },
    el("h3", {}, cfg.promptpay.title),
    el("img", { src: cfg.promptpay.image, alt: "PromptPay QR code" }),
    el("p", {}, cfg.promptpay.text),
  );

  return {
    open() {
      openModal(`${def.icon} ${def.label}`, tabs([
        { id: "drinks", label: "🥂 Drinks", render: drinksTab },
        { id: "bartender", label: "🤵 Bartender", render: bartenderTab },
        { id: "support", label: "💝 Support us", render: supportTab },
      ]));
    },
    lights: (d) => [{ x: d.x + d.w / 2, y: d.y + d.h / 2, r: Math.max(d.w, d.h) * 0.55, strength: 0.7, color: "rgb(255,200,140)" }],
    // bar building, then the bartender, then the counter in front of them
    draw(ctx, d, now, world) {
      drawStation(ctx, d, now, world);
      if (npcImg && d.npc) {
        const s = SIZE * 2;
        ctx.drawImage(npcImg, d.npc.x - s / 2, d.npc.y - s + Math.sin(now / 400) * 2, s, s);
      }
      drawStationFront(ctx, d);
    },
  };
}
