// Character creator: pick a character, dress and prop, or draw your own layer.
// Used on the join screen and again from the Wardrobe station.
import { el } from "./ui.js";
import { composeLook } from "./sprites.js";
import { pixelEditor } from "./pixel-editor.js";

// Tabs shown in the creator. "folder" = a folder in assets/ (listed in assets/manifest.json).
const TABS = [
  { id: "character", label: "🧑 Character", folder: "characters", required: true },
  { id: "dress", label: "👗 Outfit", folder: "dresses" },
  { id: "prop", label: "🕶️ Prop", folder: "props" },
  { id: "drink", label: "🥂 Drink", folder: "drinks" },
  { id: "custom", label: "🎨 Draw", draw: true },
];

// state = { name, status, look: {...} }  (edited in place)
export function customizer(config, state, { showName = true, lockedName = null } = {}) {
  if (!state.look.character && config.layers.characters[0]) state.look.character = config.layers.characters[0].url;

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
    const guide = await composeLook(state.look, ["custom"]);
    return el("div", {},
      el("p", { class: "muted" }, "Draw your own 32×32 layer on top of your outfit (hat, tattoo, pet…)."),
      pixelEditor({
        guide,
        initial: state.look.custom,
        onDone: (dataUrl) => {
          if (dataUrl) state.look.custom = dataUrl; else delete state.look.custom;
          refresh();
        },
      }),
    );
  };

  const show = async (tab) => {
    for (const b of tabBar.children) b.classList.toggle("active", b.dataset.id === tab.id);
    panel.replaceChildren(tab.draw ? await drawPanel() : optionsFor(tab));
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
