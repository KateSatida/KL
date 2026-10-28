// Proximity chat: everyone receives the message, but it is only shown to
// guests standing within chatRadius of the sender.
import { $, el } from "./ui.js";

export function setupChat(game) {
  const box = $("#chat"), log = $("#chat-log"), form = $("#chat-form"), input = $("#chat-input");
  const badge = $("#chat-badge"), near = $("#chat-near");
  const radius = game.config.world.chatRadius;
  const world = game.world;

  const show = (m, mine) => {
    world.showBubble(m.id, m.text);
    log.append(el("p", {}, el("b", {}, mine ? "You" : m.name), ": ", m.text));
    log.scrollTop = log.scrollHeight;
    if (box.classList.contains("collapsed") && !mine) badge.classList.remove("hidden");
  };

  $("#chat-toggle").addEventListener("click", () => {
    box.classList.toggle("collapsed");
    badge.classList.add("hidden");
    if (!box.classList.contains("collapsed")) input.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 300);
    if (!text) return;
    const me = world.me;
    const m = { id: me.id, name: game.state.name, text, x: Math.round(me.x), y: Math.round(me.y) };
    game.room.broadcast("chat", m);
    show(m, true);
    input.value = "";
  });

  game.on("chat", (m) => {
    if (Math.hypot(m.x - world.me.x, m.y - world.me.y) <= radius) show(m, false);
  });

  // Show how many people can hear you
  setInterval(() => {
    const n = world.nearbyPlayers(radius).length;
    near.textContent = n ? `· ${n} nearby` : "· nobody nearby";
    input.placeholder = n ? "Say hi! 👋" : "Walk close to someone to chat…";
  }, 500);
}
