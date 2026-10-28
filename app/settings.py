"""All settings in one place. Values come from environment variables so you
never have to put passwords in the code."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Folders
ASSETS_DIR = ROOT / "assets"          # your pixel art, frames, QR code
STATIC_DIR = ROOT / "static"          # the game itself (HTML/CSS/JS)
CONFIG_FILE = ROOT / "config" / "game.json"
DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT / "data"))  # guest uploads

# Password for /admin (username can be anything). CHANGE IT when deploying.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")

# Upload limits
MAX_PHOTO_BYTES = 4 * 1024 * 1024
MAX_SINGLE_PHOTO_BYTES = 2 * 1024 * 1024
MAX_PIXEL_ART_BYTES = 20 * 1024     # a 32x32 PNG is ~1-3 KB


def load_game_config() -> dict:
    """Read config/game.json (re-read on every call so edits apply on refresh)."""
    with open(CONFIG_FILE, encoding="utf-8") as f:
        return json.load(f)
