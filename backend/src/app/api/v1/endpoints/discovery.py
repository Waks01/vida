from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.db.models import Series
from app.schemas import SeriesPublic

router = APIRouter(tags=["discovery"])

# Top-level discovery routes as specified in vida-design.html §7
# (mirrors /content/trending and /content/search).


@router.get("/trending", response_model=list[SeriesPublic])
async def trending(session: SessionDep, limit: int = 20):
    stmt = (
        select(Series)
        .options(selectinload(Series.episodes))
        .order_by(Series.total_views.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/search", response_model=list[SeriesPublic])
async def search(q: str, session: SessionDep, limit: int = 20):
    stmt = (
        select(Series)
        .options(selectinload(Series.episodes))
        .where(Series.title.ilike(f"%{q}%"))
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
