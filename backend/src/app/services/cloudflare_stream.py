import os

import httpx
from jose import jwt

from app.core.config import get_settings


class CloudflareStreamError(Exception):
    pass


class CloudflareStreamService:
    """Uploads videos to Cloudflare Stream and returns playback URLs."""

    def __init__(self):
        settings = get_settings()
        self.account_id = settings.cloudflare_stream_account_id
        self.api_token = settings.cloudflare_stream_api_token
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/stream"

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_token}",
        }

    def sign_url(self, video_uid: str, expires_in_seconds: int = 3600) -> str:
        """Sign a Cloudflare Stream playback URL with JWT expiry.

        Returns a URL like:
          https://customer-<account>.cloudflarestream.com/<video_uid>/manifest/video.m3u8?<jwt>
        """
        if not self.account_id or not self.api_token:
            raise CloudflareStreamError("Cloudflare Stream credentials not configured")

        now = int(os.time() if hasattr(os, "time") else __import__("time").time())
        payload = {
            "sub": video_uid,
            "exp": now + expires_in_seconds,
            "iss": self.account_id,
        }
        token = jwt.encode(payload, self.api_token, algorithm="HS256")
        base = f"https://customer-{self.account_id}.cloudflarestream.com/{video_uid}/manifest/video.m3u8"
        return f"{base}?token={token}"

    async def upload_video(self, file_bytes: bytes, filename: str, mime_type: str = "video/mp4") -> dict:
        """Upload a video file to Cloudflare Stream.

        Returns dict with:
          - uid: Stream video ID
          - hls_url: HLS playback URL
          - thumbnail_url: Thumbnail URL
          - duration: video duration in seconds
        """
        if not self.account_id or not self.api_token:
            raise CloudflareStreamError("Cloudflare Stream credentials not configured")

        form = {
            "file": (filename, file_bytes, mime_type),
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/direct_upload",
                headers=self._headers(),
                files=form,
            )

        if response.status_code not in (200, 201):
            raise CloudflareStreamError(f"Stream upload failed: {response.text}")

        data = response.json()
        if not data.get("success"):
            raise CloudflareStreamError(f"Stream upload error: {data}")

        result = data["result"]
        return {
            "uid": result.get("uid"),
            "hls_url": result.get("playback", {}).get("hls"),
            "thumbnail_url": result.get("preview"),
            "duration": result.get("duration"),
        }

    def create_direct_upload_url(
        self, expiry_seconds: int = 3600, uid: str | None = None
    ) -> dict:
        """Create a one-time Cloudflare Stream direct-upload ticket.

        We generate (or accept) a `uid` and hand it to Stream's direct_upload
        endpoint so the resulting video id is known up-front. The uid is stored
        on the pending Episode so the Stream webhook can match + complete it.

        Returns a dict with:
          - uid: the Stream video id that will be created on upload
          - upload_url: a short-lived URL the client PUTs the video to directly
          - expires_in: seconds until the ticket expires
        The client uploads the raw file straight to Stream (no R2/worker needed);
        Stream transcodes, generates the thumbnail, and stores the HLS manifest.
        """
        if not self.account_id or not self.api_token:
            raise CloudflareStreamError("Cloudflare Stream credentials not configured")

        import time
        from uuid import uuid4

        if not uid:
            uid = str(uuid4())
        now = int(time.time())
        payload = {
            "uid": uid,
            "expiry": now + expiry_seconds,
        }
        headers = {"Authorization": f"Bearer {self.api_token}", "Content-Type": "application/json"}
        try:
            response = httpx.post(
                f"{self.base_url}/direct_upload",
                headers=headers,
                json=payload,
                timeout=30.0,
            )
        except httpx.HTTPError as e:
            raise CloudflareStreamError(f"Stream direct-upload request failed: {e}") from e

        if response.status_code not in (200, 201):
            raise CloudflareStreamError(f"Stream direct-upload failed: {response.text}")
        data = response.json()
        if not data.get("success"):
            raise CloudflareStreamError(f"Stream direct-upload error: {data}")

        result = data["result"]
        return {
            "uid": result.get("uid", uid),
            "upload_url": result.get("uploadURL") or result.get("upload_url"),
            "expires_in": expiry_seconds,
        }

    async def get_video(self, stream_uid: str) -> dict:
        """Get video details from Cloudflare Stream."""
        if not self.account_id or not self.api_token:
            raise CloudflareStreamError("Cloudflare Stream credentials not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/{stream_uid}",
                headers=self._headers(),
            )

        if response.status_code != 200:
            raise CloudflareStreamError(f"Stream get failed: {response.text}")

        data = response.json()
        if not data.get("success"):
            raise CloudflareStreamError(f"Stream get error: {data}")

        return data["result"]

    async def delete_video(self, stream_uid: str) -> None:
        """Delete a video from Cloudflare Stream."""
        if not self.account_id or not self.api_token:
            raise CloudflareStreamError("Cloudflare Stream credentials not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.base_url}/{stream_uid}",
                headers=self._headers(),
            )

        if response.status_code not in (200, 204):
            raise CloudflareStreamError(f"Stream delete failed: {response.text}")
