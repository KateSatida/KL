// Proximity chat: messages only reach players standing close to you.
import { $, el } from "./ui.js";

export function setupChat(game) {
  const box = $("#chat"), log = $("#chat-log"), form = $("#chat-form"), input = $("#chat-input");
  const badge = $("#chat-badge"), near = $("#chat-near");
  const radius = game.config.world.chatRadius;

  $("#chat-toggle").addEventListener("click", () => {
    box.classList.toggle("collapsed");
    badge.classList.add("hidden");
    if (!box.classList.contains("collapsed")) input.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    game.net.send({ type: "chat", text });
    input.value = "";
  });

  game.on("chat", (m) => {
    log.append(el("p", {}, el("b", {}, m.mine ? "You" : m.name), ": ", m.text));
    log.scrollTop = log.scrollHeight;
    if (box.classList.contains("collapsed") && !m.mine) badge.classList.remove("hidden");
  });

  // Show how many people can hear you
  setInterval(() => {
    const n = game.world.nearbyPlayers(radius).length;
    near.textContent = n ? `· ${n} nearby` : "· nobody nearby";
    input.placeholder = n ? "Say hi! 👋" : "Walk close to someone to chat…";
  }, 500);
}
