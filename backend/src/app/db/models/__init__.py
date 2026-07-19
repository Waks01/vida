from typing import Optional
from uuid import UUID as PythonUUID
from uuid import uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import UUID as SAUUID
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import (
    CoinSource,
    EpisodeSource,
    EpisodeStatus,
    PaymentProvider,
    PaymentStatus,
    PayoutStatus,
    SeriesStatus,
    SubscriptionStatus,
    ThemePreference,
)
from app.db.session import Base


def _uuid() -> PythonUUID:
    return uuid4()


class User(Base):
    __tablename__ = "users"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    coin_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vip_until: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    theme_preference: Mapped[str] = mapped_column(
        SQLEnum(ThemePreference, name="theme_preference"),
        nullable=False,
        default=ThemePreference.DARK.value,
    )
    is_creator: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    series: Mapped[list["Series"]] = relationship(back_populates="creator")
    creator_profile: Mapped[Optional["Creator"]] = relationship(
        back_populates="user", uselist=False
    )


class Series(Base):
    __tablename__ = "series"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    creator_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    genre_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        SQLEnum(SeriesStatus, name="series_status"),
        nullable=False,
        default=SeriesStatus.PENDING.value,
    )
    total_views: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator: Mapped[User] = relationship(back_populates="series")
    episodes: Mapped[list["Episode"]] = relationship(
        back_populates="series", cascade="all, delete-orphan"
    )


class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    series_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("series.id"), nullable=False, index=True
    )
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    hls_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    stream_uid: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    source: Mapped[str] = mapped_column(
        SQLEnum(EpisodeSource, name="episode_source"),
        nullable=False,
        default=EpisodeSource.STREAM,
    )
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    coin_cost: Mapped[int] = mapped_column(Integer, nullable=False, default=25)
    views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(
        SQLEnum(EpisodeStatus, name="episode_status"),
        nullable=False,
        default=EpisodeStatus.PENDING.value,
    )

    series: Mapped[Series] = relationship(back_populates="episodes")
    __table_args__ = (
        UniqueConstraint("series_id", "episode_number", name="uq_series_episode"),
    )


class CoinTransaction(Base):
    __tablename__ = "coin_transactions"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # +credit / -debit
    source: Mapped[str] = mapped_column(
        SQLEnum(CoinSource, name="coin_source"), nullable=False
    )
    reference_id: Mapped[PythonUUID | None] = mapped_column(SAUUID(as_uuid=True), nullable=True)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(
        SQLEnum(PaymentProvider, name="payment_provider"), nullable=False
    )
    provider_ref: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    product_type: Mapped[str] = mapped_column(String(20), nullable=False)  # coin_pack | subscription
    amount: Mapped[float] = mapped_column(nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    status: Mapped[str] = mapped_column(
        SQLEnum(PaymentStatus, name="payment_status"),
        nullable=False,
        default=PaymentStatus.PENDING.value,
    )
    pin_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AdView(Base):
    __tablename__ = "ad_views"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    ad_unit_id: Mapped[str] = mapped_column(String(255), nullable=False)
    device_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    coins_awarded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    callback_token: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    completed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Creator(Base):
    __tablename__ = "creators"
    __table_args__ = (UniqueConstraint("user_id", name="uq_creator_user"),)

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    payout_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payout_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # JSONB in postgres
    total_earnings: Mapped[float] = mapped_column(nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    user: Mapped[User] = relationship(back_populates="creator_profile")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        SQLEnum(SubscriptionStatus, name="subscription_status"),
        nullable=False,
        default=SubscriptionStatus.EXPIRED.value,
    )
    provider: Mapped[str] = mapped_column(
        SQLEnum(PaymentProvider, name="subscription_provider"), nullable=False
    )
    product_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    starts_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Payout(Base):
    __tablename__ = "payouts"

    id: Mapped[PythonUUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[PythonUUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(
        SQLEnum(PaymentProvider, name="payout_provider"), nullable=False
    )
    amount: Mapped[float] = mapped_column(nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    status: Mapped[str] = mapped_column(
        SQLEnum(PayoutStatus, name="payout_status"),
        nullable=False,
        default=PayoutStatus.PENDING.value,
    )
    provider_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
