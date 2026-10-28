"""Run with:  pip install -r requirements-dev.txt && pytest"""
import base64
import importlib

import pytest
from fastapi.testclient import TestClient

PNG = "data:image/png;base64," + base64.b64encode(
    bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                  "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082")
).decode()


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ADMIN_PASSWORD", "secret")
    from app import settings, storage
    importlib.reload(settings)
    importlib.reload(storage)
    from app.routes import admin, bar, photos, singles
    for m in (admin, bar, photos, singles):
        importlib.reload(m)
    from app import main
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def test_config_lists_assets(client):
    cfg = client.get("/api/config").json()
    assert cfg["layers"]["characters"], "placeholder characters should exist"
    assert cfg["frames"]
    assert client.get(cfg["layers"]["characters"][0]["url"]).status_code == 200


def test_photo_is_private(client):
    assert client.post("/api/photos", json={"name": "Ann", "note": "Congrats!", "image": PNG}).json() == {"ok": True}
    assert client.get("/admin/api/photos").status_code == 401
    assert client.get("/admin/api/photos", auth=("x", "wrong")).status_code == 401
    photos = client.get("/admin/api/photos", auth=("admin", "secret")).json()
    assert photos[0]["note"] == "Congrats!"
    img = client.get(f"/admin/files/photos/{photos[0]['image']}", auth=("admin", "secret"))
    assert img.status_code == 200
    assert client.get("/admin/download.zip", auth=("admin", "secret")).status_code == 200


def test_bad_image_rejected(client):
    assert client.post("/api/photos", json={"image": "not an image"}).status_code == 400


def test_messages(client):
    client.post("/api/messages", json={"name": "Bob", "text": "Cheers!"})
    assert client.get("/api/messages").json()[0]["text"] == "Cheers!"
    assert client.post("/api/messages", json={"name": "Bob", "text": "  "}).status_code == 400


def test_singles_flow(client):
    res = client.post("/api/singles", json={"name": "Cat", "instagram": "https://www.instagram.com/cat.lover/",
                                            "bio": "hi", "image": PNG}).json()
    assert res["instagram"] == "cat.lover"
    listed = client.get("/api/singles").json()
    assert "owner" not in listed[0]
    assert client.get(listed[0]["image"]).status_code == 200
    assert client.delete(f"/api/singles/{res['id']}?token=nope").status_code == 403
    assert client.delete(f"/api/singles/{res['id']}?token={res['token']}").status_code == 200
    assert client.get("/api/singles").json() == []


def test_proximity_chat(client):
    with client.websocket_connect("/ws") as a, client.websocket_connect("/ws") as b, client.websocket_connect("/ws") as c:
        a.send_json({"type": "join", "name": "A", "x": 100, "y": 100})
        a_id = a.receive_json()["id"]
        b.send_json({"type": "join", "name": "B", "x": 120, "y": 100})
        b.receive_json()
        assert a.receive_json()["type"] == "joined"
        c.send_json({"type": "join", "name": "C", "x": 1500, "y": 1000})
        c.receive_json()
        a.receive_json(); b.receive_json()  # C joined
        a.send_json({"type": "chat", "text": "hello"})
        assert a.receive_json()["text"] == "hello"
        got = b.receive_json()
        assert got == {"type": "chat", "id": a_id, "name": "A", "text": "hello"}
        # C is far away: the next thing C hears is B's status, not A's chat
        b.send_json({"type": "status", "text": "hi all"})
        assert c.receive_json()["type"] == "updated"
