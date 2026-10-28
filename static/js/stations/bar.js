// Drink bar: pick a drink to hold, PromptPay QR, and the bartender's message wall.
import { el, openModal, tabs, toast, timeAgo } from "../ui.js";
import { drawStation, label } from "../world.js";
import { loadImage, SIZE } from "../sprites.js";
import { api } from "../api.js";

export default function bar(def, game) {
  const cfg = game.config.bar;
  let npcImg = null;
  if (def.npc) loadImage(def.npc.sprite).then((img) => { npcImg = img; });
  let wallList = null;   // the open message list, refreshed live

  const renderWall = async (list) => {
    const msgs = await api.messages().catch(() => []);
    list.replaceChildren(...(msgs.length ? msgs.map(msgNode) : [el("p", { class: "muted" }, "No messages yet. Be the first!")]));
  };
  const msgNode = (m) => el("div", { class: "msg" }, el("b", {}, m.name), " ", el("small", {}, timeAgo(m.created)), el("div", {}, m.text));

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
        await api.postMessage({ name: game.state.name, text: text.value });
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
    draw(ctx, d, now) {
      drawStation(ctx, d);
      if (npcImg && d.npc) {
        const s = SIZE * 2;
        ctx.drawImage(npcImg, d.npc.x - s / 2, d.npc.y - s + Math.sin(now / 400) * 2, s, s);
        label(ctx, d.npc.name, d.npc.x, d.npc.y + 14, "#2a3d6b", 12);
      }
    },
  };
}
