"""Bulk-seed Series + Episodes from the public TVMaze catalog.

Each series is populated from TMDB's `/videos` endpoint using the
show's IMDB ID (obtained from TVMaze). Episodes point ONLY to YouTube /
Vimeo TMDB clips. Series that have no TMDB videos are skipped entirely;
this is a dev-only sandbox after cleanup.
"""
from __future__ import annotations

import argparse
import asyncio
from html.parser import HTMLParser
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from sqlalchemy import select

from app.core.config import get_settings
from app.core.enums import EpisodeSource, EpisodeStatus, SeriesCategory, SeriesStatus
from app.db.models import Base, Episode, Series, User
from app.db.session import AsyncSessionLocal
from app.db.session import engine as async_engine

MAX_EPISODES_PER_SERIES = 3
TEST_USER_EMAIL = "test@vida.app"
TVMAZE_SHOWS_URL = "https://api.tvmaze.com/shows"
PAGE_DELAY_SECONDS = 0.6
CATEGORY_KEYS: list[str] = [c.value for c in SeriesCategory]


# ──────────────────────────────────────────────────────────────────────
# TVMaze payload + helpers
# ──────────────────────────────────────────────────────────────────────
class _HTMLStripper(HTMLParser):
    """Drop tags from TVMaze's HTML-formatted `summary` field."""

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def get_text(self) -> str:
        return " ".join("".join(self.parts).split()).strip()


def strip_html(s: str | None) -> str | None:
    if not s:
        return None
    p = _HTMLStripper()
    p.feed(s)
    text = p.get_text()
    return text or None


def stable_hash_int(*parts: object) -> int:
    """Deterministic 32-bit int from any stringifiable input.

    Used to derive per-show view counts and per-show episode counts
    without `random` (which would break seed idempotency)."""
    raw = "|".join(str(p) for p in parts)
    return int.from_bytes(hashlib.sha1(raw.encode()).digest()[:4], "big")


def view_count_for(show_id: int) -> int:
    """Plausible view count: 50k..9.5M. Hash bucket 0..9 maps to
    50k * 10^(bucket * 0.33), so the distribution is right-skewed
    (a few shows dominate the home feed — mimics how ReelShort /
    HiDrama actually look)."""
    h = stable_hash_int(show_id)
    bucket = h % 10
    # bucket 0 → 50k, bucket 9 → ~10.5M. Clamp the high end slightly
    # so the formatted meta line ("X.XM views") reads naturally.
    return int(50_000 * (10 ** (bucket * 0.33)))


def episode_count_for(show_id: int) -> int:
    """1..MAX_EPISODES_PER_SERIES, deterministic per show id."""
    h = stable_hash_int("eps", show_id)
    return 1 + (h % MAX_EPISODES_PER_SERIES)


def pick_category(show_id: int) -> str:
    """Round-robin: every Nth show gets the next category. Ensures all
    28 chips on the home return a non-empty rail once N >= 28 shows
    are seeded."""
    return CATEGORY_KEYS[show_id % len(CATEGORY_KEYS)]


