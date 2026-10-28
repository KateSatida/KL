"""Your private dashboard at /admin (browser asks for the ADMIN_PASSWORD).
See every photo-booth picture + note, moderate messages and singles,
and download everything as one ZIP."""
import io
import secrets
import zipfile

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from .. import settings, storage
from ..realtime import hub

security = HTTPBasic(realm="Wedding admin")


def require_admin(creds: HTTPBasicCredentials = Depends(security)) -> None:
    if not secrets.compare_digest(creds.password.encode(), settings.ADMIN_PASSWORD.encode()):
        raise HTTPException(401, "Wrong password", headers={"WWW-Authenticate": "Basic"})


router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


@router.get("")
def admin_page():
    return FileResponse(settings.STATIC_DIR / "admin.html")


@router.get("/api/photos")
def photos():
    return storage.list_records(storage.PHOTOS_DIR)


@router.get("/api/singles")
def singles():
    return [{k: v for k, v in r.items() if k != "owner"} for r in storage.list_records(storage.SINGLES_DIR)]


@router.get("/api/messages")
def messages():
    return storage.read_messages()[::-1]


@router.get("/files/{kind}/{name}")
def file(kind: str, name: str):
    folder = {"photos": storage.PHOTOS_DIR, "singles": storage.SINGLES_DIR}.get(kind)
    if folder is None or not storage.SAFE_NAME.match(name) or not (folder / name).exists():
        raise HTTPException(404)
    return FileResponse(folder / name)


@router.delete("/api/{kind}/{rid}")
async def delete(kind: str, rid: str):
    if kind == "messages":
        ok = storage.delete_message(rid)
    elif kind in ("photos", "singles"):
        ok = storage.delete_record(storage.PHOTOS_DIR if kind == "photos" else storage.SINGLES_DIR, rid)
        if kind == "singles":
            await hub.event("singles")
    else:
        raise HTTPException(404)
    if not ok:
        raise HTTPException(404)
    return {"ok": True}


@router.get("/download.zip")
def download_all():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        if settings.DATA_DIR.exists():
            for p in settings.DATA_DIR.rglob("*"):
                if p.is_file():
                    z.write(p, p.relative_to(settings.DATA_DIR))
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip",
                             headers={"Content-Disposition": "attachment; filename=wedding-guestbook.zip"})
