// Loads images and stacks the outfit layers into one 32x32 character.

export const SIZE = 32;
// Drawing order, bottom to top. Add a new layer name here (and in
// app/realtime.py clean_look) if you create a new asset folder.
export const LAYER_ORDER = ["character", "dress", "custom", "prop", "drink"];

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
export async function composeLook(look, skip = []) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  for (const layer of LAYER_ORDER) {
    if (skip.includes(layer)) continue;
    const img = await loadImage(look?.[layer]);
    if (img) ctx.drawImage(img, 0, 0, SIZE, SIZE);
  }
  return canvas;
}
