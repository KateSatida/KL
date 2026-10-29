// Dance floor: light-up tiles, speakers and a disco ball. Guests standing still
// on it dance (see World.drawPlayer). The music button plays on your phone only.
import { el, openModal, closeModal, tabs, toast, timeAgo } from "../ui.js";
import { roundRect } from "../world.js";
import { loadImage } from "../sprites.js";
import { isPlaying, toggleMusic } from "../music.js";
import { embedFor, openPlayer } from "../player.js";

const DAY = ["#ffd6e0", "#ffe9b8", "#d6ecff", "#e3f7d9", "#efd9ff"];
const NIGHT = ["#ff5d8f", "#ffd166", "#4cc9f0", "#80ed99", "#c77dff"];

export default function danceFloor(def, game) {
  const img = {};
  for (const name of ["speaker", "disco_ball", "disco_ball_night"]) loadImage(`assets/stations/${name}.png`).then((i) => { img[name] = i; });

  // config "music": danceFloor = Spotify/YouTube link to play here,
  // addSongsLink = a collaborative Spotify playlist guests can add to.
  // Without a link: an mp3 ("music" on this station) or the built-in tune.
  const music = game.config.music || {};

  const musicTab = () => {
    const btn = embedFor(music.danceFloor)
      ? el("button", { class: "btn primary big", onclick: () => { openPlayer(music.danceFloor, "Dance floor"); closeModal(); } }, "🎵 Play dance playlist")
      : el("button", { class: "btn primary big", onclick: () => {
        btn.textContent = toggleMusic(def.music) ? "⏹ Stop music" : "🎵 Play music";
      } }, isPlaying() ? "⏹ Stop music" : "🎵 Play music");
    return el("div", { style: "text-align:center" },
      el("p", {}, def.intro || "Stand still on the dance floor and your character dances! 💃🕺"),
      btn,
      el("p", { class: "muted" }, "The music plays on your phone only."),
    );
  };

  const songNode = (s) => {
    const playable = embedFor(s.song);
    return el("div", { class: "msg row", style: "flex-wrap:nowrap" },
      el("div", { style: "flex:1;min-width:0;word-break:break-word" },
        el("b", {}, s.name || "Guest"), " ", el("small", {}, timeAgo(s.created_at)),
        el("div", {}, playable ? (s.song.includes("spotify") ? "🟢 Spotify link" : "▶️ YouTube link") : s.song)),
      playable ? el("button", { class: "btn small", onclick: () => { openPlayer(s.song, `Request from ${s.name || "a guest"}`); closeModal(); } }, "▶ Play") : null,
    );
  };

  const requestTab = () => {
    const input = el("input", { maxlength: 200, placeholder: "Song name – artist, or a Spotify / YouTube link" });
    const list = el("div", { class: "wall" }, el("p", { class: "muted" }, "Loading…"));
    const load = () => game.backend.listSongs().then((ss) => list.replaceChildren(...(ss.length ? ss.map(songNode) : [el("p", { class: "muted" }, "No requests yet. Add the first song!")])))
      .catch((e) => list.replaceChildren(el("p", {}, e.message)));
    load();
    const off = () => list.isConnected && load();
    game.on("song", off);
    const send = el("button", { class: "btn primary", onclick: async () => {
      const song = input.value.trim().slice(0, 200);
      if (!song) return toast("Type a song first 🎶");
      send.disabled = true;
      try {
        await game.backend.addSong({ name: game.state.name, song });
        game.broadcast("song");
        input.value = "";
        toast("Song requested 🎶");
      } catch (e) { toast(e.message, 6000); }
      send.disabled = false;
    } }, "🎶 Add");
    return el("div", {},
      el("p", { class: "muted" }, "Request a song for the dance floor. Everyone can see the list and play the links."),
      el("div", { class: "row", style: "flex-wrap:nowrap" }, input, send),
      music.addSongsLink ? el("p", {}, el("a", { class: "btn small", href: music.addSongsLink, target: "_blank", rel: "noopener" }, "🟢 Add it to our Spotify playlist"),
        el("small", { class: "muted" }, " (needs a Spotify account)")) : null,
      el("h3", {}, "Requests"), list,
    );
  };

  const open = () => openModal(`${def.icon} ${def.label}`, tabs([
    { id: "music", label: "🎵 Music", render: musicTab },
    { id: "request", label: "➕ Request a song", render: requestTab },
  ]));

  return {
    open,
    draw(ctx, d, now, world) {
      const night = world.scenery.darkness > 0.5;
      const pal = night ? NIGHT : DAY, tile = 40;
      const cols = Math.floor(d.w / tile), rows = Math.floor((d.h - 40) / tile);
      const ox = d.x + (d.w - cols * tile) / 2, oy = d.y + 10;
      ctx.fillStyle = "#3a3a46";
      roundRect(ctx, ox - 6, oy - 6, cols * tile + 12, rows * tile + 12, 8);
      ctx.fill();
      const beat = Math.floor(now / (night ? 450 : 1200));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = pal[(r * 3 + c * 2 + beat) % pal.length];
          ctx.fillRect(ox + c * tile + 1, oy + r * tile + 1, tile - 2, tile - 2);
        }
      }
      const sp = img.speaker;
      if (sp) {
        const bounce = Math.round(Math.abs(Math.sin(now / 230)) * 2);
        ctx.drawImage(sp, ox - 52, oy + 10 - bounce, 48, 84);
        ctx.drawImage(sp, ox + cols * tile + 4, oy + 10 - bounce, 48, 84);
      }
      const ball = night ? img.disco_ball_night : img.disco_ball;
      if (ball) ctx.drawImage(ball, Math.round(d.x + d.w / 2 - 24), oy - 66, 48, 60);
    },
    // moving coloured spotlights at night
    lights: (d) => {
      const t = performance.now() / 900, cx = d.x + d.w / 2, cy = d.y + d.h / 2 - 20;
      return ["rgb(255,93,143)", "rgb(76,201,240)", "rgb(255,209,102)", "rgb(199,125,255)"].map((color, i) => ({
        x: cx + Math.cos(t + i * Math.PI / 2) * d.w * 0.3, y: cy + Math.sin(t * 1.3 + i * Math.PI / 2) * d.h * 0.25,
        r: 120, strength: 0.9, color,
      }));
    },
  };
}
