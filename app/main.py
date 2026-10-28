"""Entry point. Run locally with:  uvicorn app.main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import settings, storage
from .realtime import hub
from .routes import admin, bar, game, photos, singles


@asynccontextmanager
async def lifespan(_app: FastAPI):
    storage.ensure_dirs()
    yield


app = FastAPI(title="Wedding Guestbook Game", docs_url=None, redoc_url=None, lifespan=lifespan)

# Each feature lives in its own file in app/routes/. To add a feature,
# create a new file there and include its router here.
for module in (game, photos, bar, singles, admin):
    app.include_router(module.router)


@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await hub.handle(ws)


@app.get("/healthz")
def health():
    return {"ok": True, "online": len(hub.players)}


@app.get("/")
def index():
    return FileResponse(settings.STATIC_DIR / "index.html")


app.mount("/assets", StaticFiles(directory=settings.ASSETS_DIR), name="assets")
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")
