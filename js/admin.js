// Private admin page (admin.html): log in, then see photos, messages and singles.
// Only emails listed in supabase/setup.sql can read the photos.
import { $, el, timeAgo } from "./ui.js";
import { backend } from "./backend/index.js";
import { loadConfig } from "./config.js";
import { embedFor } from "./player.js";
import { playAsCouple } from "./couple.js";
import { listDrivePhotos, driveFolderId } from "./drive.js";

const admin = backend.admin;

const removeBtn = (kind, row, node) => el("button", { class: "btn small", onclick: async () => {
  if (!confirm("Delete this permanently?")) return;
  try { await admin.remove(kind, row); node.remove(); } catch (e) { alert(e.message); }
} }, "🗑 Delete");

// Pictures load one by one as they scroll into view
const lazyImages = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    lazyImages.unobserve(e.target);
    const img = e.target;
    admin.photoImage(img._row).then((src) => { img.src = src; img.parentElement.href = src; })
      .catch(() => { img.alt = "Could not load photo"; });
  }
}, { rootMargin: "300px" });

const views = {
  async photos() {
    const items = await admin.photos();
    if (!items.length) return el("p", { class: "muted" }, "No photos yet. (If guests did upload photos, check that your email is in the admins list in supabase/setup.sql.)");
    return el("div", { class: "admin-grid" }, items.map((p) => {
      const node = el("div", { class: "admin-item" });
      const img = el("img", { alt: "Loading…", style: "min-height:120px;background:#f3e9ec" });
      img._row = p;
      lazyImages.observe(img);
      node.append(
        el("a", { target: "_blank" }, img),
        el("div", { class: "meta" }, el("b", {}, p.name || "Guest"), ` · ${timeAgo(p.created_at)}\n`, p.note || "",
          el("div", { class: "row", style: "margin-top:8px" }, removeBtn("photos", p, node))),
      );
      return node;
    }));
  },
  async messages() {
    const items = await admin.messages();
    if (!items.length) return el("p", { class: "muted" }, "No messages yet.");
    return el("div", { class: "wall card", style: "max-height:none" }, items.map((m) => {
      const node = el("div", { class: "msg" });
      node.append(el("b", {}, m.name), " ", el("small", {}, timeAgo(m.created_at)), el("div", {}, m.text), removeBtn("messages", m, node));
      return node;
    }));
  },
  async singles() {
    const items = await admin.singles();
    if (!items.length) return el("p", { class: "muted" }, "No singles yet.");
    return el("div", { class: "admin-grid" }, items.map((s) => {
      const node = el("div", { class: "admin-item" });
      node.append(el("img", { src: s.image, loading: "lazy" }),
        el("div", { class: "meta" }, el("b", {}, s.name), ` @${s.instagram}\n${s.bio || ""}\n`, removeBtn("singles", s, node)));
      return node;
    }));
  },
};

views.guests = async () => {
  const items = await admin.guests();
  if (!items.length) return el("p", { class: "muted" }, "No guests yet.");
  return el("div", { class: "wall card", style: "max-height:none" },
    el("p", { class: "muted" }, `${items.length} names taken. Each phone keeps its name. Delete one to free it, e.g. for a guest who changed phone or wants a new name.`),
    items.map((g) => {
      const node = el("div", { class: "msg" });
      node.append(el("b", {}, g.name), " ", el("small", {}, timeAgo(g.created_at)), " ", removeBtn("guest_names", g, node));
      return node;
    }));
};

views.wishes = async () => {
  const items = await admin.wishes();
  if (!items.length) return el("p", { class: "muted" }, "No wishes yet.");
  return el("div", { class: "wall card", style: "max-height:none" }, items.map((w) => {
    const node = el("div", { class: "msg" });
    node.append(el("span", { class: "ribbon", style: `background:${w.color}` }), " ", el("b", {}, w.name || "Guest"), " ",
      el("small", {}, timeAgo(w.created_at)), el("div", {}, w.text), removeBtn("wishes", w, node));
    return node;
  }));
};

views.songs = async () => {
  const items = await admin.songs();
  if (!items.length) return el("p", { class: "muted" }, "No song requests yet.");
  return el("div", { class: "wall card", style: "max-height:none" }, items.map((s) => {
    const node = el("div", { class: "msg" });
    const isLink = /^https?:\/\//.test(s.song);
    node.append(el("b", {}, s.name || "Guest"), " ", el("small", {}, timeAgo(s.created_at)),
      el("div", {}, isLink ? el("a", { href: s.song, target: "_blank", rel: "noopener" }, s.song) : s.song), removeBtn("song_requests", s, node));
    return node;
  }));
};

