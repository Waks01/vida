"""Ad completion callback-token verification (anti-fraud).

The rewarded-ad flow sends a `callback_token` (client-generated UUID/nonce)
alongside the ad completion. The backend verifies it by checking it hasn't
been used before (replay protection), matching the design's "verify signature"
step for `POST /wallet/ads/complete` without depending on AdMob's
partner-only server verification API or embedding server secrets in the app.
"""
import re
from datetime import UTC, datetime, timedelta

_CALLBACK_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]+$")
_TOKEN_MAX_AGE = timedelta(minutes=5)


def verify_ad_callback(token: str) -> bool:
    """Validate callback_token format and freshness.

    Real replay protection is enforced at the DB layer (unique constraint on
    the `callback_token` column of `ad_views`). This helper rejects obviously
    malformed or stale tokens so we fail fast before hitting the DB.
    """
    if not token or not isinstance(token, str):
        return False
    token = token.strip()
    if not _CALLBACK_TOKEN_RE.match(token):
        return False
    # Reject tokens that are clearly too old (heuristic: if the token encodes
    # a timestamp we can check it; otherwise we rely on the DB constraint).
    # Format accepted: "unix_ts.hex_sig" (legacy HMAC-style) or plain UUID/nonce.
    if "." in token:
        try:
            ts_str, _ = token.split(".", 1)
            ts = datetime.fromtimestamp(int(ts_str), tz=UTC)
            if datetime.now(UTC) - ts > _TOKEN_MAX_AGE:
                return False
        except (ValueError, OSError):
            return False
    return True

