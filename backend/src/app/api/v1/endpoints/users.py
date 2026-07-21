from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.db.models import Episode, Series, WatchHistory, Watchlist
from app.repositories.user_repository import UserRepository
from app.schemas import (
    UserMeResponse,
    WatchHistoryEntry,
    WatchHistoryResponse,
    WatchlistAddRequest,
    WatchlistEntry,
    WatchlistResponse,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
async def users_me(user_id: CurrentUserDep, session: SessionDep):
    repo = UserRepository(session)
    user = await repo.get(user_id)
    if not user:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/me/watch-history", response_model=WatchHistoryResponse)
async def users_watch_history(
    user_id: CurrentUserDep,
    session: SessionDep,
    limit: int = Query(4, ge=1, le=20),
):
    """Last N series the user watched, in last-watched order.

    Joins WatchHistory → Series → Episode so the mobile Resume rail can
    render a single card per series with the right title, thumbnail,
    episode number, and intra-episode progress. Capped at 4 by default
    (the home only shows ~4 wide cards in the rail).
    """
    stmt = (
        select(WatchHistory)
        .where(WatchHistory.user_id == user_id)
        .options(
            selectinload(WatchHistory.series),
            selectinload(WatchHistory.episode),
        )
        .order_by(WatchHistory.last_watched_at.desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).scalars().all()

    items: list[WatchHistoryEntry] = []
    for r in rows:
        s = r.series
        ep = r.episode
        items.append(
            WatchHistoryEntry(
                id=r.id,
                series_id=s.id,
                series_title=s.title,
                series_thumbnail_url=s.thumbnail_url,
                episode_id=ep.id if ep else None,
                episode_number=ep.episode_number if ep else None,
                episode_duration_seconds=ep.duration_seconds if ep else None,
                progress=max(0.0, min(1.0, float(r.progress or 0))),
                last_watched_at=r.last_watched_at,
            )
        )
    return WatchHistoryResponse(items=items)


@router.get("/me/watchlist", response_model=WatchlistResponse)
async def list_watchlist(
    user_id: CurrentUserDep,
    session: SessionDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """User's saved series, most-recently-added first.

    Joins Watchlist → Series so the list screen can render title and
    thumbnail without a follow-up query. Default limit 50 — enough
    for the My List tab without paginating.
    """
    stmt = (
        select(Watchlist)
        .where(Watchlist.user_id == user_id)
        .options(selectinload(Watchlist.series))
        .order_by(Watchlist.added_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = (await session.execute(stmt)).scalars().all()
    items = [
        WatchlistEntry(
            id=r.id,
            series_id=r.series_id,
            series_title=r.series.title,
            series_thumbnail_url=r.series.thumbnail_url,
            added_at=r.added_at,
        )
        for r in rows
    ]
    return WatchlistResponse(items=items)


@router.post("/me/watchlist", response_model=WatchlistEntry, status_code=status.HTTP_201_CREATED)
async def add_watchlist(
    payload: WatchlistAddRequest, user_id: CurrentUserDep, session: SessionDep
):
    """Add a series to the user's watchlist. Idempotent — re-adding
    returns the existing row with 201, not 409. The unique constraint
    on (user_id, series_id) is the source of truth; the IntegrityError
    catch just lets us return the pre-existing row instead of failing.
    """
    # Confirm the series exists (FK is enforced by the DB but a missing
    # series would surface as an opaque IntegrityError otherwise).
    series = await session.get(Series, payload.series_id)
    if series is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Series not found"
        )

    existing = (
        await session.execute(
            select(Watchlist)
            .where(
                Watchlist.user_id == user_id,
                Watchlist.series_id == payload.series_id,
            )
            .options(selectinload(Watchlist.series))
        )
    ).scalar_one_or_none()
    if existing is not None:
        return WatchlistEntry(
            id=existing.id,
            series_id=existing.series_id,
            series_title=existing.series.title,
            series_thumbnail_url=existing.series.thumbnail_url,
            added_at=existing.added_at,
        )

    row = Watchlist(user_id=user_id, series_id=payload.series_id)
    session.add(row)
    try:
        await session.commit()
    except IntegrityError:
        # Lost a race with a concurrent add — re-fetch and return.
        await session.rollback()
        row = (
            await session.execute(
                select(Watchlist)
                .where(
                    Watchlist.user_id == user_id,
                    Watchlist.series_id == payload.series_id,
                )
                .options(selectinload(Watchlist.series))
            )
        ).scalar_one()
    await session.refresh(row, attribute_names=["series"])
    return WatchlistEntry(
        id=row.id,
        series_id=row.series_id,
        series_title=row.series.title,
        series_thumbnail_url=row.series.thumbnail_url,
        added_at=row.added_at,
    )


@router.delete("/me/watchlist/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_watchlist(
    series_id: str, user_id: CurrentUserDep, session: SessionDep
):
    """Remove a series from the user's watchlist. 404 when the row
    doesn't exist (idempotent at the call-site: a missing series
    just means it was never saved)."""
    from uuid import UUID

    try:
        sid = UUID(series_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid series id"
        ) from None
    row = (
        await session.execute(
            select(Watchlist).where(
                Watchlist.user_id == user_id, Watchlist.series_id == sid
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not in watchlist"
        )
    await session.delete(row)
    await session.commit()
