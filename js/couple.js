// The bride & groom: log in to play as yourselves, and a ✨ menu with powers
// only you have (confetti for everyone, day / night for everyone).
// Uses the admin login (emails listed in supabase/setup.sql).
import { el, closeModal, store, toast } from "./ui.js";

// "couple" in config/game.json: the outfit each of you starts with
const DEFAULT_LOOKS = {
  bride: { character: "assets/characters/02_long_dark_hair.png", dress: "assets/dresses/white_gown.png", prop: "assets/props/veil.png", bonus: "assets/props/bouquet.png" },
  groom: { character: "assets/characters/01_short_dark_hair.png", dress: "assets/dresses/black_suit.png" },
};

export function coupleLoginForm(config, backend) {
  const email = el("input", { type: "email", autocomplete: "username", placeholder: "Admin email" });
  const password = el("input", { type: "password", autocomplete: "current-password", placeholder: "Password" });
  let role = "bride";
  const roleRow = el("div", { class: "tabs" });
  for (const [r, label] of [["bride", "👰 Bride"], ["groom", "🤵 Groom"]]) {
    roleRow.append(el("button", { class: "tab" + (r === role ? " active" : ""), onclick: (e) => {
      role = r;
      for (const b of roleRow.children) b.classList.toggle("active", b === e.currentTarget);
    } }, label));
  }
  const name = el("input", { maxlength: 24, placeholder: "Your name (you can change it later in 💬 Status)" });
  const error = el("p", { class: "muted" });
  const go = el("button", { class: "btn green big", onclick: async () => {
    if (!name.value.trim()) return toast("Type your name 😊");
    go.disabled = true;
    error.textContent = "";
    try {
      await backend.admin.signIn(email.value.trim(), password.value);
      const look = config.couple?.[role]?.look || DEFAULT_LOOKS[role];
      const old = store.get("coupleState");
      store.set("coupleState", { name: name.value.trim().slice(0, 24), status: old?.status || "", look: old?.role === role ? old.look : look, role });
      store.set("coupleRole", role);
      location.reload();                                  // start again as the bride / groom
    } catch (e) {
      error.textContent = e.message;
      go.disabled = false;
    }
  } }, "💍 Enter as the couple");
  return el("div", {},
    el("p", { class: "muted" }, "For the bride and groom only: log in with the admin email and password."),
    email, el("div", { style: "height:8px" }), password,
    el("label", {}, "I am the"), roleRow,
    el("label", {}, "Name"), name,
    error,
    el("div", { style: "text-align:center;margin-top:10px" }, go),
  );
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
