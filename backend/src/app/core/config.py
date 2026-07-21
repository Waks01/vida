from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.enums import ThemePreference


class Settings(BaseSettings):
    """Application settings, validated at startup from env / .env.

    Fails fast on missing required values. Never read os.getenv directly;
    inject Settings via get_settings() so tests can override.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Application ───
    app_name: str = "Vida Backend"
    app_version: str = "0.1.0"
    environment: str = "local"  # local | staging | production
    debug: bool = False

    # ─── Database (async PostgreSQL) ───
    database_url: str = "postgresql+asyncpg://vida:vida@localhost:5432/vida"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # ─── Redis (cache / queue / cooldowns) ───
    redis_url: str = "redis://localhost:6379/0"

    # ─── Auth / security ───
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    pin_bcrypt_rounds: int = 12

    # ─── Email OTP (Resend in prod, dev console fallback) ───
    otp_length: int = 6
    otp_ttl_seconds: int = 600
    resend_api_key: str = ""
    resend_email_from: str = "Vida <no-reply@vida.app>"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # ─── CORS ───
    allowed_origins: list[str] = ["http://localhost:19006", "http://localhost:8081"]

    # ─── Payments (Paystack / Stripe / Google Pay) ───
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    googlepay_merchant_id: str = ""
    paystack_customer_email: str = ""  # fallback customer email if user email unavailable

    # ─── Media (Cloudflare R2 + Stream) ───
    r2_account_id: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_bucket: str = ""
    r2_public_url: str = ""
    cloudflare_stream_api_token: str = ""
    cloudflare_stream_account_id: str = ""

    # ─── Coin economy constants ───
    creator_revenue_share: float = 0.65
    daily_checkin_coins: int = 100
    ad_watch_coins: int = 20
    ad_daily_cap: int = 20
    ad_cooldown_seconds: int = 30
    # Server secret used to sign/verify the ad `callback_token` (anti-fraud).
    # MUST be set in production; a dev default keeps local flow working.
    ad_callback_secret: str = "dev-ad-callback-secret-change-me"
    episode_coin_cost: int = 25
    coin_rate: int = 10  # coins per 1 NGN
    coin_pack_min_ngn: int = 100
    coin_pack_step_ngn: int = 100
    payout_minimum_usd: float = 50.0
    vip_weekly_usd: float = 4.99
    default_theme: str = ThemePreference.DARK.value

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        if self.environment == "local":
            return ["*"]
        return self.allowed_origins


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton (loaded once per process)."""
    return Settings()
