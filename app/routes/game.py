"""Game data: the world config and the list of art layers in assets/."""
import re

from fastapi import APIRouter

from .. import settings

router = APIRouter(prefix="/api")

IMAGE_EXTS = {".png", ".gif", ".webp", ".svg", ".jpg", ".jpeg"}


def label(stem: str) -> str:
    return re.sub(r"^\d+[_-]", "", stem).replace("_", " ").replace("-", " ").title()


def list_assets(folder: str) -> list[dict]:
    """Every image in assets/<folder>/ becomes a selectable option.
    The file name becomes the label: '02_pink_gown.png' -> 'Pink Gown'
    (a number prefix only controls the order)."""
    path = settings.ASSETS_DIR / folder
    if not path.is_dir():
        return []
    return [
        {"id": f.stem, "label": label(f.stem),
         "url": f"/assets/{folder}/{f.name}"}
        for f in sorted(path.iterdir())
        if f.suffix.lower() in IMAGE_EXTS
    ]


@router.get("/config")
def get_config():
    cfg = settings.load_game_config()
    cfg["layers"] = {name: list_assets(name) for name in ("characters", "dresses", "props", "drinks")}
    cfg["frames"] = list_assets("frames")
    return cfg
