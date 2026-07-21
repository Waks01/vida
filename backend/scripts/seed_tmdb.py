"""Bulk-seed Series + Episodes from TMDB.

Uses TMDB `/trending/tv/week` for show metadata and `/tv/{id}/videos`
for playable YouTube/Vimeo clips. Series with no playable videos are
skipped entirely.
"""
from __future__ import annotations

import argparse
import asyncio
from html.parser import HTMLParser
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from sqlalchemy import case, insert, select, update

from app.core.config import get_settings
from app.core.enums import EpisodeSource, EpisodeStatus, SeriesCategory, SeriesStatus
from app.db.models import Base, Episode, Series, User
from app.db.session import AsyncSessionLocal
from app.db.session import engine as async_engine

MAX_EPISODES_PER_SERIES = 3
TEST_USER_EMAIL = "test@vida.app"
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original"
PAGE_DELAY_SECONDS = 0.3
CATEGORY_KEYS: list[str] = [c.value for c in SeriesCategory]


class _HTMLStripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def get_text(self) -> str:
        return " ".join(self.parts).strip()


def strip_html(value: str | None) -> str | None:
    if not value:
        return value
    stripper = _HTMLStripper()
    stripper.feed(value)
    return stripper.get_text() or None


def pick_category(idx: int) -> str:
    return CATEGORY_KEYS[idx % len(CATEGORY_KEYS)]


def view_count_for(show_id: int) -> int:
    return abs(hash(str(show_id)) % 500_000) + 1_000


async def get_or_create_test_user(session) -> User:
    user = (await session.execute(select(User).where(User.email == TEST_USER_EMAIL))).scalar_one_or_none()
    if user:
        return user
    from app.security import hash_password
    user = User(
        id=uuid4(),
        email=TEST_USER_EMAIL,
        password_hash=hash_password("testpass123"),
        display_name="Test User",
    )
    session.add(user)
    await session.flush()
    return user


