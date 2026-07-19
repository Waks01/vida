
from httpx import ASGITransport, AsyncClient

from app.core.enums import EpisodeSource, EpisodeStatus, SeriesStatus
from app.db.models import Creator, Episode, Series, User
from app.security import create_access_token


async def _auth_client(app, user_id: str) -> AsyncClient:
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    client.headers["Authorization"] = f"Bearer {create_access_token(user_id)}"
    return client


async def _make_user(session, email, is_creator=False, is_admin=False):
    user = User(email=email.lower(), password_hash="x", is_creator=is_creator, is_admin=is_admin)
    session.add(user)
    await session.commit()
    if is_creator:
        session.add(Creator(user_id=user.id, status="approved"))
        await session.commit()
    return user


async def test_admin_import_external_episode_and_stream_returns_raw(app, session):
    admin = await _make_user(session, "impadmin@example.com", is_admin=True)
    creator = await _make_user(session, "impcr@example.com", is_creator=True)
    series = Series(creator_id=creator.id, title="Third Party Show", status=SeriesStatus.PUBLISHED.value, total_views=0)
    session.add(series)
    await session.commit()

    client = await _auth_client(app, str(admin.id))
    r = await client.post(
        "/api/v1/admin/episodes/import",
        json={
            "series_id": str(series.id),
            "episode_number": 1,
            "title": "Licensed Ep 1",
            "hls_url": "https://cdn.example.com/ext/master.m3u8",
            "duration_seconds": 900,
            "is_premium": False,
            "coin_cost": 0,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == EpisodeSource.EXTERNAL.value
    ep_id = body["id"]

    # Stream endpoint returns the external URL as-is (expires_in 0).
    sr = await client.get(f"/api/v1/content/episodes/{ep_id}/stream")
    assert sr.status_code == 200, sr.text
    sbody = sr.json()
    assert sbody["hls_url"] == "https://cdn.example.com/ext/master.m3u8"
    assert sbody["expires_in_seconds"] == 0

    # Non-admin cannot import.
    noc = await _auth_client(app, str(creator.id))
    bad = await noc.post(
        "/api/v1/admin/episodes/import",
        json={"series_id": str(series.id), "title": "x", "hls_url": "https://x/y.m3u8"},
    )
    assert bad.status_code == 403


async def test_stream_source_episode_returns_stored_hls_when_unsigned(app, session):
    creator = await _make_user(session, "streamcr@example.com", is_creator=True)
    series = Series(creator_id=creator.id, title="Stream Show", status=SeriesStatus.PUBLISHED.value, total_views=0)
    session.add(series)
    await session.commit()
    ep = Episode(
        series_id=series.id,
        episode_number=1,
        title="Streamed Ep",
        hls_url="https://stream.example/hls.m3u8",
        source=EpisodeSource.STREAM,
        status=EpisodeStatus.PUBLISHED.value,
    )
    session.add(ep)
    await session.commit()

    viewer = await _auth_client(app, str(creator.id))
    sr = await viewer.get(f"/api/v1/content/episodes/{ep.id}/stream")
    assert sr.status_code == 200, sr.text
    # Unsigned (no Stream creds in tests) → returns stored hls_url; signed path
    # would only differ when Cloudflare Stream credentials are configured.
    assert sr.json()["hls_url"] == "https://stream.example/hls.m3u8"
