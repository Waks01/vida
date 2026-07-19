import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_signup_returns_otp(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": "dev@example.com", "password": "supersecret"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "dev_otp" in body
    assert len(body["dev_otp"]) == 6


async def test_signup_then_verify_otp_flow(client: AsyncClient):
    email = "flow@example.com"
    r1 = await client.post(
        "/api/v1/auth/signup", json={"email": email, "password": "supersecret"}
    )
    otp = r1.json()["dev_otp"]
    r2 = await client.post(
        "/api/v1/auth/verify-otp", json={"email": email, "code": otp}
    )
    assert r2.status_code == 200
    tokens = r2.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]


async def test_verify_otp_wrong_code_fails(client: AsyncClient):
    email = "wrong@example.com"
    await client.post(
        "/api/v1/auth/signup", json={"email": email, "password": "supersecret"}
    )
    r = await client.post(
        "/api/v1/auth/verify-otp", json={"email": email, "code": "000000"}
    )
    assert r.status_code == 401
