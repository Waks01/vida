from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.enums import CoinSource, PaymentProvider, PaymentStatus
from app.db.models import Episode, Series, User
from app.repositories.user_repository import UserRepository
from app.security import create_access_token, hash_pin
from app.services.coin_service import CoinLedgerError, CoinService
from app.services.payment_service import PaymentService


async def _auth_client(app, user_id: str) -> AsyncClient:
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    client.headers["Authorization"] = f"Bearer {create_access_token(user_id)}"
    return client


async def test_wallet_balance_zero_for_new_user(app, session):
    repo = UserRepository(session)
    user = await repo.create(email="wallet@example.com", password_hash="x")
    await session.commit()
    client = await _auth_client(app, str(user.id))
    resp = await client.get("/api/v1/wallet/balance")
    assert resp.status_code == 200
    assert resp.json()["balance"] == 0


async def test_coin_ledger_credit_and_debit_atomic(session):
    repo = UserRepository(session)
    user = await repo.create(email="ledger@example.com", password_hash="x")
    await session.commit()
    svc = CoinService(session)
    await svc.credit(user.id, 100, CoinSource.COIN_PURCHASE)
    await svc.debit(user.id, 30, CoinSource.EPISODE_UNLOCK, reference_id="11111111-1111-1111-1111-111111111111")
    await session.commit()
    assert await svc.balance(user.id) == 70


async def test_coin_ledger_rejects_negative_balance(session):
    repo = UserRepository(session)
    user = await repo.create(email="broke@example.com", password_hash="x")
    await session.commit()
    svc = CoinService(session)
    with pytest.raises(CoinLedgerError):
        await svc.debit(user.id, 10, CoinSource.EPISODE_UNLOCK)
    await session.commit()


async def test_episode_unlock_debits_coins(app, session):
    repo = UserRepository(session)
    user = await repo.create(email="unlock@example.com", password_hash="x")
    await session.commit()
    svc = CoinService(session)
    await svc.credit(user.id, 100, CoinSource.COIN_PURCHASE)
    await session.commit()

    series = Series(title="S", creator_id=user.id, status="published", total_views=0)
    session.add(series)
    await session.flush()
    ep = Episode(
        series_id=series.id,
        episode_number=1,
        title="E1",
        is_premium=True,
        coin_cost=30,
        status="published",
    )
    session.add(ep)
    await session.commit()

    client = await _auth_client(app, str(user.id))
    resp = await client.post(
        f"/api/v1/content/episodes/{ep.id}/unlock", json={"method": "coins"}
    )
    assert resp.status_code == 200
    assert resp.json()["unlocked"] is True
    bal = await client.get("/api/v1/wallet/balance")
    assert bal.json()["balance"] == 70


async def test_payments_initialize_requires_pin(app, session):
    repo = UserRepository(session)
    user = await repo.create(email="pay@example.com", password_hash="x")
    await session.commit()
    client = await _auth_client(app, str(user.id))
    resp = await client.post(
        "/api/v1/payments/initialize",
        json={"provider": "paystack", "product_id": "pack_100", "amount": 0.99, "pin": "1234"},
    )
    assert resp.status_code == 401


async def test_ad_complete_requires_valid_callback_token(app, session):
    repo = UserRepository(session)
    user = await repo.create(email="aduser@example.com", password_hash="x")
    await session.commit()
    client = await _auth_client(app, str(user.id))

    # Missing token → 422 (Pydantic validation).
    bad = await client.post("/api/v1/wallet/ads/complete", json={"ad_unit_id": "u", "device_id": "d"})
    assert bad.status_code == 422

    # Malformed token → 401 (verify_ad_callback rejects it).
    bad2 = await client.post("/api/v1/wallet/ads/complete", json={"ad_unit_id": "u", "device_id": "d", "callback_token": "!!!"})
    assert bad2.status_code == 401

    # Valid token → 200 + coins credited
    good = await client.post("/api/v1/wallet/ads/complete", json={"ad_unit_id": "u", "device_id": "d", "callback_token": "tok-ok-1"})
    assert good.status_code == 200, good.text
    body = good.json()
    assert body["awarded"] == 20
    assert body["balance"] == 20
    assert body["daily_remaining"] == 19

    # Replay same token → cooldown blocks it (unique constraint also enforced at DB layer).
    replay = await client.post("/api/v1/wallet/ads/complete", json={"ad_unit_id": "u", "device_id": "d", "callback_token": "tok-ok-1"})
    assert replay.status_code == 429


