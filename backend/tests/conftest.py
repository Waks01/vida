import tempfile
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_session
from app.db.models import Base
from app.main import create_app

# Phase 0 test DB: isolated on-disk async SQLite in a temp dir.
# The app's override session and the test's `session` fixture share the SAME
# AsyncSession instance (held in a module-level var), so the endpoint sees
# exactly what the test committed (matching Postgres behaviour).
_tmp = tempfile.mkdtemp(prefix="vida-test-")
_db_path = Path(_tmp) / "test.db"
_engine = create_async_engine(f"sqlite+aiosqlite:///{_db_path}", echo=False)
_SessionLocal = async_sessionmaker(_engine, expire_on_commit=False)

_current_session: AsyncSession | None = None


@pytest_asyncio.fixture(autouse=True)
async def _create_tables():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_session() -> AsyncGenerator[AsyncSession, None]:
    """Used by the app. Reuses the test's `session` fixture when present so
    the endpoint sees committed data; otherwise opens its own session on the
    same file DB (tables are created by the autouse fixture)."""
    if _current_session is not None:
        yield _current_session
        return
    async with _SessionLocal() as s:
        yield s


@pytest.fixture
def app():
    application = create_app()
    application.dependency_overrides[get_session] = _override_session
    return application


@pytest_asyncio.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    global _current_session
    async with _SessionLocal() as s:
        _current_session = s
        try:
            yield s
        finally:
            _current_session = None
