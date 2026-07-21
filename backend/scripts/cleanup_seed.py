"""Wipe all seeded / TVmaze content from the database.

Use with care — this deletes series, episodes, and dependent watch
history/likes/watchlist rows created by dev seed scripts. It preserves
users, creators, coin transactions, and payments.
"""
from __future__ import annotations

import asyncio

from dotenv import load_dotenv
from sqlalchemy import delete, select

from app.core.config import get_settings
from app.db.models import Episode, EpisodeLike, Series, WatchHistory, Watchlist
from app.db.session import AsyncSessionLocal

TEST_SERIES_TITLES = [
    "Midnight Heir",
    "Sintel Shorts",
    "Live Test Channel",
]


async def main() -> None:
    load_dotenv()
    settings = get_settings()
    print(f"DB: {settings.database_url}")

    async with AsyncSessionLocal() as session:
        test_series = (
            await session.execute(
                select(Series).where(Series.title.in_(TEST_SERIES_TITLES))
            )
        ).scalars().all()
        test_ids = [s.id for s in test_series]

        all_series = (
            await session.execute(select(Series))
        ).scalars().all()
        all_ids = [s.id for s in all_series]

        print(f"Found {len(all_ids)} series total, {len(test_ids)} from original seed.py")

        if not all_ids:
            print("Nothing to delete.")
            return

        await session.execute(
            delete(EpisodeLike).where(EpisodeLike.episode_id.in_(
                select(Episode.id).where(Episode.series_id.in_(all_ids))
            ))
        )
        await session.execute(
            delete(WatchHistory).where(WatchHistory.series_id.in_(all_ids))
        )
        await session.execute(
            delete(Watchlist).where(Watchlist.series_id.in_(all_ids))
        )
        await session.execute(
            delete(Episode).where(Episode.series_id.in_(all_ids))
        )
        await session.execute(
            delete(Series).where(Series.id.in_(all_ids))
        )
        await session.commit()
        print("Deleted:")
        print(f"  {len(all_ids)} series")
        print(f"    incl. {len(test_ids)} original seed.py series")
        print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
