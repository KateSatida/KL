// Private admin page (/admin): photos, messages and singles.
import { $, el, timeAgo } from "./ui.js";

const get = (url) => fetch(url).then((r) => r.json());
const del = (kind, id) => fetch(`/admin/api/${kind}/${id}`, { method: "DELETE" });

const removeBtn = (kind, id, node) => el("button", { class: "btn small", onclick: async () => {
  if (!confirm("Delete this permanently?")) return;
  await del(kind, id);
  node.remove();
} }, "🗑 Delete");

const views = {
  async photos() {
    const items = await get("/admin/api/photos");
    if (!items.length) return el("p", { class: "muted" }, "No photos yet.");
    return el("div", { class: "admin-grid" }, items.map((p) => {
      const node = el("div", { class: "admin-item" });
      const src = `/admin/files/photos/${p.image}`;
      node.append(
        el("a", { href: src, target: "_blank" }, el("img", { src, loading: "lazy" })),
        el("div", { class: "meta" }, el("b", {}, p.name || "Guest"), ` · ${timeAgo(p.created)}\n`, p.note || "",
          el("div", { class: "row", style: "margin-top:8px" },
            el("a", { class: "btn small", href: src, download: p.image }, "⬇ Download"), removeBtn("photos", p.id, node))),
      );
      return node;
    }));
  },
  async messages() {
    const items = await get("/admin/api/messages");
    if (!items.length) return el("p", { class: "muted" }, "No messages yet.");
    return el("div", { class: "wall card", style: "max-height:none" }, items.map((m) => {
      const node = el("div", { class: "msg" });
      node.append(el("b", {}, m.name), " ", el("small", {}, timeAgo(m.created)), el("div", {}, m.text), removeBtn("messages", m.id, node));
      return node;
    }));
  },
  async singles() {
    const items = await get("/admin/api/singles");
    if (!items.length) return el("p", { class: "muted" }, "No singles yet.");
    return el("div", { class: "admin-grid" }, items.map((s) => {
      const node = el("div", { class: "admin-item" });
      node.append(el("img", { src: `/admin/files/singles/${s.image}`, loading: "lazy" }),
        el("div", { class: "meta" }, el("b", {}, s.name), ` @${s.instagram}\n${s.bio || ""}\n`, removeBtn("singles", s.id, node)));
      return node;
    }));
  },
};

async function show(tab) {
  for (const b of $("#admin-tabs").children) b.classList.toggle("active", b.dataset.tab === tab);
  $("#admin-content").replaceChildren(el("p", { class: "muted" }, "Loading…"));
  $("#admin-content").replaceChildren(await views[tab]());
}
$("#admin-tabs").addEventListener("click", (e) => { if (e.target.dataset.tab) show(e.target.dataset.tab); });
show("photos");
