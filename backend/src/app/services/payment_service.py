import secrets
import string
from datetime import UTC, datetime, timedelta

import stripe
from paystackapi.paystack import Paystack
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import PaymentProvider, PaymentStatus, SubscriptionStatus
from app.db.models import Payment, Subscription, User
from app.repositories.base import BaseRepository
from app.security import verify_pin
from app.services.coin_service import CoinService, CoinSource

settings = get_settings()


def _reference() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "vida_" + "".join(secrets.choice(alphabet) for _ in range(16))


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, session: AsyncSession):
        super().__init__(Payment, session)

    async def get_by_provider_ref(self, ref: str) -> Payment | None:
        stmt = select(Payment).where(Payment.provider_ref == ref)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class PaymentService:
    """Orchestrates Paystack / Stripe / Google Pay behind one interface."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()
        self.repo = PaymentRepository(session)
        if settings.paystack_secret_key:
            self.paystack = Paystack(secret_key=settings.paystack_secret_key)
        else:
            self.paystack = None
        if settings.stripe_secret_key:
            stripe.api_key = settings.stripe_secret_key
        else:
            stripe.api_key = None

    async def initialize(
        self, user_id, provider: PaymentProvider, product_id: str, amount: float, pin: str,
        pin_hash: str, customer_email: str = ""
    ) -> Payment:
        if not verify_pin(pin, pin_hash or ""):
            raise ValueError("Invalid PIN")
        ref = _reference()
        payment = Payment(
            user_id=user_id,
            provider=provider.value,
            provider_ref=ref,
            product_type=product_id,
            amount=amount,
            currency="USD",
            status=PaymentStatus.PENDING.value,
            pin_verified=True,
        )
        self.session.add(payment)
        await self.session.flush()

        client_token = await self._get_client_token(provider, product_id, amount, ref, customer_email)
        payment.provider_ref = client_token.get("reference", ref)
        return payment

    async def _get_client_token(self, provider: PaymentProvider, product_id: str, amount: float, ref: str, customer_email: str = "") -> dict:
        if provider == PaymentProvider.PAYSTACK:
            if not self.paystack:
                raise ValueError("Paystack not configured")
            response = self.paystack.transaction.initialize(
                amount=int(amount * 100),
                currency="NGN",
                reference=ref,
                email=customer_email or settings.paystack_customer_email,
            )
            return {
                "reference": ref,
                "client_token": response["data"]["authorization_url"],
                "provider": "paystack",
            }
        if provider == PaymentProvider.STRIPE:
            if not stripe.api_key:
                raise ValueError("Stripe not configured")
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),
                currency="usd",
                metadata={"vida_ref": ref, "product_id": product_id},
            )
            return {
                "reference": ref,
                "client_token": intent.client_secret or "",
                "provider": "stripe",
            }
        if provider == PaymentProvider.GOOGLE_PAY:
            return {
                "reference": ref,
                "client_token": ref,
                "provider": "googlepay",
            }
        raise ValueError(f"Unsupported provider: {provider}")

    async def confirm(self, reference: str, provider: PaymentProvider) -> Payment:
        payment = await self.repo.get_by_provider_ref(reference)
        if not payment:
            raise ValueError("Unknown payment reference")
        if provider == PaymentProvider.PAYSTACK and self.paystack:
            response = self.paystack.transaction.verify(reference)
            if response["data"]["status"] == "success":
                payment.status = PaymentStatus.SUCCESS.value
            else:
                payment.status = PaymentStatus.FAILED.value
        elif provider == PaymentProvider.STRIPE and stripe.api_key:
            intent = stripe.PaymentIntent.retrieve(reference)
            if intent.status == "succeeded":
                payment.status = PaymentStatus.SUCCESS.value
            else:
                payment.status = PaymentStatus.FAILED.value
        else:
            payment.status = PaymentStatus.SUCCESS.value
        await self.session.flush()
        return payment

    async def handle_webhook(self, provider: PaymentProvider, payload: dict, signature: str) -> Payment | None:
        if provider == PaymentProvider.PAYSTACK and self.paystack:
            try:
                self.paystack.webhook.verify(payload, signature)
            except Exception as err:
                raise ValueError("Invalid Paystack webhook signature") from err
            ref = payload.get("data", {}).get("reference")
            if not ref:
                return None
            payment = await self.confirm(ref, provider)
        elif provider == PaymentProvider.STRIPE and stripe.api_key:
            try:
                stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret or "")
            except Exception as err:
                raise ValueError("Invalid Stripe webhook signature") from err
            ref = payload.get("data", {}).get("metadata", {}).get("vida_ref")
            if not ref:
                return None
            payment = await self.confirm(ref, provider)
        else:
            return None

        if payment and payment.status == PaymentStatus.SUCCESS.value:
            await self._fulfill(payment)

        return payment

    async def _fulfill(self, payment: Payment) -> None:
        """Credit coins or activate VIP after a successful payment."""
        product_type = (payment.product_type or "").lower()
        if product_type == "coin_pack":
            coins = self._coins_for_amount(payment.amount)
            if coins > 0:
                coin_svc = CoinService(self.session)
                await coin_svc.credit(payment.user_id, coins, CoinSource.COIN_PURCHASE, reference_id=payment.id)
        elif product_type == "subscription":
            now = datetime.now(UTC)
            vip_until = now + timedelta(days=7)
            stmt = select(Subscription).where(Subscription.user_id == payment.user_id)
            result = await self.session.execute(stmt)
            sub = result.scalar_one_or_none()
            if sub:
                sub.status = SubscriptionStatus.ACTIVE.value
                sub.provider = payment.provider
                sub.product_id = payment.product_type
                sub.starts_at = now
                sub.expires_at = vip_until
                sub.cancelled_at = None
            else:
                sub = Subscription(
                    user_id=payment.user_id,
                    status=SubscriptionStatus.ACTIVE.value,
                    provider=payment.provider,
                    product_id=payment.product_type,
                    starts_at=now,
                    expires_at=vip_until,
                )
                self.session.add(sub)
            user = await self.session.get(User, payment.user_id)
            if user is not None:
                user.vip_until = vip_until

    @staticmethod
    def _coins_for_amount(amount: float) -> int:
        rate = settings.coin_rate
        min_ngn = settings.coin_pack_min_ngn
        if rate <= 0 or min_ngn <= 0 or amount < min_ngn:
            return 0
        ngn = amount
        return int(ngn * rate)
