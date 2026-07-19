from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.enums import PaymentProvider
from app.db.models import Payment, User
from app.schemas import (
    PaymentConfirmRequest,
    PaymentInitializeRequest,
    PaymentInitializeResponse,
    PaymentMethodPublic,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


async def _get_user(session, user_id) -> User:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/initialize", response_model=PaymentInitializeResponse)
async def payments_initialize(
    payload: PaymentInitializeRequest, user_id: CurrentUserDep, session: SessionDep
):
    user = await _get_user(session, user_id)
    svc = PaymentService(session)
    try:
        payment = await svc.initialize(
            user_id,
            payload.provider,
            payload.product_id,
            payload.amount,
            payload.pin,
            user.pin_hash or "",
            user.email,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from None
    await session.commit()
    token = await svc._get_client_token(payload.provider, payload.product_id, payload.amount, payment.provider_ref, user.email)
    return PaymentInitializeResponse(
        provider=payload.provider,
        client_token=token.get("client_token", ""),
        reference=token.get("reference", payment.provider_ref or ""),
    )


@router.post("/confirm", response_model=PaymentInitializeResponse)
async def payments_confirm(
    payload: PaymentConfirmRequest, user_id: CurrentUserDep, session: SessionDep
):
    svc = PaymentService(session)
    try:
        payment = await svc.confirm(payload.reference)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    await session.commit()
    return PaymentInitializeResponse(
        provider=PaymentProvider(payment.provider),
        client_token=PaymentService.client_token(payment),
        reference=payment.provider_ref or "",
    )


@router.post("/webhook")
async def payments_webhook(request: Request, session: SessionDep):
    body = await request.body()
    payload = {}
    try:
        payload = await request.json()
    except Exception:
        pass
    provider_header = request.headers.get("x-provider", "paystack")
    try:
        provider = PaymentProvider(provider_header.lower())
    except ValueError:
        provider = PaymentProvider.PAYSTACK
    svc = PaymentService(session)
    try:
        payment = await svc.handle_webhook(provider, payload, body.decode() if body else "")
        if payment:
            await session.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    return {"received": True}


@router.get("/methods", response_model=list[PaymentMethodPublic])
async def payments_methods(user_id: CurrentUserDep, session: SessionDep):
    stmt = select(Payment).where(Payment.user_id == user_id)
    result = await session.execute(stmt)
    return [PaymentMethodPublic.model_validate(p) for p in result.scalars().all()]