async def fetch_trending(client: httpx.AsyncClient, page: int, api_key: str) -> list[dict]:
    resp = await client.get(
        f"{TMDB_BASE}/trending/tv/week",
        params={"api_key": api_key, "page": page},
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", [])


async def fetch_tmdb_videos(client: httpx.AsyncClient, tmdb_id: int, api_key: str) -> list[dict]:
    resp = await client.get(
        f"{TMDB_BASE}/tv/{tmdb_id}/videos",
        params={"api_key": api_key},
        timeout=15.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return [
        {
            "key": v.get("key", ""),
            "site": v.get("site", ""),
            "name": v.get("name", ""),
        }
        for v in data.get("results", [])
        if v.get("site", "").lower() in {"youtube", "vimeo"}
    ]


async def upsert_series_bulk(session, *, user: User, shows: list[dict]) -> dict[int, Series]:
    """Upsert a batch of series by title. Returns a map of title -> Series."""
    titles = [ (s.get("name") or "").strip() for s in shows if (s.get("name") or "").strip() ]
    if not titles:
        return {}

    existing = (await session.execute(
        select(Series).where(Series.title.in_(titles))
    )).scalars().all()
    existing_map = {s.title: s for s in existing}

    to_insert = []
    to_update = []
    for idx, show in enumerate(shows):
        title = (show.get("name") or "").strip()
        if not title:
            continue
        overview = strip_html(show.get("overview"))
        poster = show.get("poster_path")
        thumbnail = f"{TMDB_IMAGE_BASE}{poster}" if poster else None
        tmdb_id = show.get("id")
        category = pick_category(idx)
        views = view_count_for(tmdb_id or idx)

        if title in existing_map:
            s = existing_map[title]
            updates = {}
            if not s.thumbnail_url and thumbnail:
                updates["thumbnail_url"] = thumbnail
            if not s.description and overview:
                updates["description"] = overview
            if not s.category and category:
                updates["category"] = category
            if s.total_views == 0 and views:
                updates["total_views"] = views
            if updates:
                to_update.append((s.id, updates))
        else:
            to_insert.append({
                "id": uuid4(),
                "title": title,
                "description": overview,
                "creator_id": user.id,
                "status": SeriesStatus.PUBLISHED.value,
                "category": category,
                "total_views": views,
                "thumbnail_url": thumbnail,
            })

    if to_insert:
        await session.execute(insert(Series), to_insert)
    if to_update:
        for row_id, updates in to_update:
            await session.execute(update(Series).where(Series.id == row_id).values(**updates))
    await session.commit()

    all_series = (await session.execute(
        select(Series).where(Series.title.in_(titles))
    )).scalars().all()
    return {s.title: s for s in all_series}


async def attach_episodes_bulk(session, series_map: dict[str, Series], videos_map: dict[str, list[dict]]) -> int:
    """Attach episodes for series that have videos."""
    added = 0
    for title, series in series_map.items():
        videos = videos_map.get(title, [])
        if not videos:
            continue
        target = min(len(videos), MAX_EPISODES_PER_SERIES)
        existing = (await session.execute(
            select(Episode).where(Episode.series_id == series.id)
        )).scalars().all()
        if len(existing) >= target:
            continue

        to_add = []
        for i in range(target):
            ep_number = i + 1
            if any(e.episode_number == ep_number for e in existing):
                continue
            v = videos[i]
            to_add.append({
                "id": uuid4(),
                "series_id": series.id,
                "episode_number": ep_number,
                "title": v.get("name") or f"EP {ep_number}",
                "hls_url": None,
                "thumbnail_url": series.thumbnail_url,
                "duration_seconds": 90,
                "is_premium": ep_number > 1,
                "coin_cost": 0 if ep_number == 1 else 20,
                "source": EpisodeSource.EXTERNAL.value,
                "status": EpisodeStatus.PUBLISHED.value,
                "video_key": v.get("key"),
                "video_site": (v.get("site") or "").lower() or None,
            })
        if to_add:
            await session.execute(insert(Episode), to_add)
            added += len(to_add)
    await session.commit()
    return added


async def run(pages: int) -> None:
    load_dotenv()
    settings = get_settings()
    api_key = settings.tmdb_api_key
    if not api_key:
        raise SystemExit("TMDB_API_KEY is not set in backend/.env")

    print(f"DB: {settings.database_url}")
    print(f"Fetching {pages} page(s) of TMDB trending TV...")

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(headers={"User-Agent": "VidaDevSeeder/1.0"}) as client:
        async with AsyncSessionLocal() as session:
            user = await get_or_create_test_user(session)
            await session.commit()

            total_series = 0
            total_eps = 0
            skipped = 0

            for page in range(1, pages + 1):
                try:
                    shows = await fetch_trending(client, page, api_key)
                except httpx.HTTPStatusError as e:
                    print(f"  page {page}: HTTP {e.response.status_code}, stopping early")
                    break
                except httpx.RequestError as e:
                    print(f"  page {page}: network error ({e!r}), stopping early")
                    break

                if not shows:
                    break

                videos_map: dict[str, list[dict]] = {}
                usable_shows = []
                for show in shows:
                    tmdb_id = show.get("id")
                    name = (show.get("name") or "").strip()
                    if not tmdb_id or not name:
                        skipped += 1
                        continue
                    vids = await fetch_tmdb_videos(client, tmdb_id, api_key)
                    if not vids:
                        skipped += 1
                        continue
                    videos_map[name] = vids
                    usable_shows.append(show)

                if not usable_shows:
                    print(f"  page {page}: 0 usable (no videos)")
                    continue

                series_map = await upsert_series_bulk(session, user=user, shows=usable_shows)
                eps = await attach_episodes_bulk(session, series_map, videos_map)
                total_series += len(series_map)
                total_eps += eps
                print(f"  page {page}: {len(shows)} shows, {len(series_map)} series, {eps} episodes added")

                if page < pages:
                    await asyncio.sleep(PAGE_DELAY_SECONDS)

    await async_engine.dispose()
    print()
    print(f"Done. Series: {total_series}, Episodes: {total_eps}, Skipped: {skipped}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed Series from TMDB")
    parser.add_argument("--pages", type=int, default=1, help="Number of TMDB pages (default: 1)")
    args = parser.parse_args()
    asyncio.run(run(args.pages))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
