// Character creator: pick a character, dress and prop, or draw your own layer.
// Used on the join screen and again from the Wardrobe station.
import { el, toast } from "./ui.js";
import { composeLook, cropPreview, CHARM_AREA, upgradeLook } from "./sprites.js";
import { getItems } from "./items.js";
import { pixelEditor } from "./pixel-editor.js";

// Tabs shown in the creator. "folder" = a folder in assets/ (listed in assets/manifest.json).
const TABS = [
  { id: "body", label: "🧍 Body", folder: "bodies", required: true },
  { id: "hair", label: "💇 Hair", folder: "hairs" },
  { id: "dress", label: "👗 Outfit", folder: "dresses", required: true },
  { id: "prop", label: "🕶️ Prop", folder: "props" },
  { id: "drink", label: "🥂 Drink", folder: "drinks" },
  { id: "custom", label: "🎨 Draw", draw: true },
  { id: "items", label: "🎁 Items", items: true },
];



// state = { name, status, look: {...} }  (edited in place)
// onDrawingDone(): called after "Use drawing" (the wardrobe saves right away)
export function customizer(config, state, { showName = true, lockedName = null, onDrawingDone = null } = {}) {
  state.look = upgradeLook(state.look);                     // old saved characters → body + hair
  if (!state.look.body && config.layers.bodies[0]) {
    state.look.body = config.layers.bodies[0].url;
    if (config.layers.hairs[0]) state.look.hair = config.layers.hairs[0].url;
  }
  for (const tab of TABS) {                                 // drop pieces that were removed from the wardrobe
    const url = state.look[tab.id];
    if (tab.folder && url && url.startsWith(`assets/${tab.folder}/`) && !(config.layers[tab.folder] || []).some((i) => i.url === url)) delete state.look[tab.id];
  }
  if (!state.look.body && config.layers.bodies[0]) state.look.body = config.layers.bodies[0].url;
  if (!state.look.dress && config.layers.dresses?.[0]) state.look.dress = config.layers.dresses[0].url;   // nobody starts without an outfit

  const preview = el("canvas", { width: 32, height: 32 });
  const refresh = async () => {
    const c = await composeLook(state.look);
    const ctx = preview.getContext("2d");
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(c, 0, 0);
  };

  const nameInput = el("input", { maxlength: 24, placeholder: "Your name", value: state.name || "" });
  nameInput.addEventListener("input", () => { state.name = nameInput.value; });
  if (lockedName) { nameInput.value = state.name = lockedName; nameInput.readOnly = true; }
  const statusInput = el("input", { maxlength: 60, placeholder: "Status above your head, e.g. Friend of the bride 💕", value: state.status || "" });
  statusInput.addEventListener("input", () => { state.status = statusInput.value; });

  const tabBar = el("div", { class: "tabs" });
  const panel = el("div");

  const optionsFor = (tab) => {
    const grid = el("div", { class: "options" });
    const items = config.layers[tab.folder] || [];
    const choices = tab.required ? items : [{ id: "", label: "None", url: null }, ...items];
    for (const item of choices) {
      const selected = (state.look[tab.id] || null) === item.url;
      grid.append(el("button", {
        class: "option" + (selected ? " selected" : ""),
        onclick: () => {
          if (item.url) state.look[tab.id] = item.url; else delete state.look[tab.id];
          state.look.useDrawing = false;          // back to outfit pieces (the drawing is kept)
          for (const b of grid.children) b.classList.remove("selected");
          grid.children[choices.indexOf(item)].classList.add("selected");
          refresh();
        },
      }, item.url ? el("img", { src: item.url, alt: item.label }) : el("span", { class: "none" }, "🚫"), item.label));
    }
    if (!items.length) grid.append(el("p", { class: "muted" }, `Add PNG files to assets/${tab.folder}/`));
    return grid;
  };

  const drawPanel = async () => {
    // their character as pixels to start from (without the drink they're holding)
    const character = await composeLook({ ...state.look, useDrawing: false }, ["drink", "bonus"]);
    return el("div", {},
      el("p", { class: "muted" }, "Your character is on the canvas: draw on it, erase parts, or start from blank. Your drawing becomes your character. Pick any outfit piece later to switch back."),
      pixelEditor({
        character,
        initial: state.look.useDrawing ? state.look.custom : null,
        onDone: (dataUrl) => {
          if (dataUrl) { state.look.custom = dataUrl; state.look.useDrawing = true; }
          else { delete state.look.custom; state.look.useDrawing = false; }
          refresh();
          if (onDrawingDone) onDrawingDone();
          else toast(dataUrl ? "Drawing on! 🎨" : "Drawing removed");
        },
      }),
    );
  };

  // 🎁 Items: everything collected in the game; wear one per slot or take it off
  const itemsPanel = () => {
    const owned = getItems(state.look);
    if (!owned.bonus.length && !owned.charm.length) {
      return el("p", { class: "muted" }, "No items yet. Catch a bouquet 💐 or visit the horoscope 🔮 to get some!");
    }
    const section = (slot, title) => {
      if (!owned[slot].length) return null;
      const box = el("div", { class: "options" });
      for (const url of owned[slot]) {
        const wearing = state.look[slot] === url;
        const pic = slot === "charm" ? cropPreview(url, CHARM_AREA, "item-preview") : el("img", { src: url, alt: "" });
        box.append(el("div", { class: "option" + (wearing ? " selected" : "") }, pic,
          el("button", { class: "btn small" + (wearing ? "" : " green"), style: "margin-top:4px", onclick: () => {
            if (wearing) delete state.look[slot]; else state.look[slot] = url;
            refresh();
            if (onDrawingDone) onDrawingDone();               // wardrobe: save right away
            else panel.replaceChildren(itemsPanel());
            toast(wearing ? "Taken off" : "Wearing it ✨");
          } }, wearing ? "✕ Take off" : "✔ Wear")));
      }
      return el("div", {}, el("h3", { style: "margin:10px 0 4px" }, title), box);
    };
    return el("div", {},
      el("p", { class: "muted" }, "Everything you've collected. Wear one bouquet and one lucky item at a time."),
      section("bonus", "💐 Bouquets"),
      section("charm", "🔮 Lucky items"));
  };

  const show = async (tab) => {
    for (const b of tabBar.children) b.classList.toggle("active", b.dataset.id === tab.id);
    panel.replaceChildren(tab.draw ? await drawPanel() : tab.items ? itemsPanel() : optionsFor(tab));
  };
  for (const tab of TABS) tabBar.append(el("button", { class: "tab", "data-id": tab.id, onclick: () => show(tab) }, tab.label));
  show(TABS[0]);
  refresh();

  return el("div", { class: "customizer" },
    el("div", { class: "preview-box" },
      preview,
      showName ? el("label", {}, "Name") : null,
      showName ? nameInput : null,
      showName ? el("small", { class: "muted" }, lockedName
        ? "This phone's name. It stays the same every time you come back."
        : "No sign-up needed. Pick a name nobody else uses. It stays with this phone.") : null,
      el("label", {}, "Status"),
      statusInput,
    ),
    el("div", {}, tabBar, panel),
  );
}