// Live connection to the game (tells open games about new music links)
let room = null;
const getRoom = () => room || (room = admin.watchRoom({ onPlayers: () => {} }));

// Couple: your names (saved in Supabase) and buttons to enter the game as yourselves
views.couple = async () => {
  const config = await loadConfig();
  const saved = await backend.getSettings().catch(() => ({}));
  const bride = el("input", { maxlength: 24, value: saved.couple_bride_name || "", placeholder: "Bride's name" });
  const groom = el("input", { maxlength: 24, value: saved.couple_groom_name || "", placeholder: "Groom's name" });
  const note = el("p", { class: "muted" });
  const saveNames = async () => {
    const values = { couple_bride_name: bride.value.trim(), couple_groom_name: groom.value.trim() };
    await admin.saveSettings(values);
    return values;
  };
  const play = (role) => el("button", { class: "btn green big", onclick: async () => {
    try {
      const values = await saveNames();
      playAsCouple(config, role, role === "bride" ? values.couple_bride_name : values.couple_groom_name);
      location.href = "./";                                   // the game, as the bride / groom
    } catch (e) { note.textContent = `Error: ${e.message}`; }
  } }, role === "bride" ? "👰 Play as the bride" : "🤵 Play as the groom");
  return el("div", { class: "card" },
    el("p", {}, "Enter the game as yourselves: gold name tag, sparkle trail, and the ✨ menu (confetti, day / night for everyone). Guests can't see this option."),
    el("label", {}, "👰 Bride's name"), bride,
    el("label", {}, "🤵 Groom's name"), groom,
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", { class: "btn", onclick: async () => {
        try { await saveNames(); note.textContent = "Names saved ✔"; } catch (e) { note.textContent = `Error: ${e.message}`; }
      } }, "💾 Save names"),
      play("bride"), play("groom")),
    note,
    el("p", { class: "muted" }, "You can still change your name in the game with 💬 Status. On two phones, log in to this page on each and press your button."));
};

// Memory Lane photos from a Google Drive folder
views.memories = async () => {
  const saved = await backend.getSettings().catch(() => ({}));
  const folder = el("input", { value: saved.memories_folder || "", placeholder: "https://drive.google.com/drive/folders/..." });
  const key = el("input", { value: saved.google_api_key || "", placeholder: "Google API key (AIza...)" });
  const note = el("p", { class: "muted" });
  const preview = el("div", { class: "admin-grid" });
  const test = async () => {
    note.textContent = "Checking the folder…";
    preview.replaceChildren();
    try {
      const list = await listDrivePhotos(folder.value, key.value.trim());
      if (!list) { note.textContent = "Paste the folder link and the API key."; return false; }
      note.textContent = list.length ? `Found ${list.length} photo(s) ✔` : "The folder has no photos (or isn't shared with 'Anyone with the link').";
      preview.replaceChildren(...list.map((p) => el("div", { class: "admin-item" },
        el("img", { src: p.image, loading: "lazy", onerror: (e) => { e.target.onerror = null; e.target.src = p.fallback; } }),
        el("div", { class: "meta" }, p.caption))));
      return list.length > 0;
    } catch (e) { note.textContent = `Google says: ${e.message}`; return false; }
  };
  const save = el("button", { class: "btn primary", onclick: async () => {
    if (folder.value.trim() && !driveFolderId(folder.value)) return alert("That doesn't look like a Google Drive folder link.");
    const values = { memories_folder: folder.value.trim(), google_api_key: key.value.trim() };
    try {
      await admin.saveSettings(values);
      await getRoom().broadcast("settings", values);
      await test();
      note.textContent += " Saved ✔ Guests see the new photos right away.";
    } catch (e) { note.textContent = `Error: ${e.message}`; }
  } }, "💾 Save");
  if (saved.memories_folder) test();
  return el("div", { class: "card" },
    el("p", {}, "Show photos from a Google Drive folder on Memory Lane. Add, remove or rename photos in Drive any time; guests see the changes when they open the game."),
    el("label", {}, "Folder link (shared as \"Anyone with the link\")"), folder,
    el("label", {}, "Google API key"), key,
    el("p", { class: "muted" }, "Captions come from the file names, in name order: \"01 Where it all began.jpg\" → \"Where it all began\"."),
    el("div", { class: "row" }, save, el("button", { class: "btn", onclick: test }, "🔍 Test")),
    note, preview);
};

