from enum import Enum


class ThemePreference(str, Enum):
    """Per-user theme; persisted as users.theme_preference."""

    DARK = "dark"
    LIGHT = "light"
    CUPCAKE = "cupcake"
    CYBERPUNK = "cyberpunk"
    SUNSET = "sunset"
    VALENTINE = "valentine"


class PaymentProvider(str, Enum):
    PAYSTACK = "paystack"
    STRIPE = "stripe"
    GOOGLE_PAY = "googlepay"


class CoinSource(str, Enum):
    AD_WATCH = "ad_watch"
    EPISODE_UNLOCK = "episode_unlock"
    DAILY_CHECKIN = "daily_checkin"
    COIN_PURCHASE = "coin_purchase"
    SUBSCRIPTION = "subscription"
    REFERRAL = "referral"
    ADMIN_ADJUST = "admin_adjust"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    GRACE_PERIOD = "grace_period"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class SeriesStatus(str, Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    REJECTED = "rejected"


class EpisodeStatus(str, Enum):
    READY = "ready"
    PUBLISHED = "published"
    PENDING = "pending"


class EpisodeSource(str, Enum):
    """Where an episode's video originates.

    - STREAM: uploaded by a creator via Cloudflare Stream (we hold the
      stream_uid and sign a short-lived HLS URL on playback).
    - EXTERNAL: sourced from a third party (licensed/aggregated content);
      the stored hls_url is a public/external CDN URL returned as-is.
    """

    STREAM = "stream"
    EXTERNAL = "external"


class PayoutStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"


class SeriesCategory(str, Enum):
    """Browser-facing category a series can be filed under.

    Single-value (not multi-tag) by design: each series lives in exactly one
    chip row on the home, matching ReelShort/HiDrama where a show has a
    primary classification. Editorial (hot/new/trending/ranking/recommended/
    coming_soon) and format/origin (movies/tv_series/novel/originals/anime/
    asian/nigerian/latino) describe the show's surface; trope values describe
    its plot territory.

    The full set is exposed to the mobile client as a static list; the home
    filters with `?category=*` against this enum.
    """

    # Editorial
    HOT = "hot"
    NEW = "new"
    TRENDING = "trending"
    RANKING = "ranking"
    RECOMMENDED = "recommended"
    COMING_SOON = "coming_soon"
    # Format / origin
    MOVIES = "movies"
    TV_SERIES = "tv_series"
    NOVEL = "novel"
    ORIGINALS = "originals"
    ANIME = "anime"
    ASIAN = "asian"
    NIGERIAN = "nigerian"
    LATINO = "latino"
    # Tropes
    HEARTBREAK = "heartbreak"
    LOVE_HATE = "love_hate"
    FIRST_LOVE = "first_love"
    SECRET_BABY = "secret_baby"
    WEREWOLF = "werewolf"
    VAMPIRE = "vampire"
    ZOMBIE = "zombie"
    REBORN = "reborn"
    TIME_TRAVEL = "time_travel"
    REVENGE = "revenge"
    MAFIA = "mafia"
    CEO = "ceo"
    ROYALTY = "royalty"
    DOCTOR = "doctor"

