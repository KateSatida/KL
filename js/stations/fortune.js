// Horoscope / fortune station (ดูดวง): draw a random card with a Thai fortune
// and get a lucky item (ของนำโชค) to wear. Cards live in config/game.json on
// this station → "cards": [{ "title", "text", "item", "itemName", "luck" }, …]
import { el, openModal, closeModal, store, toast } from "../ui.js";
import { cropPreview, CHARM_AREA } from "../sprites.js";
import { addItem } from "../items.js";

export default function fortune(def, game) {
  const cards = def.cards || [];

  const showCard = (card) => {
    const wearing = game.state.look.charm === card.item;
    const wear = el("button", { class: "btn green big", onclick: () => {
      game.setLook({ ...game.state.look, charm: card.item });
      toast(`✨ ใส่ ${card.itemName} แล้ว! ${card.luck || ""}`, 4000);
      closeModal();
    } }, wearing ? "✔ ใส่อยู่แล้ว" : "✨ ใส่ของนำโชค");
    openModal(`${def.icon} ${def.label}`, el("div", { class: "fortune-card" },
      el("div", { class: "fortune-face" },
        el("div", { class: "fortune-title" }, card.title),
        el("p", { class: "fortune-text" }, card.text),
        card.item ? cropPreview(card.item, CHARM_AREA, "fortune-item") : null,
        card.itemName ? el("p", { class: "fortune-gift" }, `🎁 ของนำโชค: ${card.itemName}`) : null,
        card.luck ? el("p", { class: "muted" }, card.luck) : null,
      ),
      el("div", { class: "row", style: "justify-content:center;margin-top:12px" },
        card.item ? wear : null,
        el("button", { class: "btn", onclick: draw }, "🔮 ดูดวงอีกครั้ง"),
      ),
      el("p", { class: "muted", style: "font-size:13px" }, "ถอดของนำโชคได้ที่ 👗 Outfit → 🎁 Items"),
    ));
  };

  function draw() {
    if (!cards.length) return toast("No cards yet (config/game.json)");
    const last = store.get("myFortune");
    const pool = cards.length > 1 ? cards.filter((c) => c.title !== last?.title) : cards;
    const card = pool[Math.floor(Math.random() * pool.length)];
    store.set("myFortune", card);
    if (card.item) addItem("charm", card.item, game.state.look);   // kept in 🎁 Items, even if not worn now
    // a little shuffle animation before showing the card
    openModal(`${def.icon} ${def.label}`, el("div", { class: "fortune-card" },
      el("div", { class: "fortune-shuffle" }, "🃏"),
      el("p", {}, "กำลังสับไพ่… 🔮")));
    setTimeout(() => showCard(card), 1100);
  }

  return {
    open() {
      const mine = store.get("myFortune");
      openModal(`${def.icon} ${def.label}`, el("div", { style: "text-align:center" },
        el("p", {}, def.intro || "จั่วไพ่ดูดวงหนึ่งใบ แล้วรับของนำโชคไปใส่! 🔮"),
        el("button", { class: "btn green big", onclick: draw }, "🔮 ดูดวง"),
        mine ? el("p", {}, el("button", { class: "btn", onclick: () => showCard(mine) }, "🃏 ดูไพ่ของฉัน")) : null,
      ));
    },
  };
}
