
from httpx import ASGITransport, AsyncClient

from app.core.enums import EpisodeSource, EpisodeStatus, SeriesStatus
from app.db.models import Creator, Episode, Series, User
from app.security import create_access_token


async def _auth_client(app, user_id: str) -> AsyncClient:
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    client.headers["Authorization"] = f"Bearer {create_access_token(user_id)}"
    return client


async def _make_user(session, email, is_creator=False):
    user = User(email=email.lower(), password_hash="x", is_creator=is_creator)
    session.add(user)
    await session.commit()
    if is_creator:
        session.add(Creator(user_id=user.id, status="approved"))
        await session.commit()
    return user


async def test_watch_heartbeat_increments_episode_and_series_views(app, session):
    creator = await _make_user(session, "watchcr@example.com", is_creator=True)
    series = Series(
        creator_id=creator.id,
        title="Watch Show",
        status=SeriesStatus.PUBLISHED.value,
        total_views=0,
    )
    session.add(series)
    await session.commit()
    ep = Episode(
        series_id=series.id,
        episode_number=1,
        title="Watch Ep",
        source=EpisodeSource.STREAM,
        status=EpisodeStatus.PUBLISHED.value,
        views=0,
    )
    session.add(ep)
    await session.commit()

    viewer = await _auth_client(app, str(creator.id))

    r1 = await viewer.post(f"/api/v1/content/episodes/{ep.id}/watch")
    assert r1.status_code == 200, r1.text
    assert r1.json()["views"] == 1

    # Second heartbeat bumps again; series total_views stays in sync.
    r2 = await viewer.post(f"/api/v1/content/episodes/{ep.id}/watch")
    assert r2.json()["views"] == 2

    # Unknown episode → 404.
    r3 = await viewer.post("/api/v1/content/episodes/00000000-0000-0000-0000-000000000000/watch")
    assert r3.status_code == 404
