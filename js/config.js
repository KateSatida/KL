// Loads config/game.json and the list of art files (assets/manifest.json).
// The manifest is made by tools/build_manifest.py (GitHub does this for you
// on every push, see .github/workflows/pages.yml).

export async function loadConfig() {
  const [config, manifest] = await Promise.all([
    fetch("config/game.json", { cache: "no-cache" }).then((r) => r.json()),
    fetch("assets/manifest.json", { cache: "no-cache" }).then((r) => r.json()),
  ]);
  config.layers = manifest.layers;
  config.frames = manifest.frames;
  return config;
}
