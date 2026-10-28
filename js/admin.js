// Private admin page (admin.html): log in, then see photos, messages and singles.
// Only emails listed in supabase/setup.sql can read the photos.
import { $, el, timeAgo } from "./ui.js";
import { backend } from "./backend/index.js";

const admin = backend.admin;

const removeBtn = (kind, row, node) => el("button", { class: "btn small", onclick: async () => {
  if (!confirm("Delete this permanently?")) return;
  try { await admin.remove(kind, row); node.remove(); } catch (e) { alert(e.message); }
} }, "🗑 Delete");

const views = {
  async photos() {
    const items = await admin.photos();
    if (!items.length) return el("p", { class: "muted" }, "No photos yet. (If guests did upload photos, check that your email is in the admins list in supabase/setup.sql.)");
    return el("div", { class: "admin-grid" }, items.map((p) => {
      const node = el("div", { class: "admin-item" });
      node.append(
        el("a", { href: p.image, target: "_blank" }, el("img", { src: p.image, loading: "lazy" })),
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
      zip.file(file, await fetch(p.image).then((r) => r.blob()));
      notes.push(`${file}\n${p.name} · ${new Date(p.created_at).toLocaleString()}\n${p.note}\n`);
    }
    const messages = await admin.messages();
    zip.file("photo-notes.txt", notes.join("\n"));
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
