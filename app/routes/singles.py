"""Single station: guests post a photo + Instagram; shown on the projector."""
import hashlib
import re
import secrets

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .. import settings, storage
from ..realtime import hub

router = APIRouter(prefix="/api/singles")

PUBLIC_FIELDS = ("id", "name", "instagram", "bio")


class SingleIn(BaseModel):
    name: str
    instagram: str
    bio: str = ""
    image: str  # data URL


def clean_instagram(value: str) -> str:
    """Accept '@name', 'name' or a full instagram.com URL; keep only the handle."""
    value = value.strip()
    value = re.sub(r"^(https?://)?(www\.)?instagram\.com/", "", value).strip("/@ ")
    value = value.split("/")[0].split("?")[0]
    if not re.fullmatch(r"[A-Za-z0-9._]{1,30}", value):
        raise HTTPException(400, "Please enter a valid Instagram username")
    return value


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def public(rec: dict) -> dict:
    return {**{k: rec.get(k, "") for k in PUBLIC_FIELDS}, "image": f"/api/singles/{rec['id']}/image"}


@router.get("")
def list_singles():
    return [public(r) for r in storage.list_records(storage.SINGLES_DIR)]


@router.post("")
async def add_single(body: SingleIn):
    name = body.name.strip()[:40]
    if not name:
        raise HTTPException(400, "Please enter your name")
    try:
        raw, ext = storage.decode_image(body.image, settings.MAX_SINGLE_PHOTO_BYTES)
    except ValueError as e:
        raise HTTPException(400, str(e))
    token = secrets.token_urlsafe(16)  # lets the guest delete their own card later
    rec = storage.save_record(storage.SINGLES_DIR, raw, ext, {
        "name": name, "instagram": clean_instagram(body.instagram),
        "bio": body.bio.strip()[:140], "owner": _hash(token),
    })
    await hub.event("singles")
    return {**public(rec), "token": token}


@router.get("/{rid}/image")
def single_image(rid: str):
    for rec in storage.list_records(storage.SINGLES_DIR):
        if rec["id"] == rid:
            return FileResponse(storage.SINGLES_DIR / rec["image"])
    raise HTTPException(404)


@router.delete("/{rid}")
async def delete_own_single(rid: str, token: str):
    rec = next((r for r in storage.list_records(storage.SINGLES_DIR) if r["id"] == rid), None)
    if not rec or not secrets.compare_digest(rec.get("owner", ""), _hash(token)):
        raise HTTPException(403, "Not your card")
    storage.delete_record(storage.SINGLES_DIR, rid)
    await hub.event("singles")
    return {"ok": True}
