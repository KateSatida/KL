"""Multiplayer hub: keeps track of everyone in the world over WebSockets.

Messages are JSON objects with a "type" field.

Client -> server
  join    {name, look, status, x, y}
  move    {x, y, dir, moving}
  status  {text}
  look    {look}
  chat    {text}                     (delivered only to players nearby)

Server -> client
  welcome  {id, players}
  joined   {player}
  left     {id}
  moved    {id, x, y, dir, moving}
  updated  {player}
  chat     {id, name, text}
  event    {name, data}              (e.g. new bar message, singles changed)
"""
import asyncio
import itertools
import math
import random
from dataclasses import asdict, dataclass, field

from fastapi import WebSocket, WebSocketDisconnect

from . import settings, storage

MAX_NAME = 24
MAX_STATUS = 60
MAX_CHAT = 300

_ids = itertools.count(1)


@dataclass
class Player:
    id: int
    name: str = "Guest"
    x: float = 0
    y: float = 0
    dir: int = 1          # 1 = facing right, -1 = facing left
    moving: bool = False
    status: str = ""
    look: dict = field(default_factory=dict)


def clean_text(value, limit: int) -> str:
    return str(value or "").replace("\n", " ").strip()[:limit]


def clean_look(look) -> dict:
    """Only keep known layer keys; layers are asset paths or a small drawing."""
    if not isinstance(look, dict):
        return {}
    out = {}
    for key in ("character", "dress", "prop", "drink"):
        val = look.get(key)
        if isinstance(val, str) and val.startswith("/assets/") and ".." not in val:
            out[key] = val[:200]
    custom = look.get("custom")
    if isinstance(custom, str) and custom.startswith("data:image/png;base64,"):
        if len(custom) <= settings.MAX_PIXEL_ART_BYTES * 4 // 3 + 64:
            out["custom"] = custom
    return out


class Hub:
    def __init__(self):
        self.players: dict[int, Player] = {}
        self.sockets: dict[int, WebSocket] = {}

    # -- sending ---------------------------------------------------------
    async def send(self, pid: int, msg: dict) -> None:
        ws = self.sockets.get(pid)
        if ws is None:
            return
        try:
            await ws.send_json(msg)
        except Exception:
            pass  # disconnect is handled by the receive loop

    async def broadcast(self, msg: dict, exclude: int | None = None) -> None:
        await asyncio.gather(*(self.send(pid, msg) for pid in list(self.sockets) if pid != exclude))

    async def event(self, name: str, data=None) -> None:
        """Push a world event (new bar message etc.) to everyone."""
        await self.broadcast({"type": "event", "name": name, "data": data})

    # -- connection loop -------------------------------------------------
    async def handle(self, ws: WebSocket) -> None:
        await ws.accept()
        pid = next(_ids)
        try:
            first = await ws.receive_json()
            if first.get("type") != "join":
                await ws.close()
                return
            cfg = settings.load_game_config()
            spawn = cfg["world"]["spawn"]
            p = Player(
                id=pid,
                name=clean_text(first.get("name"), MAX_NAME) or "Guest",
                x=float(first.get("x") or spawn["x"] + random.randint(-80, 80)),
                y=float(first.get("y") or spawn["y"] + random.randint(-40, 40)),
                status=clean_text(first.get("status"), MAX_STATUS),
                look=clean_look(first.get("look")),
            )
            self.players[pid] = p
            self.sockets[pid] = ws
            await ws.send_json({"type": "welcome", "id": pid,
                                "players": [asdict(o) for o in self.players.values()]})
            await self.broadcast({"type": "joined", "player": asdict(p)}, exclude=pid)

            while True:
                msg = await ws.receive_json()
                await self.on_message(p, msg, cfg)
        except (WebSocketDisconnect, RuntimeError, ValueError):
            pass
        finally:
            self.sockets.pop(pid, None)
            if self.players.pop(pid, None):
                await self.broadcast({"type": "left", "id": pid})

    async def on_message(self, p: Player, msg: dict, cfg: dict) -> None:
        kind = msg.get("type")
        if kind == "move":
            w, h = cfg["world"]["width"], cfg["world"]["height"]
            try:
                p.x = min(max(float(msg["x"]), 0), w)
                p.y = min(max(float(msg["y"]), 0), h)
            except (KeyError, TypeError, ValueError):
                return
            p.dir = -1 if msg.get("dir") == -1 else 1
            p.moving = bool(msg.get("moving"))
            await self.broadcast({"type": "moved", "id": p.id, "x": p.x, "y": p.y,
                                  "dir": p.dir, "moving": p.moving}, exclude=p.id)
        elif kind == "status":
            p.status = clean_text(msg.get("text"), MAX_STATUS)
            await self.broadcast({"type": "updated", "player": asdict(p)})
        elif kind == "look":
            p.look = clean_look(msg.get("look"))
            await self.broadcast({"type": "updated", "player": asdict(p)})
        elif kind == "chat":
            text = clean_text(msg.get("text"), MAX_CHAT)
            if not text:
                return
            radius = cfg["world"].get("chatRadius", 160)
            out = {"type": "chat", "id": p.id, "name": p.name, "text": text}
            near = [o.id for o in self.players.values()
                    if math.dist((o.x, o.y), (p.x, p.y)) <= radius]
            await asyncio.gather(*(self.send(i, out) for i in near))


hub = Hub()
