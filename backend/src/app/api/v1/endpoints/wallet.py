from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import get_settings
from app.core.enums import CoinSource
from app.db.models import AdView
from app.schemas import (
    AdCompleteRequest,
    AdCompleteResponse,
    CoinTransactionPublic,
)
from app.security.ad_callback import verify_ad_callback
from app.services.coin_service import CoinLedgerError, CoinService

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/balance", response_model=dict)
async def wallet_balance(user_id: CurrentUserDep, session: SessionDep):
    svc = CoinService(session)
    return {"balance": await svc.balance(user_id)}


@router.get("/packs", response_model=dict)
async def wallet_packs():
    settings = get_settings()
    return {
        "coin_rate": settings.coin_rate,
        "min_ngn": settings.coin_pack_min_ngn,
        "step_ngn": settings.coin_pack_step_ngn,
    }


@router.get("/transactions", response_model=list[CoinTransactionPublic])
async def wallet_transactions(user_id: CurrentUserDep, session: SessionDep, limit: int = 50, offset: int = 0):
    svc = CoinService(session)
    items, _ = await svc.history(user_id, limit=limit, offset=offset)
    return [
        CoinTransactionPublic(
            id=t.id,
            amount=t.amount,
            source=t.source,
            balance_after=t.balance_after,
            created_at=t.created_at,
        )
        for t in items
    ]


@router.post("/ads/complete", response_model=AdCompleteResponse)
async def ad_complete(
    payload: AdCompleteRequest, user_id: CurrentUserDep, session: SessionDep
):
    settings = get_settings()

    # Verify the callback_token (design FLOW 3: "verify signature").
    # Reject malformed/stale tokens; replay is prevented by the unique DB
    # constraint on `ad_views.callback_token`.
    if not verify_ad_callback(payload.callback_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired ad callback token",
        )

    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Count ads watched today (exclude this pending record).
    daily_stmt = select(func.count()).select_from(AdView).where(
        AdView.user_id == user_id,
        AdView.completed_at >= today_start,
    )
    daily_count = int((await session.execute(daily_stmt)).scalar_one())

    if daily_count >= settings.ad_daily_cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily ad cap reached ({settings.ad_daily_cap})",
        )

    # Cooldown check: must wait X seconds between ads
    last_ad_stmt = (
        select(AdView)
        .where(AdView.user_id == user_id)
        .order_by(AdView.completed_at.desc())
        .limit(1)
    )
    last_ad = (await session.execute(last_ad_stmt)).scalar_one_or_none()
    if last_ad and last_ad.completed_at:
        elapsed_stmt = select(func.extract("epoch", func.now() - AdView.completed_at)).where(
            AdView.id == last_ad.id
        )
        elapsed = float((await session.execute(elapsed_stmt)).scalar_one() or 0)
        if elapsed < settings.ad_cooldown_seconds:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Ad cooldown active ({int(settings.ad_cooldown_seconds - elapsed)}s remaining)",
            )

    # Record ad view with callback_token + coins awarded
    ad_view = AdView(
        id=uuid4(),
        user_id=user_id,
        ad_unit_id=payload.ad_unit_id,
        device_id=payload.device_id,
        coins_awarded=settings.ad_watch_coins,
        callback_token=payload.callback_token,
    )
    session.add(ad_view)

    # Credit coins
    svc = CoinService(session)
    try:
        await svc.credit(user_id, settings.ad_watch_coins, CoinSource.AD_WATCH)
    except CoinLedgerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None

    await session.commit()

    remaining = max(0, settings.ad_daily_cap - (daily_count + 1))
    return AdCompleteResponse(
        awarded=settings.ad_watch_coins,
        balance=await svc.balance(user_id),
        daily_remaining=remaining,
    )


@router.post("/checkin/daily", response_model=dict)
async def daily_checkin(user_id: CurrentUserDep, session: SessionDep):
    settings = get_settings()
    svc = CoinService(session)
    try:
        await svc.credit(user_id, settings.daily_checkin_coins, CoinSource.DAILY_CHECKIN)
    except CoinLedgerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    await session.commit()
    return {"awarded": settings.daily_checkin_coins, "balance": await svc.balance(user_id)}
