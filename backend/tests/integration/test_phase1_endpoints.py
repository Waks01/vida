from httpx import ASGITransport, AsyncClient

from app.core.enums import SeriesStatus
from app.db.models import Creator, Series, User
from app.security import create_access_token, hash_pin


async def _auth_client(app, user_id: str) -> AsyncClient:
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    client.headers["Authorization"] = f"Bearer {create_access_token(user_id)}"
    return client


async def _make_user(session, email: str, is_creator: bool = False, is_admin: bool = False, pin_hash: str | None = None) -> User:
    user = User(
        email=email.lower(),
        password_hash="x",
        is_creator=is_creator,
        is_admin=is_admin,
        pin_hash=pin_hash,
    )
    session.add(user)
    await session.commit()
    if is_creator:
        creator = Creator(user_id=user.id, status="approved")
        session.add(creator)
        await session.commit()
    return user


async def test_creators_upload_url_requires_creator(app, session):
    user = await _make_user(session, "uploader@example.com")
    client = await _auth_client(app, str(user.id))
    # Non-creator cannot obtain an upload ticket (needs a series they own).
    series = Series(title="S", creator_id=user.id, status="published", total_views=0)
    session.add(series)
    await session.commit()
    resp = await client.post(
        f"/api/v1/creators/episodes/upload-url?series_id={series.id}",
        json={"filename": "ep.mp4", "episode_title": "E1", "episode_number": 1},
    )
    # Non-creator gets 403.
    assert resp.status_code == 403


async def test_creators_upload_url_creator_ok_or_502(app, session):
    user = await _make_user(
        session, "creator@example.com", is_creator=True, pin_hash=hash_pin("1234")
    )
    client = await _auth_client(app, str(user.id))
    series = Series(title="S", creator_id=user.id, status="pending", total_views=0)
    session.add(series)
    await session.commit()
    resp = await client.post(
        f"/api/v1/creators/episodes/upload-url?series_id={series.id}",
        json={"filename": "ep.mp4", "episode_title": "E1", "episode_number": 1},
    )
    # Either Stream issues a direct-upload ticket (200) or it's unconfigured (502).
    assert resp.status_code in (200, 502)
    if resp.status_code == 200:
        body = resp.json()
        assert "upload_url" in body and "episode_id" in body


async def test_episodes_upload_requires_auth(app):
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    resp = await client.post(
        "/api/v1/content/episodes/upload",
        data={"series_id": "00000000-0000-0000-0000-000000000000", "episode_number": 1},
        files={"file": ("ep.mp4", b"x", "video/mp4")},
    )
    assert resp.status_code == 401


async def test_episodes_upload_rejects_non_creator(app, session):
    user = await _make_user(session, "notcreator@example.com")
    client = await _auth_client(app, str(user.id))
    resp = await client.post(
        "/api/v1/content/episodes/upload",
        data={"series_id": "00000000-0000-0000-0000-000000000000", "episode_number": 1},
        files={"file": ("ep.mp4", b"x", "video/mp4")},
    )
    assert resp.status_code == 403


async def test_admin_metrics_requires_admin(app, session):
    user = await _make_user(session, "normie@example.com")
    client = await _auth_client(app, str(user.id))
    resp = await client.get("/api/v1/admin/metrics")
    assert resp.status_code == 403


async def test_admin_approve_flow(app, session):
    admin = await _make_user(session, "admin@example.com", is_admin=True)
    creator = await _make_user(session, "c2@example.com", is_creator=True)
    series = Series(
        title="Pending Show",
        creator_id=creator.id,
        status=SeriesStatus.PENDING.value,
        total_views=0,
    )
    session.add(series)
    await session.commit()

    admin_client = await _auth_client(app, str(admin.id))
    pending = await admin_client.get("/api/v1/admin/content/pending")
    assert pending.status_code == 200
    assert any(s["id"] == str(series.id) for s in pending.json())

    approve = await admin_client.post(f"/api/v1/admin/content/{series.id}/approve")
    assert approve.status_code == 200
    assert approve.json()["status"] == "published"


async def test_trending_orders_by_views(app, session):
    c = await _make_user(session, "trend@example.com", is_creator=True)
    s1 = Series(title="Low", creator_id=c.id, status="published", total_views=5)
    s2 = Series(title="High", creator_id=c.id, status="published", total_views=999)
    session.add_all([s1, s2])
    await session.commit()

    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    resp = await client.get("/api/v1/trending")
    assert resp.status_code == 200
    titles = [s["title"] for s in resp.json()]
    assert titles[0] == "High"
