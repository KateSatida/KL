"""Photo booth: guests upload their framed selfie + a note. Only the admin sees them."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import settings, storage

router = APIRouter(prefix="/api/photos")


class PhotoIn(BaseModel):
    name: str = ""
    note: str = ""
    image: str  # data URL


@router.post("")
def upload_photo(body: PhotoIn):
    try:
        raw, ext = storage.decode_image(body.image, settings.MAX_PHOTO_BYTES)
    except ValueError as e:
        raise HTTPException(400, str(e))
    storage.save_record(storage.PHOTOS_DIR, raw, ext,
                        {"name": body.name.strip()[:40], "note": body.note.strip()[:1000]})
    return {"ok": True}
