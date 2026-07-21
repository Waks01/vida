"""Bulk-seed Series + Episodes from the public TVMaze catalog.

TVMaze's `https://api.tvmaze.com/shows` endpoint is unauthenticated and
free (no API key, no signup, no domain). It returns ~250 western scripted
shows per page with posters, genres, and summaries — perfect for a
realistic-looking home feed during local dev.

What this script does:

  1. Fetches N pages of /shows (default 2 pages ≈ 500 shows; cap at 8
     so the script finishes in a couple of minutes even on slow networks).
  2. Filters out shows without a poster and without a network (so the
     feed reads as real content, not stubs).
  3. For each show, upserts a Series row (matched by title) with:
       - title, description, thumbnail_url, category, total_views
     `category` is round-robined across the SeriesCategory enum so every
     chip on the home returns non-empty results.
     `total_views` is a deterministic hash of the show id so the home
     shelves sort consistently across re-runs.
  4. Attaches 1-3 Episodes to each new series, pointing at the same
     public HLS test streams used by the original seed.py. Re-runs are
     idempotent: existing Series rows get their thumbnails backfilled
     and missing Episodes are added; nothing is duplicated.

Re-run safety: matched on Series.title (TVMaze titles are unique enough
for a dev seed). Episodes are matched on (series_id, episode_number)
and skipped if they exist.

Usage:
    cd backend
    uv run python scripts/seed_tvmaze.py            # default: 2 pages (~500 shows)
    uv run python scripts/seed_tvmaze.py --pages 1  # ~250 shows
    uv run python scripts/seed_tvmaze.py --pages 8  # ~2000 shows, ~2-3 min

TVMaze rate limit is ~20 req/10s. We sleep 0.6s between pages to stay
well under it. No auth, no env vars required beyond DATABASE_URL.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import sys
from html.parser import HTMLParser
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from sqlalchemy import select

from app.core.config import get_settings
from app.core.enums import EpisodeSource, EpisodeStatus, SeriesCategory, SeriesStatus
from app.db.models import Base, Episode, Series, User
from app.db.session import AsyncSessionLocal, engine as async_engine

# Reuse the test streams from the original seed so existing playback
# works without bringing up Cloudflare Stream.
PUBLIC_HLS_URLS: list[tuple[str, str, int]] = [
    ("Big Buck Bunny (Mux)", "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", 120),
    ("Apple BipBop", "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8", 60),
    ("Tears of Steel", "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", 180),
    ("Sintel", "https://bitdash-a.akamaihd.com/content/sintel/hls/playlist.m3u8", 150),
    # Akamai Live has no known runtime — fall back to 600s (10 min) so
    # the player's progress bar and the detail page's duration label
    # have a real value to display.
    ("Akamai Live", "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8", 600),
]

# Cap on the number of episodes we attach to any one series. The Mux
# streams we point at are a small fixed list, so 3 episodes already
# cycles them all — no point attaching more.
MAX_EPISODES_PER_SERIES = 3

# Test user owns every seeded series (the original seed creates this
# account; we reuse it so creator_id is always valid).
TEST_USER_EMAIL = "test@vida.app"

# The free TVMaze endpoint — no key, no auth.
TVMAZE_SHOWS_URL = "https://api.tvmaze.com/shows"
PAGE_DELAY_SECONDS = 0.6  # stay under 20 req / 10s

# All values of SeriesCategory — iterated in declaration order so the
# first N shows fill the editorial/format/origin chips, then tropes.
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


async def attach_episodes(
    session,
    *,
    series: Series,
    show: dict,
) -> int:
    """Attach 1..MAX_EPISODES_PER_SERIES episodes. Re-runs are
    idempotent (matched on series_id + episode_number)."""
    show_id = int(show.get("id") or 0)
    target = episode_count_for(show_id)

    existing = (
        await session.execute(
            select(Episode).where(Episode.series_id == series.id)
        )
    ).scalars().all()
    if len(existing) >= target:
        return 0

    # Hash the show_id into a starting offset so two shows never share
    # the same Mux stream in the same position — visually varied.
    offset = stable_hash_int("offset", show_id) % len(PUBLIC_HLS_URLS)

    added = 0
    for i in range(target):
        ep_number = i + 1
        if any(e.episode_number == ep_number for e in existing):
            continue
        stream = PUBLIC_HLS_URLS[(offset + i) % len(PUBLIC_HLS_URLS)]
        name, url, duration = stream
        # First episode per series is the free preview so the user
        # can play it without hitting the unlock sheet; subsequent
        # episodes are premium and cost 20 coins.
        is_free_episode = ep_number == 1
        ep = Episode(
            id=uuid4(),
            series_id=series.id,
            episode_number=ep_number,
            title=f"EP {ep_number} · {name}",
            hls_url=url,
            thumbnail_url=series.thumbnail_url,
            duration_seconds=duration,
            is_premium=not is_free_episode,
            coin_cost=0 if is_free_episode else 20,
            source=EpisodeSource.EXTERNAL.value,
            status=EpisodeStatus.PUBLISHED.value,
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
                    page_eps += await attach_episodes(session, series=series, show=show)

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
