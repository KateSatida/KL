"""Lists every image in assets/ into assets/manifest.json.

GitHub Pages can't list folders, so the game reads this file to know which
characters, outfits, props, drinks and frames exist. You don't have to run it
by hand: tools/serve.py runs it locally and GitHub runs it on every push.

    python tools/build_manifest.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
LAYER_FOLDERS = ["characters", "dresses", "props", "drinks"]
IMAGE_EXTS = {".png", ".gif", ".webp", ".svg", ".jpg", ".jpeg"}


def label(stem: str) -> str:
    """'02_pink_gown' -> 'Pink Gown' (a number prefix only sets the order)."""
    return re.sub(r"^\d+[_-]", "", stem).replace("_", " ").replace("-", " ").title()


def list_folder(folder: str) -> list[dict]:
    path = ASSETS / folder
    if not path.is_dir():
        return []
    return [
        {"id": f.stem, "label": label(f.stem), "url": f"assets/{folder}/{f.name}"}
        for f in sorted(path.iterdir())
        if f.suffix.lower() in IMAGE_EXTS
    ]


def build() -> dict:
    manifest = {
        "layers": {folder: list_folder(folder) for folder in LAYER_FOLDERS},
        "frames": list_folder("frames"),
    }
    (ASSETS / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", "utf-8")
    return manifest


if __name__ == "__main__":
    m = build()
    counts = ", ".join(f"{k}: {len(v)}" for k, v in m["layers"].items())
    print(f"assets/manifest.json updated ({counts}, frames: {len(m['frames'])})")
