
import boto3
from botocore.config import Config

from app.core.config import get_settings


class R2Error(Exception):
    """Raised when an R2 operation fails (misconfig, signing error, etc.)."""


class R2Service:
    """S3-compatible client for Cloudflare R2. Generates presigned PUT URLs so
    the client can upload episode source files directly to R2, then hand the
    object key to a worker/endpoint for transcoding to Cloudflare Stream."""

    def __init__(self) -> None:
        settings = get_settings()
        self.account_id = settings.r2_account_id
        self.bucket = settings.r2_bucket
        self.public_url = settings.r2_public_url
        endpoint = (
            f"https://{self.account_id}.r2.cloudflarestorage.com"
            if self.account_id
            else None
        )
        if (
            not self.account_id
            or not settings.r2_access_key
            or not settings.r2_secret_key
            or not self.bucket
        ):
            self.client = None
            return
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.r2_access_key,
            aws_secret_access_key=settings.r2_secret_key,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    def _ensure_configured(self) -> None:
        if self.client is None:
            raise R2Error("R2 not configured")

    def _object_key(self, user_id: str, filename: str) -> str:
        safe = filename.replace(" ", "_")
        return f"uploads/{user_id}/{safe}"

    def create_presigned_upload_url(
        self, user_id: str, filename: str, content_type: str, expires_in: int = 900
    ) -> dict:
        """Return a presigned PUT URL + the object key the client must upload to."""
        self._ensure_configured()
        key = self._object_key(user_id, filename)
        try:
            url = self.client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
        except Exception as e:  # noqa: BLE001 - surface as domain error
            raise R2Error(f"Failed to sign upload URL: {e}") from e

        public_url = f"{self.public_url.rstrip('/')}/{key}" if self.public_url else None
        return {
            "upload_url": url,
            "object_key": key,
            "method": "PUT",
            "expires_in": expires_in,
            "public_url": public_url,
        }

    def public_object_url(self, object_key: str) -> str | None:
        if not self.public_url:
            return None
        return f"{self.public_url.rstrip('/')}/{object_key}"
