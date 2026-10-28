"""Drink bar: a public message wall guests write on by talking to the bartender."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import storage
from ..realtime import hub

router = APIRouter(prefix="/api/messages")


class MessageIn(BaseModel):
    name: str = ""
    text: str


@router.get("")
def list_messages():
    return storage.read_messages()[-100:][::-1]


@router.post("")
async def post_message(body: MessageIn):
    text = body.text.strip()[:500]
    if not text:
        raise HTTPException(400, "Message is empty")
    msg = storage.add_message(body.name.strip()[:40] or "Guest", text)
    await hub.event("message", msg)
    return msg