async def test_payment_initialize_success_with_valid_pin(app, session):
    user = User(email="payok@example.com", password_hash="x", pin_hash=hash_pin("1234"))
    session.add(user)
    await session.commit()
    client = await _auth_client(app, str(user.id))

    fake_token = {"reference": "ref-ok-1", "client_token": "https://paystack.com/pay/ok", "provider": "paystack"}
    with patch.object(PaymentService, "_get_client_token", return_value=fake_token):
        resp = await client.post(
            "/api/v1/payments/initialize",
            json={"provider": "paystack", "product_id": "coin_pack", "amount": 4.99, "pin": "1234"},
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["provider"] == "paystack"
    assert body["reference"] == "ref-ok-1"
    assert body["client_token"] == "https://paystack.com/pay/ok"


async def test_payment_webhook_fulfills_coin_pack(app, session):
    user = User(email="coinwebhook@example.com", password_hash="x", pin_hash=hash_pin("1234"))
    session.add(user)
    await session.commit()
    client = await _auth_client(app, str(user.id))

    fake_token = {"reference": "ref-coin-1", "client_token": "tok", "provider": "paystack"}
    with patch.object(PaymentService, "_get_client_token", return_value=fake_token):
        init = await client.post(
            "/api/v1/payments/initialize",
            json={"provider": "paystack", "product_id": "coin_pack", "amount": 100, "pin": "1234"},
        )
    assert init.status_code == 200
    ref = init.json()["reference"]

    async def _fake_confirm(self, reference: str, provider: PaymentProvider):
        payment = await self.repo.get_by_provider_ref(reference)
        assert payment is not None
        payment.status = "success"
        return payment

    async def _fake_handle_webhook(self, provider: PaymentProvider, payload: dict, signature: str):
        ref = payload.get("data", {}).get("reference")
        if not ref:
            return None
        payment = await _fake_confirm(self, ref, provider)
        if payment and payment.status == PaymentStatus.SUCCESS.value:
            await self._fulfill(payment)
        return payment

    with patch.object(PaymentService, "confirm", _fake_confirm), \
         patch.object(PaymentService, "handle_webhook", _fake_handle_webhook):
        wh = await client.post(
            "/api/v1/payments/webhook",
            headers={"x-provider": "paystack"},
            json={"data": {"reference": ref}},
        )
    assert wh.status_code == 200, wh.text

    bal = await client.get("/api/v1/wallet/balance")
    assert bal.json()["balance"] == 1000


async def test_payment_webhook_fulfills_subscription_and_vip(app, session):
    user = User(email="vipwebhook@example.com", password_hash="x", pin_hash=hash_pin("1234"))
    session.add(user)
    await session.commit()
    client = await _auth_client(app, str(user.id))

    fake_token = {"reference": "ref-vip-1", "client_token": "tok", "provider": "paystack"}
    with patch.object(PaymentService, "_get_client_token", return_value=fake_token):
        init = await client.post(
            "/api/v1/payments/initialize",
            json={"provider": "paystack", "product_id": "subscription", "amount": 4.99, "pin": "1234"},
        )
    assert init.status_code == 200
    ref = init.json()["reference"]

    async def _fake_confirm(self, reference: str, provider: PaymentProvider):
        payment = await self.repo.get_by_provider_ref(reference)
        assert payment is not None
        payment.status = "success"
        return payment

    async def _fake_handle_webhook(self, provider: PaymentProvider, payload: dict, signature: str):
        ref = payload.get("data", {}).get("reference")
        if not ref:
            return None
        payment = await _fake_confirm(self, ref, provider)
        if payment and payment.status == PaymentStatus.SUCCESS.value:
            await self._fulfill(payment)
        return payment

    with patch.object(PaymentService, "confirm", _fake_confirm), \
         patch.object(PaymentService, "handle_webhook", _fake_handle_webhook):
        wh = await client.post(
            "/api/v1/payments/webhook",
            headers={"x-provider": "paystack"},
            json={"data": {"reference": ref}},
        )
    assert wh.status_code == 200, wh.text

    sub_resp = await client.get("/api/v1/creators/subscription/status")
    assert sub_resp.status_code == 200
    sub_body = sub_resp.json()
    assert sub_body["is_vip"] is True
    assert sub_body["status"] == "active"
    assert sub_body["vip_until"] is not None


async def test_subscription_status_for_non_vip_user(app, session):
    repo = UserRepository(session)
    user = await repo.create(email="novip@example.com", password_hash="x")
    await session.commit()
    client = await _auth_client(app, str(user.id))

    resp = await client.get("/api/v1/creators/subscription/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_vip"] is False
    assert body["status"] is None
    assert body["vip_until"] is None


async def test_creator_series_list_requires_creator(app, session):
    user = User(email="listuser@example.com", password_hash="x", pin_hash=hash_pin("1234"))
    session.add(user)
    await session.commit()
    client = await _auth_client(app, str(user.id))

    resp = await client.get("/api/v1/creators/series")
    assert resp.status_code == 403


async def test_creator_series_list_returns_own_series(app, session):
    creator = User(email="ownseries@example.com", password_hash="x", pin_hash=hash_pin("1234"), is_creator=True)
    session.add(creator)
    await session.commit()
    from app.db.models import Creator
    session.add(Creator(user_id=creator.id, status="approved"))
    await session.commit()

    series = Series(title="My Series", creator_id=creator.id, status="published", total_views=10)
    session.add(series)
    await session.commit()

    client = await _auth_client(app, str(creator.id))
    resp = await client.get("/api/v1/creators/series")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["title"] == "My Series"


async def test_payout_request_requires_minimum(app, session):
    creator = User(email="payoutmin@example.com", password_hash="x", pin_hash=hash_pin("1234"), is_creator=True)
    session.add(creator)
    await session.commit()
    from app.db.models import Creator
    session.add(Creator(user_id=creator.id, status="approved", payout_method="paystack", payout_details={"account": "123"}))
    await session.commit()

    client = await _auth_client(app, str(creator.id))
    resp = await client.post("/api/v1/creators/payout/request", json={"pin": "1234"})
    assert resp.status_code == 400
    assert "Minimum payout" in resp.json()["detail"]


async def test_admin_pending_queue(app, session):
    admin = User(email="pendadmin@example.com", password_hash="x", is_admin=True)
    creator = User(email="pendcreator@example.com", password_hash="x", pin_hash=hash_pin("1234"), is_creator=True)
    session.add_all([admin, creator])
    await session.commit()
    from app.db.models import Creator
    session.add(Creator(user_id=creator.id, status="approved"))
    series = Series(title="Pending Series", creator_id=creator.id, status="pending", total_views=0)
    session.add(series)
    await session.commit()

    admin_client = await _auth_client(app, str(admin.id))
    resp = await admin_client.get("/api/v1/admin/content/pending")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["title"] == "Pending Series"
