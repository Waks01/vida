from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import get_settings
from app.core.enums import EpisodeSource, PaymentProvider, PaymentStatus, PayoutStatus, SeriesStatus
from app.db.models import Creator, Episode, Payment, Series, Subscription, User
from app.schemas import (
    CreatorApplyRequest,
    CreatorEarnings,
    CreatorUploadUrlRequest,
    EpisodeUploadUrlResponse,
    PayoutPublic,
    PayoutRequest,
    SeriesCreateRequest,
    SeriesPublic,
    SubscriptionCancelRequest,
    SubscriptionCancelResponse,
    SubscriptionStatusResponse,
)
from app.security import verify_pin
from app.services.cloudflare_stream import CloudflareStreamError, CloudflareStreamService
from app.services.payout_service import PayoutService

router = APIRouter(prefix="/creators", tags=["creators"])


async def _get_creator(session: SessionDep, user_id: UUID) -> Creator | None:
    result = await session.execute(select(Creator).where(Creator.user_id == user_id))
    return result.scalar_one_or_none()


@router.get("/series", response_model=list[SeriesPublic])
async def creators_series_list(user_id: CurrentUserDep, session: SessionDep):
    creator = await _get_creator(session, user_id)
    if not creator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Creator privileges required")
    stmt = (
        select(Series)
        .where(Series.creator_id == user_id)
        .options(selectinload(Series.episodes))
        .order_by(Series.created_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    return rows


@router.post("/series", response_model=SeriesPublic)
async def creators_create_series(
    payload: SeriesCreateRequest, user_id: CurrentUserDep, session: SessionDep
):
    """Create a new series (creator only). Starts in `pending` until admin approves."""
    creator = await _get_creator(session, user_id)
    if not creator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Creator privileges required")
    series = Series(
        creator_id=user_id,
        title=payload.title,
        description=payload.description,
        genre_id=payload.genre_id,
        thumbnail_url=payload.thumbnail_url,
        status=SeriesStatus.PENDING.value,
        total_views=0,
    )
    session.add(series)
    await session.commit()
    await session.refresh(series)
    result = await session.execute(
        select(Series).where(Series.id == series.id).options(selectinload(Series.episodes))
    )
    return result.scalar_one()


@router.post("/episodes/upload-url", response_model=EpisodeUploadUrlResponse)
async def creators_episode_upload_url(
    series_id: str,
    payload: CreatorUploadUrlRequest,
    user_id: CurrentUserDep,
    session: SessionDep,
):
    """Create a pending episode under a series and return a Cloudflare Stream
    direct-upload ticket. The creator PUTs the raw video straight to Stream
    (no R2/worker); Stream transcodes + stores HLS. Episode stays `pending`
    until the uploaded video is ready and the series is admin-approved."""
    creator = await _get_creator(session, user_id)
    if not creator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Creator privileges required")
    series = await session.get(Series, UUID(series_id))
    if not series or str(series.creator_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found or not owned")

    settings = get_settings()
    episode = Episode(
        series_id=series.id,
        episode_number=payload.episode_number,
        title=payload.episode_title,
        is_premium=True,
        coin_cost=payload.coin_cost or settings.episode_coin_cost,
        source=EpisodeSource.STREAM,
        status="pending",
    )
    session.add(episode)
    await session.commit()
    await session.refresh(episode)

    service = CloudflareStreamService()
    try:
        ticket = service.create_direct_upload_url(
            expiry_seconds=3600, uid=str(episode.id)
        )
    except CloudflareStreamError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        ) from e

    # Persist the Stream uid we handed to Stream so the webhook can match it.
    episode.stream_uid = ticket["uid"]
    await session.commit()

    return EpisodeUploadUrlResponse(
        series_id=series.id,
        episode_id=episode.id,
        stream_uid=ticket["uid"],
        upload_url=ticket["upload_url"],
        expires_in=ticket["expires_in"],
    )


@router.post("/apply", response_model=CreatorEarnings)
async def creators_apply(
    payload: CreatorApplyRequest, user_id: CurrentUserDep, session: SessionDep
):
    existing = await _get_creator(session, user_id)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a creator")
    payout_details_value = payload.payout_details if isinstance(payload.payout_details, dict) else {"value": payload.payout_details}
    creator = Creator(
        user_id=user_id,
        payout_method=payload.payout_method,
        payout_details=payout_details_value,
        status="pending",
    )
    session.add(creator)
    await session.commit()
    return CreatorEarnings(total_earnings=0.0, pending_payout=0.0, series_count=0)


@router.get("/earnings", response_model=CreatorEarnings)
async def creators_earnings(user_id: CurrentUserDep, session: SessionDep):
    creator = await _get_creator(session, user_id)
    if not creator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a creator")
    series_q = select(func.count()).select_from(Series).where(Series.creator_id == user_id)
    paid_q = (
        select(func.coalesce(func.sum(Payment.amount), 0.0))
        .where(Payment.user_id == user_id)
        .where(Payment.status == PaymentStatus.SUCCESS.value)
    )
    series_count = int((await session.execute(series_q)).scalar_one())
    paid = float((await session.execute(paid_q)).scalar_one())
    settings = get_settings()
    share = paid * settings.creator_revenue_share
    return CreatorEarnings(
        total_earnings=share,
        pending_payout=share,
        series_count=series_count,
    )


@router.post("/payout/request", response_model=CreatorEarnings)
async def creators_payout(
    payload: PayoutRequest, user_id: CurrentUserDep, session: SessionDep
):
    creator = await _get_creator(session, user_id)
    if not creator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a creator")
    user = await session.get(User, user_id)
    if not user or not verify_pin(payload.pin, user.pin_hash or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid PIN")

    series_q = select(func.count()).select_from(Series).where(Series.creator_id == user_id)
    paid_q = (
        select(func.coalesce(func.sum(Payment.amount), 0.0))
        .where(Payment.user_id == user_id)
        .where(Payment.status == PaymentStatus.SUCCESS.value)
    )
    series_count = int((await session.execute(series_q)).scalar_one())
    paid = float((await session.execute(paid_q)).scalar_one())
    settings = get_settings()
    share = paid * settings.creator_revenue_share

    if share < settings.payout_minimum_usd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum payout is ${settings.payout_minimum_usd:.2f}. Current earnings: ${share:.2f}",
        )

    svc = PayoutService(session)
    try:
        payout = await svc.request_payout(
            user_id=user_id,
            provider=PaymentProvider.PAYSTACK,
            amount=share,
            pin=payload.pin,
            pin_hash=user.pin_hash or "",
            payout_details=creator.payout_details,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None

    return CreatorEarnings(
        total_earnings=share,
        pending_payout=share if payout.status == PayoutStatus.PROCESSING.value else 0.0,
        series_count=series_count,
    )


@router.get("/payouts", response_model=list[PayoutPublic])
async def creators_payouts_list(
    user_id: CurrentUserDep, session: SessionDep, limit: int = 50, offset: int = 0
):
    creator = await _get_creator(session, user_id)
    if not creator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a creator")
    svc = PayoutService(session)
    payouts = await svc.get_user_payouts(user_id, limit=limit, offset=offset)
    return [
        PayoutPublic(
            id=p.id,
            provider=p.provider,
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            provider_ref=p.provider_ref,
            failure_reason=p.failure_reason,
            created_at=p.created_at,
            processed_at=p.processed_at,
        )
        for p in payouts
    ]


@router.post("/subscription/cancel", response_model=SubscriptionCancelResponse)
async def subscription_cancel(
    payload: SubscriptionCancelRequest,
    user_id: CurrentUserDep,
    session: SessionDep,
):
    user = await session.get(User, user_id)
    if not user or not verify_pin(payload.pin, user.pin_hash or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid PIN")
    stmt = select(Subscription).where(Subscription.user_id == user_id)
    result = await session.execute(stmt)
    sub = result.scalar_one_or_none()
    if sub:
        await session.delete(sub)
        await session.commit()
    return SubscriptionCancelResponse(cancelled=True)


@router.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def subscription_status(user_id: CurrentUserDep, session: SessionDep):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    is_vip = bool(user.vip_until and user.vip_until > datetime.now(UTC))
    stmt = select(Subscription).where(Subscription.user_id == user_id)
    result = await session.execute(stmt)
    sub = result.scalar_one_or_none()
    return SubscriptionStatusResponse(
        is_vip=is_vip,
        vip_until=user.vip_until,
        status=sub.status if sub else None,
    )
