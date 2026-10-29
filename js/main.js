// Starts everything: join screen -> world + multiplayer + stations.
import { $, el, openModal, closeModal, store, toast } from "./ui.js";
import { backend } from "./backend/index.js";
import { loadConfig } from "./config.js";
import { customizer } from "./customize.js";
import { World } from "./world.js";
import { createStations } from "./stations/index.js";
import { setupChat } from "./chat.js";

const config = await loadConfig();
const w = config.wedding;
document.title = w.title;
$("#wedding-title").textContent = w.title;
$("#wedding-sub").textContent = `${w.couple} · ${w.date}`;
$("#wedding-welcome").textContent = w.welcome;
$("#hud-title").textContent = `💒 ${w.couple}`;
if (!backend.online) { $("#demo-banner").classList.remove("hidden"); document.body.classList.add("demo"); }

// What this guest looks like. Saved on the device so a refresh keeps the outfit.
const state = store.get("guest", { name: "", status: "", look: {} });
$("#join-customizer").append(customizer(config, state));

// Shared "game" object handed to every station module.
const listeners = {};
const game = {
  config,
  state,
  backend,
  world: null,
  room: null,
  on(name, fn) { (listeners[name] ||= []).push(fn); },
  emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
  // Tell everyone (including me) that something happened, e.g. "message"
  broadcast(name, data) { game.room?.broadcast(name, data); game.emit(name, data); },
  save() { store.set("guest", state); },
  setLook(look) {
    state.look = look;
    game.save();
    game.world.upsertPlayer({ id: game.world.me.id, look });
    game.sharePresence();
  },
  setStatus(text) {
    state.status = (text || "").slice(0, 60);
    game.save();
    game.world.upsertPlayer({ id: game.world.me.id, status: state.status });
    game.sharePresence();
  },
  // Who I am + where I'm standing, for guests who join later.
  sharePresence() {
    const me = game.world.me;
    game.room?.update({ name: state.name, status: state.status, look: state.look, x: Math.round(me.x), y: Math.round(me.y), dir: me.dir });
  },
};
window.game = game; // handy for debugging in the browser console

// A random secret that proves "this phone owns this name". Kept on the device.
let deviceToken = store.get("deviceToken");
if (!deviceToken) {
  deviceToken = crypto.randomUUID?.() || "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));
  store.set("deviceToken", deviceToken);
}

$("#join-btn").addEventListener("click", async () => {
  state.name = (state.name || "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (!state.name) return toast("Please type your name first 😊");
  const btn = $("#join-btn");
  btn.disabled = true;
  try {
    if (!(await backend.claimName(state.name, deviceToken))) {
      return toast(`"${state.name}" is already taken. Please choose another name 🙏`, 4000);
    }
  } catch (e) {
    return toast(`Could not check your name: ${e.message}`, 4000);
  } finally {
    btn.disabled = false;
  }
  game.save();
  $("#join").classList.add("hidden");
  $("#game").classList.remove("hidden");
  startGame();
});

async function startGame() {
  const stations = createStations(config, game);
  const world = new World($("#world"), config, stations);
  game.world = world;

  const myId = crypto.randomUUID?.() || String(Math.random()).slice(2);
  const spawn = config.world.spawn;
  await world.upsertPlayer({
    id: myId, name: state.name, status: state.status, look: state.look,
    x: spawn.x + Math.round(Math.random() * 160 - 80), y: spawn.y + Math.round(Math.random() * 80 - 40),
  }, true);

  // Re-share my position a moment after I stop walking (cheap: not on every step)
  let presenceTimer;
  const sharePresenceSoon = () => {
    clearTimeout(presenceTimer);
    presenceTimer = setTimeout(() => (world.me.moving ? sharePresenceSoon() : game.sharePresence()), 1500);
  };

  world.onWalk = (walk) => {
    game.room.broadcast("walk", { id: myId, ...walk });
    sharePresenceSoon();
  };

  game.room = backend.joinRoom({
    id: myId,
    state: { name: state.name, status: state.status, look: state.look, x: world.me.x, y: world.me.y, dir: 1 },
    onStatus: (online) => $("#connection").classList.toggle("hidden", online),
    onPlayers: async (list) => {
      const ids = new Set(list.map((p) => p.id));
      for (const id of world.players.keys()) if (id !== myId && !ids.has(id)) world.removePlayer(id);
      for (const p of list) if (p.id !== myId) await world.upsertPlayer(p);
      $("#hud-online").textContent = `👥 ${world.players.size}`;
    },
    onEvent: (type, data) => {
      if (type === "walk") world.walk(data);
      else game.emit(type, data);
    },
  });

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
    stations.find((s) => s.def.type === "wardrobe")?.module.open();
  });

  setupChat(game);
  world.start();
}
