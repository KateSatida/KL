// The guest's item collection (kept on this phone): every bouquet they caught
// and every lucky item they got. They can wear or take off any of them.
//   { bonus: ["assets/bouquets/01_rose.png", …], charm: ["assets/charms/clover.png", …] }
import { store } from "./ui.js";

const KEY = "myItems";

export function getItems(look = {}) {
  const items = store.get(KEY, { bonus: [], charm: [] });
  // whatever they're wearing now also counts as owned
  for (const slot of ["bonus", "charm"]) {
    if (look[slot] && !items[slot].includes(look[slot])) items[slot].push(look[slot]);
  }
  return items;
}

export function addItem(slot, url, look) {
  const items = getItems(look);
  if (!items[slot].includes(url)) items[slot].push(url);
  store.set(KEY, items);
}
