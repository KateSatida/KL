// Music player for Spotify / YouTube links (playlist, album, song, video).
//
// - Background music starts when the guest enters the party and keeps going
//   (YouTube playlists play in random order and repeat).
// - On the dance floor it switches to the dance playlist (or the guest's own
//   playlist), and back when they walk off.
// - The player stays visible while it plays (YouTube and Spotify don't allow
//   hidden players). ✕ or the 🎵 button stops it; 🎵 starts it again.
import { $ } from "./ui.js";
import { stopMusic } from "./music.js";

// Turn a normal share link into something we can play.
export function embedFor(link) {
  let url;
  try { url = new URL(String(link || "").trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "open.spotify.com") {
    const m = url.pathname.match(/(?:\/intl-[a-z-]+)?\/(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    return { kind: "spotify", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` };
  }
  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtu.be") {
    const list = url.searchParams.get("list");
    const video = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    if (list && /^[\w-]+$/.test(list)) return { kind: "youtube", list, video: /^[\w-]{6,}$/.test(video || "") ? video : null };
    if (video && /^[\w-]{6,}$/.test(video)) return { kind: "youtube", video };
  }
  return null;
}

// ---- YouTube (official IFrame API, so we can shuffle and repeat) --------------
let ytApi = null;
function loadYouTubeApi() {
  if (!ytApi) {
    ytApi = new Promise((resolve) => {
      if (window.YT?.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.append(s);
    });
  }
  return ytApi;
}

let yt = null;            // YT.Player while a YouTube link is loaded
let link = null;          // what is playing now
let wanted = null;        // what should play (background or dance floor)
let title = "";
let on = false;           // the guest wants music (false after ✕)
let playing = null;       // YouTube: true/false once known; Spotify: unknown (null)
const MINI = "musicMinimized";
let mini = (() => { try { return localStorage.getItem(MINI) === "1"; } catch { return false; } })();

function showState() {
  // when minimized, say whether it's playing; if not (phones need a tap), tapping opens it
  const el = $("#music-state");
  el.textContent = !mini ? "" : playing === false ? "▶ tap to play" : playing ? "♪ playing" : "";
}

export function setMinimized(value) {
  mini = value;
  try { localStorage.setItem(MINI, value ? "1" : "0"); } catch { /* private mode */ }
  $("#music-panel").classList.toggle("mini", mini);
  showState();
}

function shuffleAndRepeat(p) {
  try {
    p.setShuffle(true);
    p.setLoop(true);
    const n = p.getPlaylist()?.length || 0;
    if (n > 1) p.playVideoAt(Math.floor(Math.random() * n));
    else p.playVideo();
  } catch { /* player not ready yet */ }
}

async function playYouTube(e) {
  playing = false;
  const YT = await loadYouTubeApi();
  const vars = e.list ? { listType: "playlist", list: e.list } : { playlist: e.video };   // playlist=video makes one video repeat
  if (yt) {
    if (e.list) yt.loadPlaylist({ list: e.list, listType: "playlist" });
    else yt.loadPlaylist([e.video]);
    setTimeout(() => shuffleAndRepeat(yt), 1200);
    return;
  }
  const holder = document.createElement("div");
  $("#music-frame").replaceChildren(holder);
  yt = new YT.Player(holder, {
    width: "100%", height: "100%",
    playerVars: { ...vars, autoplay: 1, playsinline: 1, rel: 0, loop: 1 },
    events: {
      onReady: (ev) => { ev.target.playVideo(); setTimeout(() => shuffleAndRepeat(ev.target), 800); },
      onStateChange: (ev) => {
        if (ev.data === 0) ev.target.playVideo();                            // ended: start again
        if (ev.data === 1) playing = true;
        if (ev.data === 2 || ev.data === 5) playing = false;                 // paused / not started
        showState();
      },
    },
  });
}

function playSpotify(e) {
  playing = null;
  yt?.destroy?.();
  yt = null;
  const frame = document.createElement("iframe");
  frame.src = e.src;
  frame.className = "spotify";
  frame.height = 80;
  frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  frame.title = title;
  $("#music-frame").replaceChildren(frame);
}

function render() {
  const panel = $("#music-panel");
  const e = on && embedFor(wanted);
  if (!e) {
    panel.classList.add("hidden");
    yt?.destroy?.(); yt = null; link = null;
    $("#music-frame").replaceChildren();
    $("#hud-music").classList.toggle("off", !on);
    return;
  }
  stopMusic();                                    // the built-in dance tune, if it was on
  $("#music-title").textContent = title;
  $("#music-frame").className = e.kind;
  panel.classList.remove("hidden");
  $("#hud-music").classList.remove("off");
  showState();
  if (link === wanted) return;
  link = wanted;
  if (e.kind === "youtube") playYouTube(e); else playSpotify(e);
}

// Which link should play now (called by main.js when the guest moves).
export function setMusic(newLink, newTitle) {
  if (newLink === wanted && newTitle === title) return;
  wanted = newLink;
  title = newTitle;
  render();
}

export function startMusic() { on = true; render(); }
export function stopPlayer() { on = false; render(); }
export const musicOn = () => on;

export function setupPlayer() {
  $("#hud-music").addEventListener("click", () => (on ? stopPlayer() : startMusic()));
  $("#music-close").addEventListener("click", stopPlayer);
  $("#music-min").addEventListener("click", () => setMinimized(!mini));
  $("#music-title").addEventListener("click", () => { if (mini) setMinimized(false); });
  $("#music-state").addEventListener("click", () => { if (mini) setMinimized(false); });
  setMinimized(mini);
}
