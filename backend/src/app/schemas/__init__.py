from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.enums import (
    CoinSource,
    EpisodeSource,
    EpisodeStatus,
    PaymentProvider,
    PaymentStatus,
    SeriesCategory,
    SeriesStatus,
    ThemePreference,
)

DEFAULT_THUMBNAIL = "https://peach.blender.org/wp-content/uploads/poster_bunny_big.jpg"


# ─── Auth: email + OTP + PIN ───
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PinSetRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class PinVerifyRequest(BaseModel):
    email: EmailStr
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── Users / profile ───
class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str | None = None
    coin_balance: int = 0
    vip_until: datetime | None = None
    theme_preference: ThemePreference = ThemePreference.DARK
    is_creator: bool = False


# ─── Content ───
class EpisodePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    episode_number: int
    title: str
    hls_url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int = 60
    is_premium: bool = True
    coin_cost: int = 25
    source: EpisodeSource = EpisodeSource.STREAM
    status: EpisodeStatus

    @field_validator("thumbnail_url", mode="before")
    @classmethod
    def _default_episode_thumbnail(cls, v: Any) -> str:
        return v or DEFAULT_THUMBNAIL


class EpisodeImportRequest(BaseModel):
    """Import a third-party (external) episode into a series.

    The video is hosted off-Cloudflare (external CDN / licensed content);
    we store its public HLS/MP4 URL and serve it as-is on playback.
    """

    series_id: UUID
    episode_number: int = 1
    title: str = Field(max_length=255)
    hls_url: str = Field(max_length=2000)
    thumbnail_url: str | None = Field(default=None, max_length=2000)
    duration_seconds: int = 0
    is_premium: bool = True
    coin_cost: int = 25
    status: EpisodeStatus = EpisodeStatus.PUBLISHED


class SeriesPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None = None
    genre_id: int | None = None
    thumbnail_url: str | None = None
    status: SeriesStatus
    category: SeriesCategory | None = None
    total_views: int = 0
    episodes: list[EpisodePublic] = []

    @field_validator("thumbnail_url", mode="before")
    @classmethod
    def _default_series_thumbnail(cls, v: Any) -> str:
        return v or DEFAULT_THUMBNAIL


# ─── Coins / wallet ───
class CoinTransactionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: int
    source: CoinSource
    balance_after: int
    created_at: datetime


class CoinBalanceResponse(BaseModel):
    balance: int


class CoinPack(BaseModel):
    id: str
    coins: int
    price_usd: float


class DailyCheckInResponse(BaseModel):
    awarded: int
    balance: int


# ─── Payments (Paystack / Stripe / Google Pay) ───
class PaymentInitializeRequest(BaseModel):
    provider: PaymentProvider
    product_id: str
    amount: float
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class PaymentInitializeResponse(BaseModel):
    provider: PaymentProvider
    client_token: str  # paystack auth_url / stripe client_secret / gp token
    reference: str


class PaymentConfirmRequest(BaseModel):
    provider: PaymentProvider
    reference: str
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class PaymentMethodPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider: PaymentProvider
    product_type: str
    amount: float
    currency: str
    status: PaymentStatus


# ─── Creators / payouts ───
class CreatorApplyRequest(BaseModel):
    display_name: str = Field(max_length=100)
    payout_method: str = "paystack"
    payout_details: str | dict = Field(default_factory=dict)


class CreatorUploadUrlRequest(BaseModel):
    # One-time Cloudflare Stream direct-upload ticket request.
    filename: str = Field(max_length=255)
    content_type: str = Field(max_length=128, default="video/mp4")
    episode_title: str = Field(max_length=255, default="Untitled Episode")
    episode_number: int = 1
    coin_cost: int = 25


class SeriesCreateRequest(BaseModel):
    title: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    genre_id: int | None = None
    thumbnail_url: str | None = None


class EpisodeUploadUrlResponse(BaseModel):
    series_id: UUID
    episode_id: UUID
    stream_uid: str | None = None
    upload_url: str
    expires_in: int
    method: str = "PUT"


class CreatorEarnings(BaseModel):
    total_earnings: float
    pending_payout: float
    series_count: int


class PayoutRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class PayoutPublic(BaseModel):
    id: UUID
    provider: str
    amount: float
    currency: str
    status: str
    provider_ref: str | None
    failure_reason: str | None
    created_at: datetime
    processed_at: datetime | None


# ─── Content: episodes ───
class EpisodeUnlockRequest(BaseModel):
    method: str = "coins"  # coins | subscription | ad


class AdUnlockEpisodeRequest(BaseModel):
    ad_unit_id: str = Field(max_length=255)
    device_id: str = Field(max_length=255)


class EpisodeStreamResponse(BaseModel):
    episode_id: str
    hls_url: str
    expires_in_seconds: int = 3600


class UnlockResponse(BaseModel):
    unlocked: bool
    balance: int


# ─── Ads ───
class AdCompleteRequest(BaseModel):
    ad_unit_id: str = Field(max_length=255)
    device_id: str = Field(max_length=255)
    callback_token: str = Field(max_length=255)


class AdCompleteResponse(BaseModel):
    awarded: int
    balance: int
    daily_remaining: int


class CheckInResponse(BaseModel):
    awarded: int
    balance: int


# ─── Subscription ───
class SubscriptionCancelRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")

class SubscriptionCancelResponse(BaseModel):
    cancelled: bool


class SubscriptionStatusResponse(BaseModel):
    is_vip: bool
    vip_until: datetime | None = None
    status: str | None = None


# ─── Admin ───
class AdminMetrics(BaseModel):
    total_users: int
    total_series: int
    total_episodes: int
    pending_series: int
    total_coins_in_circulation: int


class AdminContentItem(BaseModel):
    id: UUID
    title: str
    creator_id: UUID
    status: str
    episode_count: int = 0


class CoinAdjustRequest(BaseModel):
    amount: int = Field(description="Positive to credit, negative to debit")
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


# ─── Users ───
class UserMeResponse(UserPublic):
    pass


class CoinTransactionPage(BaseModel):
    items: list[CoinTransactionPublic]
    total: int
    limit: int
    offset: int


# ─── Watch history (Resume rail) ───
class WatchHistoryEntry(BaseModel):
    """One series the user has started. The Resume rail renders up to 4
    of these in last-watched order. `progress` is 0..1 within the
    current episode so the wide card can draw a real progress bar."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    series_id: UUID
    series_title: str
    series_thumbnail_url: str | None = None
    episode_id: UUID | None = None
    episode_number: int | None = None
    episode_duration_seconds: int | None = None
    progress: float = 0.0
    last_watched_at: datetime


class WatchHistoryResponse(BaseModel):
    items: list[WatchHistoryEntry]


# ─── Watchlist (Saved series) ───
class WatchlistAddRequest(BaseModel):
    """Add a series to the user's watchlist. Idempotent: re-adding
    returns the existing row with 201, not 409."""

    series_id: UUID


class WatchlistEntry(BaseModel):
    """One row from GET /users/me/watchlist. Joined to Series so the
    list screen can render title + thumbnail without a second query."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    series_id: UUID
    series_title: str
    series_thumbnail_url: str | None = None
    added_at: datetime


class WatchlistResponse(BaseModel):
    items: list[WatchlistEntry]

