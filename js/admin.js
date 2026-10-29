// Private admin page (admin.html): log in, then see photos, messages and singles.
// Only emails listed in supabase/setup.sql can read the photos.
import { $, el, timeAgo } from "./ui.js";
import { backend } from "./backend/index.js";
import { loadConfig } from "./config.js";

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

// Bouquet toss: watch who stands in the circle, then pick a random one.
let room = null, players = [], refreshBouquet = () => {};
views.bouquet = async () => {
  const config = await loadConfig();
  const zone = config.stations.find((s) => s.type === "bouquet");
  if (!zone) return el("p", {}, "There is no bouquet station in config/game.json.");
  const inCircle = () => players.filter((p) => p.x >= zone.x && p.x <= zone.x + zone.w && p.y >= zone.y && p.y <= zone.y + zone.h);
  const list = el("p", { class: "muted" }, "Connecting…");
  const result = el("h2", {});
  const refresh = () => {
    const names = inCircle().map((p) => p.name);
    list.textContent = names.length ? `In the circle (${names.length}): ${names.join(", ")}` : "Nobody is in the circle yet.";
  };
  refreshBouquet = refresh;
  if (!room) room = admin.watchRoom({ onPlayers: (ps) => { players = ps; refreshBouquet(); } });
  refresh();
  const btn = el("button", { class: "btn primary big", onclick: () => {
    const pool = inCircle();
    if (!pool.length) return alert("Nobody is standing in the bouquet circle yet.");
    const w = pool[Math.floor(Math.random() * pool.length)];
    room.broadcast("bouquet", { id: w.id, name: w.name });
    result.textContent = `💐 ${w.name} caught the bouquet!`;
  } }, "💐 Toss now!");
  return el("div", { class: "card" },
    el("p", {}, "Ask single guests to stand in the bouquet circle on the map. Then press the button: everyone sees the bouquet fly to a random guest in the circle."),
    list, btn, result,
    el("p", { class: "muted" }, "Keep this page open while tossing. It shows who is in the circle live (updated a moment after they stop walking)."));
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
