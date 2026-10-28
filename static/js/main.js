// Starts everything: join screen -> world + multiplayer + stations.
import { $, el, openModal, closeModal, store, toast } from "./ui.js";
import { api } from "./api.js";
import { customizer } from "./customize.js";
import { Net } from "./net.js";
import { World } from "./world.js";
import { createStations } from "./stations/index.js";
import { setupChat } from "./chat.js";

const config = await api.config();
const w = config.wedding;
document.title = w.title;
$("#wedding-title").textContent = w.title;
$("#wedding-sub").textContent = `${w.couple} · ${w.date}`;
$("#wedding-welcome").textContent = w.welcome;
$("#hud-title").textContent = `💒 ${w.couple}`;

// What this guest looks like. Saved on the device so a refresh keeps the outfit.
const state = store.get("guest", { name: "", status: "", look: {} });
$("#join-customizer").append(customizer(config, state));

// Shared "game" object handed to every station module.
const listeners = {};
const game = {
  config,
  state,
  world: null,
  net: null,
  on(name, fn) { (listeners[name] ||= []).push(fn); },
  emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
  save() { store.set("guest", state); },
  setLook(look) {
    state.look = look;
    game.save();
    game.net.send({ type: "look", look });
    game.world.upsertPlayer({ ...game.world.me, look });
  },
  setStatus(text) {
    state.status = (text || "").slice(0, 60);
    game.save();
    game.net.send({ type: "status", text: state.status });
    game.world.upsertPlayer({ ...game.world.me, status: state.status });
  },
};

window.game = game; // handy for debugging in the browser console

$("#join-btn").addEventListener("click", () => {
  state.name = (state.name || "").trim();
  if (!state.name) return toast("Please type your name first 😊");
  game.save();
  $("#join").classList.add("hidden");
  $("#game").classList.remove("hidden");
  startGame();
});

function startGame() {
  const stations = createStations(config, game);
  const world = new World($("#world"), config, stations);
  game.world = world;

  let myId = null;
  const net = new Net(
    () => ({ name: state.name, status: state.status, look: state.look, x: world.me?.x, y: world.me?.y }),
    onMessage,
    (online) => $("#connection").classList.toggle("hidden", online),
  );
  game.net = net;

  async function onMessage(msg) {
    switch (msg.type) {
      case "welcome":
        myId = msg.id;
        world.players.clear();
        for (const p of msg.players) await world.upsertPlayer(p, p.id === myId);
        break;
      case "joined":
      case "updated":
        if (msg.player.id !== myId) await world.upsertPlayer(msg.player);
        break;
      case "moved": {
        const p = world.players.get(msg.id);
        if (p) Object.assign(p, msg);
        break;
      }
      case "left":
        world.removePlayer(msg.id);
        break;
      case "chat":
        world.showBubble(msg.id, msg.text);
        game.emit("chat", { ...msg, mine: msg.id === myId });
        break;
      case "event":
        game.emit(msg.name, msg.data);
        break;
    }
    $("#hud-online").textContent = `👥 ${world.players.size}`;
  }

  // Send my position at most ~12 times a second
  let lastSent = 0, sentMoving = false;
  world.onMove = (me) => {
    const now = performance.now();
    if (me.moving && now - lastSent < 80) return;
    if (!me.moving && !sentMoving) return;
    lastSent = now;
    sentMoving = me.moving;
    net.send({ type: "move", x: Math.round(me.x), y: Math.round(me.y), dir: me.dir, moving: me.moving });
  };

  const prompt = $("#station-prompt");
  world.onNearStation = (s) => {
    prompt.classList.toggle("hidden", !s);
    if (s) prompt.textContent = `${s.def.icon} Open ${s.def.label}`;
  };
  prompt.addEventListener("click", () => world.nearStation?.module.open());

  $("#hud-status").addEventListener("click", () => {
    const input = el("input", { maxlength: 60, value: state.status, placeholder: "e.g. Looking for the dessert table 🍰" });
    const done = () => { game.setStatus(input.value); closeModal(); };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") done(); });
    openModal("💬 Your status", el("div", {},
      el("p", { class: "muted" }, "Shown above your head when other guests are near you."),
      input,
      el("div", { class: "row", style: "justify-content:flex-end;margin-top:10px" },
        el("button", { class: "btn", onclick: () => { input.value = ""; done(); } }, "Clear"),
        el("button", { class: "btn primary", onclick: done }, "Save")),
    ));
    input.focus();
  });
  $("#hud-wardrobe").addEventListener("click", () => {
    const wardrobe = stations.find((s) => s.def.type === "wardrobe");
    wardrobe?.module.open();
  });

  setupChat(game);
  net.connect();
  world.start();
}
