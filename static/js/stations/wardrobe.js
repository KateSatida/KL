// Wardrobe: change your outfit and status after joining.
import { el, openModal, closeModal } from "../ui.js";
import { customizer } from "../customize.js";

export default function wardrobe(def, game) {
  return {
    open() {
      const draft = structuredClone({ ...game.state });
      openModal(`${def.icon} ${def.label}`, el("div", {},
        customizer(game.config, draft, { showName: false }),
        el("div", { class: "row", style: "justify-content:center;margin-top:12px" },
          el("button", { class: "btn primary", onclick: () => {
            game.setLook(draft.look);
            game.setStatus(draft.status);
            closeModal();
          } }, "✔ Save outfit")),
      ));
    },
  };
}
