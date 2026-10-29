// Single station: post your photo + Instagram so you show up on the projector.
import { el, openModal, closeModal, fileToJpeg, store, tabs, toast } from "../ui.js";

const MY_CARDS = "singles.mine";   // {id: deleteToken} saved on this device

export const igUrl = (handle) => `https://instagram.com/${encodeURIComponent(handle)}`;

export function singleCard(s, extra) {
  return el("div", { class: "single-card" },
    el("img", { src: s.image, alt: s.name, loading: "lazy" }),
    el("div", { class: "name" }, s.name),
    s.bio ? el("div", { class: "muted", style: "font-size:13px;padding:0 6px" }, s.bio) : null,
    el("a", { href: igUrl(s.instagram), target: "_blank", rel: "noopener" }, `@${s.instagram}`),
    extra || null,
  );
}

export function browseSingles(game) {
  const grid = el("div", { class: "singles-grid" }, el("p", { class: "muted" }, "Loading…"));
  const mine = store.get(MY_CARDS, {});
  game.backend.listSingles().then((list) => {
    grid.replaceChildren(...(list.length ? list.map((s) => singleCard(s, mine[s.id] ? el("div", {},
      el("button", { class: "btn small", style: "margin-top:6px", onclick: async () => {
        if (!confirm("Remove your card from the projector?")) return;
        try {
          await game.backend.deleteSingle(s.id, mine[s.id]);
        } catch (e) { return toast(e.message); }
        delete mine[s.id];
        store.set(MY_CARDS, mine);
        game.broadcast("singles");
        closeModal();
        toast("Your card was removed");
      } }, "Remove my card")) : null)) : [el("p", { class: "muted" }, "Nobody yet. Be the first!")]));
  }).catch((e) => grid.replaceChildren(el("p", { class: "muted" }, e.message)));
  return grid;
}

// Accept "@name", "name" or an instagram.com link; keep only the username.
export function cleanInstagram(value) {
  const handle = value.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

export default function singles(def, game) {
  const form = () => {
    const name = el("input", { maxlength: 40, value: game.state.name || "" });
    const ig = el("input", { maxlength: 60, placeholder: "@yourname" });
    const bio = el("input", { maxlength: 140, placeholder: "Loves cats, coffee and karaoke" });
    const file = el("input", { type: "file", accept: "image/*" });
    const preview = el("img", { style: "max-width:160px;border-radius:12px;display:none;margin-top:8px" });
    let image = null;
    file.addEventListener("change", async () => {
      if (!file.files[0]) return;
      image = await fileToJpeg(file.files[0], 720, 0.85);
      preview.src = URL.createObjectURL(image);
      preview.style.display = "block";
    });
    const submit = el("button", { class: "btn primary", onclick: async () => {
      if (!name.value.trim()) return toast("Please enter your name");
      const instagram = cleanInstagram(ig.value);
      if (!instagram) return toast("Please enter a valid Instagram username");
      if (!image) return toast("Please add a photo 📷");
      submit.disabled = true;
      try {
        const res = await game.backend.addSingle({ name: name.value.trim(), instagram, bio: bio.value.trim(), blob: image });
        const mine = store.get(MY_CARDS, {});
        mine[res.id] = res.token;
        store.set(MY_CARDS, mine);
        game.broadcast("singles");
        closeModal();
        toast("You're on the projector! 💘");
      } catch (e) { toast(e.message); submit.disabled = false; }
    } }, "💘 Put me on the projector");
    return el("div", {},
      el("p", {}, game.config.singles.intro),
      el("label", {}, "Name"), name,
      el("label", {}, "Instagram"), ig,
      el("label", {}, "Short bio (optional)"), bio,
      el("label", {}, "Your best photo"), file, preview,
      el("div", { style: "margin-top:14px" }, submit),
    );
  };

  return {
    open() {
      openModal(`${def.icon} ${def.label}`, tabs([
        { id: "join", label: "✨ Add me", render: form },
        { id: "browse", label: "👀 Browse singles", render: () => browseSingles(game) },
      ]));
    },
  };
}
