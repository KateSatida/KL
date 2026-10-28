"""Tiny file-based storage. Everything guests upload lives in DATA_DIR:

data/
  photos/        photo-booth pictures (+ .json with the note)  -> admin only
  singles/       single-station pictures (+ .json profile)      -> public
  messages.json  bar message wall                               -> public
"""
import base64
import binascii
import json
import re
import threading
import time
import uuid
from pathlib import Path

from . import settings

_lock = threading.Lock()

PHOTOS_DIR = settings.DATA_DIR / "photos"
SINGLES_DIR = settings.DATA_DIR / "singles"
MESSAGES_FILE = settings.DATA_DIR / "messages.json"

_DATA_URL = re.compile(r"^data:image/(png|jpeg|webp);base64,(.+)$", re.S)
_EXT = {"png": ".png", "jpeg": ".jpg", "webp": ".webp"}
SAFE_NAME = re.compile(r"^[A-Za-z0-9_-]+\.(png|jpg|webp|json)$")


def ensure_dirs() -> None:
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    SINGLES_DIR.mkdir(parents=True, exist_ok=True)


def decode_image(data_url: str, max_bytes: int) -> tuple[bytes, str]:
    """Turn a 'data:image/...;base64,...' string into (bytes, extension)."""
    m = _DATA_URL.match(data_url or "")
    if not m:
        raise ValueError("Image must be a PNG, JPEG or WEBP data URL")
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except (binascii.Error, ValueError):
        raise ValueError("Image data is corrupted")
    if len(raw) > max_bytes:
        raise ValueError(f"Image is too large (max {max_bytes // 1024} KB)")
    return raw, _EXT[m.group(1)]


def new_id() -> str:
    return time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:8]


def save_record(folder: Path, image: bytes, ext: str, meta: dict) -> dict:
    ensure_dirs()
    rid = new_id()
    (folder / f"{rid}{ext}").write_bytes(image)
    meta = {**meta, "id": rid, "image": f"{rid}{ext}", "created": time.time()}
    (folder / f"{rid}.json").write_text(json.dumps(meta, ensure_ascii=False), "utf-8")
    return meta


def list_records(folder: Path) -> list[dict]:
    if not folder.exists():
        return []
    out = []
    for p in folder.glob("*.json"):
        try:
            out.append(json.loads(p.read_text("utf-8")))
        except (OSError, ValueError):
            continue
    return sorted(out, key=lambda r: r.get("created", 0), reverse=True)


def delete_record(folder: Path, rid: str) -> bool:
    meta_file = folder / f"{rid}.json"
    if not re.fullmatch(r"[A-Za-z0-9_-]+", rid) or not meta_file.exists():
        return False
    meta = json.loads(meta_file.read_text("utf-8"))
    (folder / meta["image"]).unlink(missing_ok=True)
    meta_file.unlink()
    return True


# ---- Bar message wall -------------------------------------------------------

def read_messages() -> list[dict]:
    if not MESSAGES_FILE.exists():
        return []
    try:
        return json.loads(MESSAGES_FILE.read_text("utf-8"))
    except ValueError:
        return []


def add_message(name: str, text: str, keep: int = 500) -> dict:
    ensure_dirs()
    msg = {"id": uuid.uuid4().hex[:10], "name": name, "text": text, "created": time.time()}
    with _lock:
        msgs = read_messages()
        msgs.append(msg)
        MESSAGES_FILE.write_text(json.dumps(msgs[-keep:], ensure_ascii=False), "utf-8")
    return msg


def delete_message(mid: str) -> bool:
    with _lock:
        msgs = read_messages()
        kept = [m for m in msgs if m["id"] != mid]
        MESSAGES_FILE.write_text(json.dumps(kept, ensure_ascii=False), "utf-8")
    return len(kept) != len(msgs)
