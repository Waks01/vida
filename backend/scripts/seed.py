"""Seed the database with test content for development.

Usage:
    cd backend
    uv run python scripts/seed.py

Requires DATABASE_URL in env or .env (defaults to postgresql+asyncpg://vida:vida@localhost:5432/vida).
"""
import asyncio
import os
from uuid import uuid4

from dotenv import load_dotenv

from app.core.config import get_settings
from app.db.session import engine as async_engine, AsyncSessionLocal
from app.db.models import Base, Series, Episode, User, CoinTransaction
from app.core.enums import CoinSource, EpisodeStatus, SeriesStatus
from app.repositories.user_repository import UserRepository
from app.services.coin_service import CoinService
from app.security import hash_password
from sqlalchemy import func, select

# Public HLS test streams (free for development)
PUBLIC_HLS_URLS = [
    ("Big Buck Bunny (Mux)", "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", 120),
    ("Apple BipBop", "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8", 60),
    ("Tears of Steel", "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", 180),
    ("Sintel", "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8", 150),
    ("Akamai Live", "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8", 0),
]

TEST_SERIES = [
    {
        "title": "Midnight Heir",
        "description": "A stolen inheritance, a forbidden love. Test series seeded from public HLS streams.",
        "episodes": [0, 1],  # indices into PUBLIC_HLS_URLS
    },
    {
        "title": "Sintel Shorts",
        "description": "Open-source animated shorts curated for testing.",
        "episodes": [2, 3],
    },
    {
        "title": "Live Test Channel",
        "description": "Akamai live test stream (duration unknown).",
        "episodes": [4],
    },
]

TEST_USER_EMAIL = "test@vida.app"
TEST_USER_PASSWORD = "testpass123"


async def seed() -> None:
    load_dotenv()
    settings = get_settings()
    print(f"DB: {settings.database_url}")

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        # 1. Create or find test user
        user_repo = UserRepository(session)
        existing = await user_repo.get_by_email(TEST_USER_EMAIL)
        if existing:
            user = existing
            print(f"Using existing user: {user.email} (id={user.id})")
        else:
            user = await user_repo.create(
                email=TEST_USER_EMAIL,
                password_hash=hash_password("testpass123"),
                display_name="Test User",
            )
            await session.flush()
            print(f"Created user: {user.email} (id={user.id})")

        # 2. Credit initial coins
        coin_svc = CoinService(session)
        current_balance = await coin_svc.balance(user.id)
        if current_balance == 0:
            await coin_svc.credit(user.id, 500, CoinSource.ADMIN_ADJUST, reference_id=uuid4())
            await session.commit()
            print(f"Credited 500 coins. New balance: {await coin_svc.balance(user.id)}")
        else:
            print(f"User already has {current_balance} coins, skipping credit.")

        # 3. Create series + episodes
        for series_data in TEST_SERIES:
            series_title = series_data["title"]
            existing_series = (
                await session.execute(
                    select(Series).where(Series.title == series_title)
                )
            ).scalar_one_or_none()

            if existing_series:
                print(f"Series already exists: {series_title}")
                continue

            series = Series(
                id=uuid4(),
                title=series_title,
                description=series_data["description"],
                creator_id=user.id,
                status=SeriesStatus.PUBLISHED.value,
                total_views=0,
            )
            session.add(series)
            await session.flush()

            episodes = []
            for ep_idx in series_data["episodes"]:
                name, url, duration = PUBLIC_HLS_URLS[ep_idx]
                ep = Episode(
                    id=uuid4(),
                    series_id=series.id,
                    episode_number=len(episodes) + 1,
                    title=name,
                    hls_url=url,
                    thumbnail_url=None,
                    duration_seconds=duration,
                    is_premium=False,
                    coin_cost=0,
                    status=EpisodeStatus.PUBLISHED.value,
                )
                session.add(ep)
                episodes.append(ep)

            await session.commit()
            print(f"Created series: {series_title} ({len(episodes)} episodes)")

    await async_engine.dispose()
    print("\nSeed complete!")
    print(f"\nTest credentials:")
    print(f"  Email:    {TEST_USER_EMAIL}")
    print(f"  Password: {TEST_USER_PASSWORD}")
    print(f"\nNext steps:")
    print(f"  1. Start backend:  cd backend && uv run uvicorn app.main:app --reload")
    print(f"  2. Start mobile:   cd mobile && npm start")
    print(f"  3. Sign in with the test credentials above")


if __name__ == "__main__":
    asyncio.run(seed())