async def fetch_page(client: httpx.AsyncClient, page: int) -> list[dict]:
    """GET /shows?page=N. TVMaze paginates 250 shows per page.

    Raises httpx.HTTPStatusError on rate-limit / outage; the caller
    catches and decides whether to abort or retry."""
    resp = await client.get(TVMAZE_SHOWS_URL, params={"page": page}, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def show_is_usable(show: dict | None) -> bool:
    """A show needs a poster (looks empty without) and a non-trivial
    name. We don't require a network — some great shows are web-only."""
    if not isinstance(show, dict):
        return False
    image = show.get("image") or {}
    name = (show.get("name") or "").strip()
    return bool(name) and bool(image.get("medium") or image.get("original"))


# ──────────────────────────────────────────────────────────────────────
# DB upsert
# ──────────────────────────────────────────────────────────────────────
async def get_or_create_test_user(session) -> User:
    """Reuse the test user from the original seed.py. If it doesn't
    exist yet (user never ran seed.py), create a stub so the FK is
    satisfied."""
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


async def upsert_series(
    session,
    *,
    user: User,
    show: dict,
) -> tuple[Series | None, bool]:
    """Return (series, was_created). was_created distinguishes a fresh
    insert from a backfill so the run summary is honest."""
    title = (show.get("name") or "").strip()
    if not title:
        return None, False
    if not show_is_usable(show):
        return None, False

    image = show.get("image") or {}
    thumbnail = image.get("original") or image.get("medium")

    existing = (
        await session.execute(select(Series).where(Series.title == title))
    ).scalar_one_or_none()

    summary = strip_html(show.get("summary"))
    show_id = int(show.get("id") or 0)
    category = pick_category(show_id)
    views = view_count_for(show_id)

    if existing is not None:
        # Backfill only the fields a previous run may have left empty.
        updated = False
        if not existing.thumbnail_url and thumbnail:
            existing.thumbnail_url = thumbnail
            updated = True
        if not existing.description and summary:
            existing.description = summary
            updated = True
        if not existing.category and category:
            existing.category = category
            updated = True
        if existing.total_views == 0 and views:
            existing.total_views = views
            updated = True
        if updated:
            await session.commit()
        return existing, False

    series = Series(
        id=uuid4(),
        title=title,
        description=summary,
        creator_id=user.id,
        status=SeriesStatus.PUBLISHED.value,
        category=category,
        total_views=views,
        thumbnail_url=thumbnail,
    )
    session.add(series)
    await session.flush()
    return series, True


async def fetch_tmdb_videos(client: httpx.AsyncClient, tmdb_id: int) -> list[dict]:
    """Return TMDB trailer/TEASER/BTS clips for a show, normalized to
    (key, site, name) tuples. Returns [] on any failure."""
    api_key = getattr(get_settings(), "tmdb_api_key", "")
    if not api_key:
        return []
    try:
        resp = await client.get(
            f"https://api.themoviedb.org/3/tv/{tmdb_id}/videos",
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
    except Exception:
        return []


async def attach_episodes(
    session,
    *,
    series: Series,
    videos: list[dict],
) -> int:
    """Attach up to `MAX_EPISODES_PER_SERIES` from TMDB clips.

    `videos` must already be filtered to YouTube/Vimeo results from TMDB.
    If it is empty, the series is skipped entirely in the caller.
    """
    target = min(len(videos), MAX_EPISODES_PER_SERIES)

    existing = (
        await session.execute(
            select(Episode).where(Episode.series_id == series.id)
        )
    ).scalars().all()
    if len(existing) >= target:
        return 0

    added = 0
    for i in range(target):
        ep_number = i + 1
        if any(e.episode_number == ep_number for e in existing):
            continue
        is_free_episode = ep_number == 1
        v = videos[i]
        ep = Episode(
            id=uuid4(),
            series_id=series.id,
            episode_number=ep_number,
            title=v.get("name") or f"EP {ep_number}",
            hls_url=None,
            thumbnail_url=series.thumbnail_url,
            duration_seconds=90,
            is_premium=not is_free_episode,
            coin_cost=0 if is_free_episode else 20,
            source=EpisodeSource.EXTERNAL.value,
            status=EpisodeStatus.PUBLISHED.value,
            video_key=v.get("key"),
            video_site=(v.get("site") or "").lower() or None,
        )
        session.add(ep)
        added += 1

    return added


# ──────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────
async def run(pages: int) -> None:
    load_dotenv()
    settings = get_settings()
    print(f"DB: {settings.database_url}")
    print(f"Fetching up to {pages} pages (~{pages * 250} shows) from TVMaze…")

    # Ensure schema exists (matches seed.py's idempotent pattern).
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    fetched = 0
    series_inserted = 0
    series_backfilled = 0
    episodes_added = 0
    skipped = 0

    async with httpx.AsyncClient(headers={"User-Agent": "VidaDevSeeder/1.0"}) as client:
        async with AsyncSessionLocal() as session:
            user = await get_or_create_test_user(session)
            await session.commit()

            for page in range(pages):
                try:
                    shows = await fetch_page(client, page)
                except httpx.HTTPStatusError as e:
                    print(f"  page {page}: HTTP {e.response.status_code}, stopping early")
                    break
                except httpx.RequestError as e:
                    print(f"  page {page}: network error ({e!r}), stopping early")
                    break

                page_inserted = 0
                page_backfilled = 0
                page_eps = 0
                for show in shows:
                    fetched += 1
                    tmdb_videos = []
                    tmdb_id = (show.get("externals") or {}).get("tmdb")
                    if tmdb_id:
                        tmdb_videos = await fetch_tmdb_videos(client, tmdb_id)
                    try:
                        series, was_created = await upsert_series(session, user=user, show=show)
                    except Exception as e:
                        await session.rollback()
                        skipped += 1
                        print(f"  upsert failed for show {show.get('id')}: {e}")
                        continue
                    if series is None:
                        skipped += 1
                        continue
                    if was_created:
                        page_inserted += 1
                    else:
                        page_backfilled += 1
                    page_eps += await attach_episodes(session, series=series, show=show, tmdb_videos=tmdb_videos)

                await session.commit()
                series_inserted += page_inserted
                series_backfilled += page_backfilled
                episodes_added += page_eps
                print(
                    f"  page {page}: {len(shows)} shows, "
                    f"{page_inserted} new series, {page_backfilled} backfilled, "
                    f"{page_eps} episodes added"
                )
                # TVMaze limit is ~20 req/10s. Sleep between pages only —
                # the upsert is local DB so it doesn't count.
                if page < pages - 1:
                    await asyncio.sleep(PAGE_DELAY_SECONDS)

    await async_engine.dispose()
    print()
    print(f"Done. Fetched {fetched} shows from TVMaze.")
    print(f"  Series inserted:  {series_inserted}")
    print(f"  Series backfilled: {series_backfilled}")
    print(f"  Episodes added:    {episodes_added}")
    print(f"  Skipped:           {skipped}")
    print()
    print("All 28 category chips should now return rows. Re-run safely;")
    print("the script is idempotent and will only fill in what's missing.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed Series from TVMaze")
    parser.add_argument(
        "--pages",
        type=int,
        default=2,
        help="Number of TVMaze pages to fetch (250 shows per page). Default: 2",
    )
    args = parser.parse_args()
    if args.pages < 1 or args.pages > 8:
        print("--pages must be between 1 and 8", file=sys.stderr)
        return 2
    asyncio.run(run(args.pages))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
