import secrets
import string
from datetime import UTC, datetime

import stripe
from paystackapi.paystack import Paystack
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import PaymentProvider, PayoutStatus
from app.db.models import Payout, User
from app.repositories.base import BaseRepository
from app.security import verify_pin

settings = get_settings()


def _payout_reference() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "vida_pay_" + "".join(secrets.choice(alphabet) for _ in range(12))


class PayoutRepository(BaseRepository[Payout]):
    def __init__(self, session: AsyncSession):
        super().__init__(Payout, session)


class PayoutService:
    """Orchestrates creator payouts via Paystack / Stripe."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()
        self.repo = PayoutRepository(session)
        if settings.paystack_secret_key:
            self.paystack = Paystack(secret_key=settings.paystack_secret_key)
        else:
            self.paystack = None
        if settings.stripe_secret_key:
            stripe.api_key = settings.stripe_secret_key
        else:
            stripe.api_key = None

    async def request_payout(
        self, user_id, provider: PaymentProvider, amount: float, pin: str, pin_hash: str, payout_details: dict | None = None
    ) -> Payout:
        if not verify_pin(pin, pin_hash or ""):
            raise ValueError("Invalid PIN")
        if amount < self.settings.payout_minimum_usd:
            raise ValueError(f"Minimum payout is ${self.settings.payout_minimum_usd:.2f}")

        user = await self.session.get(User, user_id)
        if not user:
            raise ValueError("User not found")

        ref = _payout_reference()
        payout = Payout(
            user_id=user_id,
            provider=provider.value,
            amount=amount,
            currency="USD",
            status=PayoutStatus.PENDING.value,
            provider_ref=ref,
        )
        self.session.add(payout)
        await self.session.flush()

        try:
            if provider == PaymentProvider.PAYSTACK and self.paystack:
                response = self.paystack.transfer.create(
                    source="balance",
                    amount=int(amount * 100),
                    transfer_code=ref,
                    reason="Vida creator payout",
                    recipient=payout_details or {},
                )
                payout.provider_ref = response.get("data", {}).get("transfer_code", ref)
                payout.status = PayoutStatus.PROCESSING.value
            elif provider == PaymentProvider.STRIPE and stripe.api_key:
                stripe.Transfer.create(
                    amount=int(amount * 100),
                    currency="usd",
                    destination=payout_details.get("stripe_account_id") if payout_details else None,
                    transfer_group=ref,
                )
                payout.provider_ref = ref
                payout.status = PayoutStatus.PROCESSING.value
            else:
                payout.status = PayoutStatus.FAILED.value
                payout.failure_reason = f"{provider.value} not configured"
        except Exception as e:
            payout.status = PayoutStatus.FAILED.value
            payout.failure_reason = str(e)[:500]

        payout.processed_at = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(payout)
        return payout

    async def get_user_payouts(self, user_id, limit: int = 50, offset: int = 0):
        stmt = (
            select(Payout)
            .where(Payout.user_id == user_id)
            .order_by(Payout.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