// Music links: saved in Supabase, guests pick them up straight away.
views.music = async () => {
  const config = await loadConfig();
  const saved = await backend.getSettings().catch(() => ({}));
  const bg = el("input", { value: saved.music_playlist ?? config.music?.playlist ?? "", placeholder: "https://youtube.com/playlist?list=..." });
  const dance = el("input", { value: saved.music_dance ?? config.music?.danceFloor ?? "", placeholder: "https://youtube.com/playlist?list=..." });
  const note = el("p", { class: "muted" });
  const save = el("button", { class: "btn primary", onclick: async () => {
    for (const [input, what] of [[bg, "Background"], [dance, "Dance floor"]]) {
      if (input.value.trim() && !embedFor(input.value)) return alert(`${what}: please paste a YouTube or Spotify link.`);
    }
    const values = { music_playlist: bg.value.trim(), music_dance: dance.value.trim() };
    try {
      await admin.saveSettings(values);
      await getRoom().broadcast("settings", values);
      note.textContent = "Saved ✔ Guests in the game switch right away.";
    } catch (e) { note.textContent = `Error: ${e.message}`; }
  } }, "💾 Save music");
  return el("div", { class: "card" },
    el("label", {}, "🎵 Background playlist (plays everywhere, random order, repeats)"), bg,
    el("label", {}, "💃 Dance floor playlist (plays while a guest is on the dance floor)"), dance,
    el("p", { class: "muted" }, "Paste a YouTube or Spotify link: playlist, album, song or video. Leave the dance floor empty to keep the background music there."),
    save, note);
};
async function show(tab) {
  for (const b of $("#admin-tabs").children) b.classList.toggle("active", b.dataset.tab === tab);
  $("#admin-content").replaceChildren(el("p", { class: "muted" }, "Loading…"));
  try {
    $("#admin-content").replaceChildren(await views[tab]());
  } catch (e) {
    $("#admin-content").replaceChildren(el("p", {}, `Error: ${e.message}`));
  }
}

// Download every photo + a notes.txt as one ZIP (made in the browser)
async function downloadZip() {
  const btn = $("#zip");
  btn.disabled = true;
  btn.textContent = "Preparing…";
  try {
    const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
    const zip = new JSZip();
    const photos = await admin.photos();
    const notes = [];
    for (const [i, p] of photos.entries()) {
      const file = `${String(i + 1).padStart(3, "0")}-${(p.name || "guest").replace(/[^\w-]+/g, "_")}.jpg`;
      zip.file(file, await fetch(await admin.photoImage(p)).then((r) => r.blob()));
      notes.push(`${file}\n${p.name} · ${new Date(p.created_at).toLocaleString()}\n${p.note}\n`);
    }
    const messages = await admin.messages();
    zip.file("photo-notes.txt", notes.join("\n"));
    const songs = await admin.songs();
    zip.file("song-requests.txt", songs.map((s) => `${s.name}: ${s.song}`).join("\n"));
    const wishes = await admin.wishes();
    zip.file("wishes.txt", wishes.map((w) => `${w.name} (${new Date(w.created_at).toLocaleString()}): ${w.text}`).join("\n"));
    zip.file("bar-messages.txt", messages.map((m) => `${m.name} (${new Date(m.created_at).toLocaleString()}): ${m.text}`).join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "wedding-guestbook.zip" });
    document.body.append(a); a.click(); a.remove();
  } catch (e) {
    alert(e.message);
  }
  btn.disabled = false;
  btn.textContent = "⬇ Download all photos (ZIP)";
}

async function start() {
  const session = await admin.session().catch(() => null);
  $("#login").classList.toggle("hidden", !!session);
  $("#dashboard").classList.toggle("hidden", !session);
  if (session) show("photos");
}

$("#login").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#login-error").textContent = "";
  try {
    await admin.signIn($("#email").value, $("#password").value);
    start();
  } catch (err) {
    $("#login-error").textContent = err.message;
  }
});
$("#logout").addEventListener("click", async () => { await admin.signOut(); start(); });
$("#zip").addEventListener("click", downloadZip);
$("#admin-tabs").addEventListener("click", (e) => { if (e.target.dataset.tab) show(e.target.dataset.tab); });
start();
