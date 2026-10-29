// Mini music player for Spotify / YouTube links (playlist, album, song, video).
// Links come from "music" in config/game.json. The player stays visible while
// it plays (Spotify and YouTube don't allow hidden players); closing it stops it.
import { $ } from "./ui.js";
import { stopMusic } from "./music.js";

// Turn a normal share link into an embeddable player address.
export function embedFor(link) {
  let url;
  try { url = new URL(String(link).trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "open.spotify.com") {
    const m = url.pathname.match(/(?:\/intl-[a-z-]+)?\/(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    return { kind: "spotify", height: 80, src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` };
  }
  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtu.be") {
    const list = url.searchParams.get("list");
    const video = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    const params = "playsinline=1&rel=0&autoplay=1";
    if (video && /^[\w-]{6,}$/.test(video)) {
      return { kind: "youtube", height: 0, src: `https://www.youtube.com/embed/${video}?${params}${list ? `&list=${encodeURIComponent(list)}` : ""}` };
    }
    if (list) return { kind: "youtube", height: 0, src: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}&${params}` };
  }
  return null;
}

let current = null;   // the link playing now

export function openPlayer(link, title = "Music") {
  const embed = embedFor(link);
  if (!embed) return false;
  stopMusic();                                   // stop the built-in tune if it was on
  const panel = $("#music-panel");
  $("#music-title").textContent = `🎵 ${title}`;
  if (current !== link) {
    const frame = document.createElement("iframe");
    frame.src = embed.src;
    frame.className = embed.kind;
    if (embed.height) frame.height = embed.height;
    frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.loading = "lazy";
    frame.title = title;
    $("#music-frame").replaceChildren(frame);
    current = link;
  }
  panel.classList.remove("hidden");
  return true;
}

export function closePlayer() {
  $("#music-panel").classList.add("hidden");
  $("#music-frame").replaceChildren();           // removing the player stops the music
  current = null;
}

export const playerOpen = () => !$("#music-panel").classList.contains("hidden");

export function setupPlayer(config) {
  const link = config.music?.playlist;
  const btn = $("#hud-music");
  btn.classList.toggle("hidden", !embedFor(link));
  btn.addEventListener("click", () => (playerOpen() ? closePlayer() : openPlayer(link, config.music?.title || "Wedding playlist")));
  $("#music-close").addEventListener("click", closePlayer);
}
