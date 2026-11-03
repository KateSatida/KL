// The bride & groom play as themselves (start from the admin page's 💍 Couple
// tab), with a ✨ menu of powers only they have (confetti and day / night for
// everyone). Uses the admin login (emails listed in supabase/setup.sql).
import { el, closeModal, store, toast } from "./ui.js";

// "couple" in config/game.json: the outfit each of you starts with
const DEFAULT_LOOKS = {
  bride: { body: "assets/bodies/01_light.png", hair: "assets/hairs/02_long_dark.png", dress: "assets/dresses/white_gown.png", prop: "assets/props/veil.png", bonus: "assets/props/bouquet.png" },
  groom: { body: "assets/bodies/01_light.png", hair: "assets/hairs/01_short_dark.png", dress: "assets/dresses/black_suit.png" },
};

// Called from the admin page (already logged in): remember "I'm the bride/groom"
// on this device, then the game starts as them.
export function playAsCouple(config, role, name) {
  const look = config.couple?.[role]?.look || DEFAULT_LOOKS[role];
  const old = store.get("coupleState");
  const sameRole = old?.role === role;
  store.set("coupleState", {
    name: (name || "").trim().slice(0, 24) || (role === "bride" ? "Bride" : "Groom"),
    status: sameRole ? old.status || "" : "",
    look: sameRole ? old.look : look,
    role,
  });
  store.set("coupleRole", role);
}

export function coupleMenu(game) {
  const mode = game.config.time?.mode || "auto";
  const setTime = async (value) => {
    try {
      await game.backend.admin.saveSettings({ time_mode: value });
      game.broadcast("settings", { time_mode: value });
      toast(value === "night" ? "🌙 Night for everyone" : value === "day" ? "☀️ Day for everyone" : "🕒 Following the clock");
      closeModal();
    } catch (e) { toast(e.message, 6000); }
  };
  const timeBtn = (value, label) => el("button", { class: "btn" + (mode === value ? " primary" : ""), onclick: () => setTime(value) }, label);
  return el("div", { style: "text-align:center" },
    el("p", {}, `You're playing as the ${game.role === "bride" ? "👰 bride" : "🤵 groom"}. Change your name in 💬 Status.`),
    el("button", { class: "btn green big", onclick: () => {
      game.broadcast("confetti", { by: game.state.name });
      closeModal();
    } }, "🎉 Confetti for everyone"),
    el("h3", { style: "margin-top:16px" }, "Day / night for everyone"),
    el("div", { class: "row", style: "justify-content:center" },
      timeBtn("day", "☀️ Day"), timeBtn("night", "🌙 Night"), timeBtn("", "🕒 Clock")),
    el("p", { style: "margin-top:20px" }, el("button", { class: "btn small", onclick: async () => {
      await game.backend.admin.signOut();
      store.set("coupleRole", null);
      location.reload();
    } }, "Log out of couple mode")),
  );
}

// Confetti on every screen when the couple presses the button
export function setupConfetti(game) {
  const COLORS = ["#ff5d8f", "#ffd166", "#8ec9f0", "#b5e48c", "#c38fd6", "#ffffff"];
  game.on("confetti", ({ by }) => {
    toast(`🎉 Confetti from ${by || "the couple"}!`, 4000);
    const start = performance.now(), duration = 6000;
    const bits = Array.from({ length: 160 }, (_, i) => ({
      x: Math.random(), delay: Math.random() * 1500, speed: 0.12 + Math.random() * 0.18,
      sway: Math.random() * Math.PI * 2, size: 6 + Math.random() * 8, color: COLORS[i % COLORS.length], spin: Math.random() * 6,
    }));
    game.world.effects.push((ctx, now) => {
      const t = now - start;
      const W = ctx.canvas.width, H = ctx.canvas.height, dpr = devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);                      // screen coordinates
      for (const b of bits) {
        const tt = t - b.delay;
        if (tt < 0) continue;
        const y = (tt * b.speed * dpr) - 20, x = b.x * W + Math.sin(tt / 300 + b.sway) * 30 * dpr;
        if (y > H) continue;
        ctx.globalAlpha = Math.min(1, (duration - t) / 800);
        ctx.fillStyle = b.color;
        const s = b.size * dpr, w = s * Math.abs(Math.cos(tt / 200 + b.spin));
        ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.max(2, Math.round(w)), Math.round(s * 0.6));
      }
      ctx.restore();
      return t < duration;
    });
  });
}
