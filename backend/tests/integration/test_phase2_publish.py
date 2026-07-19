from unittest.mock import patch
from uuid import UUID

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.enums import SeriesStatus
from app.db.models import Creator, Episode, User
from app.security import create_access_token, hash_pin


async def _auth_client(app, user_id: str) -> AsyncClient:
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    client.headers["Authorization"] = f"Bearer {create_access_token(user_id)}"
    return client


async def _make_user(session, email, is_creator=False, is_admin=False, pin_hash=None) -> User:
    user = User(email=email.lower(), password_hash="x", is_creator=is_creator,
                is_admin=is_admin, pin_hash=pin_hash)
    session.add(user)
    await session.commit()
    if is_creator:
        creator = Creator(user_id=user.id, status="approved")
        session.add(creator)
        await session.commit()
    return user


async def test_creator_publish_loop(app, session):
    creator = await _make_user(session, "pub@example.com", is_creator=True, pin_hash=hash_pin("1234"))
    admin = await _make_user(session, "adminp@example.com", is_admin=True)
    client = await _auth_client(app, str(creator.id))

    # 1) create series (pending)
    r = await client.post("/api/v1/creators/series", json={"title": "My Drama", "description": "x"})
    assert r.status_code == 200, r.text
    series_id = r.json()["id"]
    assert r.json()["status"] == SeriesStatus.PENDING.value

    # non-creator cannot create
    other = await _make_user(session, "otherp@example.com")
    oc = await _auth_client(app, str(other.id))
    bad = await oc.post("/api/v1/creators/series", json={"title": "nope"})
    assert bad.status_code == 403

    # 2) get episode upload url (Stream direct ticket)
    r2 = await client.post(
        f"/api/v1/creators/episodes/upload-url?series_id={series_id}",
        json={"filename": "ep1.mp4", "episode_title": "E1", "episode_number": 1},
    )
    # Returns Stream direct-upload ticket (200) or 502 if Stream unconfigured
    assert r2.status_code in (200, 502)
    if r2.status_code == 200:
        body = r2.json()
        assert "upload_url" in body and "episode_id" in body and "stream_uid" in body

    # 3) admin sees it pending and approves -> published
    admin_client = await _auth_client(app, str(admin.id))
    pending = await admin_client.get("/api/v1/admin/content/pending")
    assert pending.status_code == 200
    ids = [s["id"] for s in pending.json()]
    assert series_id in ids

    approve = await admin_client.post(f"/api/v1/admin/content/{series_id}/approve")
    assert approve.status_code == 200
    assert approve.json()["status"] == SeriesStatus.PUBLISHED.value

    # approved series appears in public catalog
    transport = ASGITransport(app=app)
    anon = AsyncClient(transport=transport, base_url="http://test")
    cat = await anon.get("/api/v1/content/series")
    assert cat.status_code == 200
    assert any(s["id"] == series_id for s in cat.json())


async def test_stream_webhook_completes_episode(app, session):
    """The Stream direct-upload flow must link the episode to the Stream uid it
    issued, and the webhook must flip the episode to `ready` with HLS metadata."""
    creator = await _make_user(session, "webhookc@example.com", is_creator=True)
    client = await _auth_client(app, str(creator.id))
    sr = await client.post("/api/v1/creators/series", json={"title": "Hook"})
    series_id = sr.json()["id"]

    fake_uid = "abc123-stream-uid"
    with patch(
        "app.api.v1.endpoints.creators.CloudflareStreamService.create_direct_upload_url",
        return_value={"uid": fake_uid, "upload_url": "https://x/videos", "expires_in": 3600},
    ):
        up = await client.post(
            f"/api/v1/creators/episodes/upload-url?series_id={series_id}",
            json={"filename": "ep.mp4", "episode_title": "E1", "episode_number": 1},
        )
    assert up.status_code == 200, up.text
    body = up.json()
    assert body["stream_uid"] == fake_uid
    assert body["upload_url"] == "https://x/videos"

    # Episode row carries the uid we handed to Stream.
    ep = (await session.execute(
        select(Episode).where(Episode.id == UUID(body["episode_id"]))
    )).scalar_one()
    assert ep.stream_uid == fake_uid
    assert ep.status == "pending"

    # Simulate Cloudflare Stream finishing the encode.
    transport = ASGITransport(app=app)
    anon = AsyncClient(transport=transport, base_url="http://test")
    wh = await anon.post(
        "/api/v1/content/episodes/stream-webhook",
        json={
            "result": {
                "uid": fake_uid,
                "playback": {"hls": "https://stream/hls.m3u8"},
                "preview": "https://stream/thumb.jpg",
                "duration": 120,
            }
        },
    )
    assert wh.status_code == 200
    await session.refresh(ep)
    assert ep.status == "ready"
    assert ep.hls_url == "https://stream/hls.m3u8"
    assert ep.thumbnail_url == "https://stream/thumb.jpg"
    assert ep.duration_seconds == 120
