// Loads images and stacks the outfit layers into one 32x32 character.

export const SIZE = 32;
// Drawing order, bottom to top. Add a new layer name here if you create a new
// asset folder. "bonus" is for prizes, e.g. the caught bouquet.
export const LAYER_ORDER = ["character", "dress", "prop", "drink", "bonus"];
// When a guest uses their own drawing, it replaces the outfit pieces;
// these layers are still drawn on top of it:
const ON_TOP_OF_DRAWING = ["drink", "bonus"];

const images = new Map();

export function loadImage(url) {
  if (!url) return Promise.resolve(null);
  if (!images.has(url)) {
    images.set(url, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return images.get(url);
}

// look = { character: url, dress: url, prop: url, drink: url, custom: dataURL }
// look = { character, dress, prop, drink, bonus: url, custom: dataURL, useDrawing: bool }
export async function composeLook(look, skip = []) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const drawing = look?.useDrawing && look.custom;
  if (drawing) {
    const img = await loadImage(look.custom);
    if (img) ctx.drawImage(img, 0, 0, SIZE, SIZE);
  }
  for (const layer of drawing ? ON_TOP_OF_DRAWING : LAYER_ORDER) {
    if (skip.includes(layer)) continue;
    const img = await loadImage(look?.[layer]);
    if (img) ctx.drawImage(img, 0, 0, SIZE, SIZE);
  }
  return canvas;
}
