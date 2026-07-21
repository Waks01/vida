import logging
import secrets
from datetime import UTC, datetime, timedelta

import redis
import resend
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.repositories.user_repository import UserRepository
from app.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_pin,
    verify_password,
    verify_pin,
)

settings = get_settings()
logger = logging.getLogger("vida.auth")

# Redis client for OTP store (production-safe, survives restarts, scales across workers).
_redis: redis.Redis | None = None


def _get_redis() -> redis.Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = redis.from_url(settings.redis_url, decode_responses=True)
            _redis.ping()
        except Exception:
            _redis = None
    return _redis


class AuthError(Exception):
    """Raised for invalid credentials / OTP / PIN."""


# Fallback in-memory OTP store with TTL (local dev only, when Redis is unavailable).
_otp_store: dict[str, tuple[str, datetime]] = {}


def _generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(settings.otp_length))


async def _send_otp_email(email: str, otp: str) -> None:
    """Send OTP via Resend. Raises in production if delivery fails."""
    if not settings.resend_api_key:
        raise AuthError("Email service not configured")
    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            from_=settings.resend_email_from,
            to=email,
            subject=f"Your Vida verification code: {otp}",
            html=f"<p>Your Vida verification code is <strong>{otp}</strong>.</p><p>Expires in {settings.otp_ttl_seconds // 60} minutes.</p>",
        )
    except Exception as e:
        raise AuthError("Failed to send verification email") from e


async def signup(session: AsyncSession, email: str, password: str) -> dict:
    """Create user (unverified), send OTP via email, return status."""
    repo = UserRepository(session)
    existing = await repo.get_by_email(email)
    if existing:
        raise AuthError("Email already registered")
    await repo.create(email=email, password_hash=hash_password(password))
    await session.commit()
    otp = _generate_otp()
    r = _get_redis()
    key = f"vida:otp:{email.lower()}"
    if r:
        r.setex(key, settings.otp_ttl_seconds, otp)
    else:
        # Fallback: in-memory with TTL (local dev only).
        _otp_store[email.lower()] = (otp, datetime.now(UTC))
    # Store OTP and send via email. Always attempt delivery when API key is present.
    otp = _generate_otp()
    r = _get_redis()
    key = f"vida:otp:{email.lower()}"
    if r:
        r.setex(key, settings.otp_ttl_seconds, otp)
    else:
        _otp_store[email.lower()] = (otp, datetime.now(UTC))

    if settings.resend_api_key:
        try:
            await _send_otp_email(email, otp)
        except Exception as e:
            logger.error("signup OTP email failed to %s: %s", email, e)
            raise AuthError("Failed to send verification email") from e

    return {"message": "OTP sent to email"}


async def verify_otp(session: AsyncSession, email: str, code: str) -> tuple[str, str]:
    """Verify OTP, mark verified, return (access, refresh) tokens."""
    key = f"vida:otp:{email.lower()}"
    r = _get_redis()
    if r:
        stored = r.get(key)
        if not stored:
            raise AuthError("No OTP requested for this email")
        if stored != code:
            raise AuthError("Invalid OTP")
        r.delete(key)
    else:
        stored = _otp_store.get(email.lower())
        if not stored:
            raise AuthError("No OTP requested for this email")
        otp, issued = stored
        if datetime.now(UTC) - issued > timedelta(seconds=settings.otp_ttl_seconds):
            _otp_store.pop(email.lower(), None)
            raise AuthError("OTP expired")
        if otp != code:
            raise AuthError("Invalid OTP")
        _otp_store.pop(email.lower(), None)

    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if not user:
        raise AuthError("User not found")
    return create_access_token(str(user.id)), create_refresh_token(str(user.id))


async def login(session: AsyncSession, email: str, password: str) -> tuple[str, str]:
    """Email + password fallback login → tokens."""
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if not user or not verify_password(password, user.password_hash):
        raise AuthError("Invalid email or password")
    return create_access_token(str(user.id)), create_refresh_token(str(user.id))


async def set_pin(session: AsyncSession, user_id: str, pin: str) -> None:
    repo = UserRepository(session)
    user = await repo.get(user_id)
    if not user:
        raise AuthError("User not found")
    user.pin_hash = hash_pin(pin)
    await session.commit()


async def verify_pin_login(session: AsyncSession, email: str, pin: str) -> tuple[str, str]:
    """PIN-based login (replaces password after setup)."""
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if not user or not verify_pin(pin, user.pin_hash or ""):
        raise AuthError("Invalid PIN")
    return create_access_token(str(user.id)), create_refresh_token(str(user.id))


def refresh_tokens(refresh_token: str) -> tuple[str, str]:
    """Rotate a valid refresh token into a fresh access + refresh pair."""
    from app.security import decode_token

    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise AuthError("Not a refresh token")
        subject = payload["sub"]
    except Exception:
        raise AuthError("Invalid or expired refresh token") from None
    return create_access_token(subject), create_refresh_token(subject)
