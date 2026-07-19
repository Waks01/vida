from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.enums import CoinSource, EpisodeSource
from app.db.models import (
    CoinTransaction,
    Episode,
    Series,
    User,
)
from app.schemas import (
    AdminContentItem,
    AdminMetrics,
    CoinAdjustRequest,
    EpisodeImportRequest,
    EpisodePublic,
    SeriesPublic,
)
from app.services.coin_service import CoinLedgerError, CoinService

router = APIRouter(prefix="/admin", tags=["admin"])


async def _require_admin(user_id: CurrentUserDep, session: SessionDep) -> User:
    user = await session.get(User, user_id)
    if user is None or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return user


@router.get("/metrics", response_model=AdminMetrics)
async def admin_metrics(user_id: CurrentUserDep, session: SessionDep):
    await _require_admin(user_id, session)
    users_q = select(func.count()).select_from(User)
    series_q = select(func.count()).select_from(Series)
    episodes_q = select(func.count()).select_from(Episode)
    pending_q = select(func.count()).select_from(Series).where(
        Series.status == "pending"
    )
    coins_q = select(func.coalesce(func.sum(CoinTransaction.amount), 0)).select_from(
        CoinTransaction
    )
    users = int((await session.execute(users_q)).scalar_one())
    series = int((await session.execute(series_q)).scalar_one())
    episodes = int((await session.execute(episodes_q)).scalar_one())
    pending = int((await session.execute(pending_q)).scalar_one())
    coins = int((await session.execute(coins_q)).scalar_one())
    return AdminMetrics(
        total_users=users,
        total_series=series,
        total_episodes=episodes,
        pending_series=pending,
        total_coins_in_circulation=coins,
    )


@router.get("/content/pending", response_model=list[AdminContentItem])
async def admin_content_pending(user_id: CurrentUserDep, session: SessionDep, limit: int = 50):
    await _require_admin(user_id, session)
    stmt = (
        select(Series)
        .where(Series.status == "pending")
        .options(selectinload(Series.episodes))
        .order_by(Series.created_at.desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [
        AdminContentItem(
            id=str(s.id),
            title=s.title,
            creator_id=str(s.creator_id),
            status=s.status,
            episode_count=len(s.episodes),
        )
        for s in rows
    ]


@router.post("/content/{series_id}/approve", response_model=SeriesPublic)
async def admin_content_approve(
    series_id: str, user_id: CurrentUserDep, session: SessionDep
):
    await _require_admin(user_id, session)
    series = (await session.execute(
        select(Series).where(Series.id == UUID(series_id)).options(selectinload(Series.episodes))
    )).scalar_one_or_none()
    if not series:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
    series.status = "published"
    for ep in series.episodes:
        if ep.status == "pending":
            ep.status = "published"
    await session.commit()
    return series


@router.post("/users/{target_user_id}/adjust-coins", response_model=dict)
async def admin_adjust_coins(
    target_user_id: str,
    payload: CoinAdjustRequest,
    user_id: CurrentUserDep,
    session: SessionDep,
):
    await _require_admin(user_id, session)
    target = await session.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    svc = CoinService(session)
    source = CoinSource.ADMIN_ADJUST
    try:
        if payload.amount >= 0:
            await svc.credit(target.id, payload.amount, source)
        else:
            await svc.debit(target.id, -payload.amount, source)
    except CoinLedgerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    await session.commit()
    return {"balance": await svc.balance(target.id), "adjusted": payload.amount}


@router.post("/episodes/import", response_model=EpisodePublic)
async def admin_import_episode(
    payload: EpisodeImportRequest,
    user_id: CurrentUserDep,
    session: SessionDep,
):
    """Import a third-party (external) episode into a series.

    Unlike creator uploads (Cloudflare Stream), external episodes store a
    public HLS/MP4 URL and are served as-is on playback. Admin-gated.
    """
    await _require_admin(user_id, session)
    series = await session.get(Series, payload.series_id)
    if not series:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

    episode = Episode(
        series_id=series.id,
        episode_number=payload.episode_number,
        title=payload.title,
        hls_url=payload.hls_url,
        thumbnail_url=payload.thumbnail_url,
        duration_seconds=payload.duration_seconds,
        is_premium=payload.is_premium,
        coin_cost=payload.coin_cost,
        source=EpisodeSource.EXTERNAL,
        status=payload.status.value,
    )
    session.add(episode)
    await session.commit()
    await session.refresh(episode)
    return episode

