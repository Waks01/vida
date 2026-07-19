from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import get_settings
from app.core.enums import CoinSource, EpisodeSource
from app.db.models import AdView, Episode, Series, User
from app.schemas import (
    EpisodeStreamResponse,
    EpisodeUnlockRequest,
    SeriesPublic,
    UnlockResponse,
)
from app.services.cloudflare_stream import CloudflareStreamError, CloudflareStreamService
from app.services.coin_service import CoinLedgerError, CoinService

router = APIRouter(prefix="/content", tags=["content"])


def _series_stmt(series_id: UUID):
    return (
        select(Series)
        .where(Series.id == series_id)
        .options(selectinload(Series.episodes))
    )


@router.get("/series", response_model=list[SeriesPublic])
async def list_series(session: SessionDep, limit: int = 20, offset: int = 0):
    stmt = (
        select(Series)
        .options(selectinload(Series.episodes))
        .order_by(Series.total_views.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/series/{series_id}", response_model=SeriesPublic)
async def get_series(series_id: str, session: SessionDep):
    row = (await session.execute(_series_stmt(UUID(series_id)))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
    return row


@router.get("/trending", response_model=list[SeriesPublic])
async def trending(session: SessionDep, limit: int = 20):
    stmt = (
        select(Series)
        .options(selectinload(Series.episodes))
        .order_by(Series.total_views.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/search", response_model=list[SeriesPublic])
async def search(q: str, session: SessionDep, limit: int = 20):
    stmt = (
        select(Series)
        .options(selectinload(Series.episodes))
        .where(Series.title.ilike(f"%{q}%"))
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/episodes/{episode_id}/stream", response_model=EpisodeStreamResponse)
async def episode_stream(episode_id: str, user_id: CurrentUserDep, session: SessionDep):
    row = await session.get(Episode, UUID(episode_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    hls_url = row.hls_url or ""
    if row.source == EpisodeSource.EXTERNAL:
        # Third-party content: hls_url is an external/public CDN URL, returned as-is.
        return EpisodeStreamResponse(
            episode_id=episode_id,
            hls_url=hls_url,
            expires_in_seconds=0,
        )
    # Cloudflare Stream content: sign a short-lived HLS URL.
    stream_service = CloudflareStreamService()
    if row.stream_uid and hls_url:
        try:
            hls_url = stream_service.sign_url(row.stream_uid, expires_in_seconds=3600)
        except CloudflareStreamError:
            pass
    return EpisodeStreamResponse(
        episode_id=episode_id,
        hls_url=hls_url,
        expires_in_seconds=3600,
    )


@router.post("/episodes/{episode_id}/unlock", response_model=UnlockResponse)
async def unlock_episode(
    episode_id: str, payload: EpisodeUnlockRequest, user_id: CurrentUserDep, session: SessionDep
):
    row = await session.get(Episode, UUID(episode_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    if not row.is_premium:
        return UnlockResponse(unlocked=True, balance=await CoinService(session).balance(user_id))

    if payload.method == "ad":
        settings = get_settings()
        now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        daily_stmt = select(func.count()).select_from(AdView).where(
            AdView.user_id == user_id,
            AdView.created_at >= today_start,
        )
        daily_count = int((await session.execute(daily_stmt)).scalar_one())

        if daily_count >= settings.ad_daily_cap:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily ad cap reached ({settings.ad_daily_cap})",
            )

        ad_view = AdView(
            id=uuid4(),
            user_id=user_id,
            ad_unit_id="episode_unlock",
            device_id=payload.device_id or f"user-{user_id}",
            coins_awarded=0,
        )
        session.add(ad_view)
        await session.commit()
        return UnlockResponse(unlocked=True, balance=await CoinService(session).balance(user_id))

    svc = CoinService(session)
    try:
        await svc.debit(
            user_id, row.coin_cost, CoinSource.EPISODE_UNLOCK, reference_id=episode_id
        )
    except CoinLedgerError as e:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e)) from None
    await session.commit()
    return UnlockResponse(unlocked=True, balance=await svc.balance(user_id))


@router.post("/episodes/{episode_id}/watch", response_model=dict)
async def episode_watch(episode_id: str, user_id: CurrentUserDep, session: SessionDep):
    row = await session.get(Episode, UUID(episode_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    # Persist the watch heartbeat: bump the episode view count and keep the
    # parent series' total_views in sync. Fraud/anti-bot gating is intentionally
    # lightweight here (auth-gated + per-episode increment).
    row.views = (row.views or 0) + 1
    series = await session.get(Series, row.series_id)
    if series is not None:
        series.total_views = (series.total_views or 0) + 1
    await session.commit()
    return {"ok": True, "views": row.views}


@router.post("/episodes/upload", response_model=dict)
async def upload_episode_video(
    series_id: Annotated[str, Form()],
    episode_number: Annotated[int, Form()],
    title: Annotated[str, Form()] = "Untitled Episode",
    file: Annotated[UploadFile, File()] = None,
    user_id: CurrentUserDep = None,
    session: SessionDep = None,
):
    """Upload an episode video to Cloudflare Stream.

    Request: multipart/form-data with `file` (video/mp4).
    Returns: Stream video details including HLS URL and thumbnail.
    """
    if not user_id or session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    user = await session.get(User, user_id)
    if not user or not user.is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creator privileges required",
        )
    series = await session.get(Series, UUID(series_id))
    if not series or str(series.creator_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Series not found or not owned by creator",
        )
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Expected video/*",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file upload",
        )

    stream_service = CloudflareStreamService()
    try:
        result = await stream_service.upload_video(
            file_bytes=contents,
            filename=file.filename or "episode.mp4",
            mime_type=file.content_type or "video/mp4",
        )
    except CloudflareStreamError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e

    settings = get_settings()
    episode = Episode(
        series_id=series.id,
        episode_number=episode_number,
        title=title,
        hls_url=result.get("hls_url"),
        thumbnail_url=result.get("thumbnail_url"),
        stream_uid=result.get("uid"),
        duration_seconds=int(result.get("duration") or 0),
        is_premium=True,
        coin_cost=settings.episode_coin_cost,
        status="pending",
    )
    session.add(episode)
    await session.commit()
    await session.refresh(episode)

    return {
        "episode_id": str(episode.id),
        "series_id": str(series.id),
        "stream_uid": result.get("uid"),
        "hls_url": result.get("hls_url"),
        "thumbnail_url": result.get("thumbnail_url"),
        "duration_seconds": result.get("duration"),
        "filename": file.filename,
        "size_bytes": len(contents),
    }


@router.post("/episodes/stream-webhook")
async def episode_stream_webhook(request: Request, session: SessionDep):
    """Cloudflare Stream webhook: called when a direct upload finishes encoding.
    Updates the matching pending episode with stream_uid/hls/thumbnail/duration
    and marks it `ready` (it becomes playable once the series is admin-approved)."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    result = (payload.get("result") or payload.get("video") or {})
    uid = result.get("uid")
    if not uid:
        return {"received": True}

    stmt = select(Episode).where(Episode.stream_uid == uid)
    episode = (await session.execute(stmt)).scalar_one_or_none()
    if not episode:
        # Episode not yet linked (client upload path stores uid after webhook in
        # production); nothing to update yet.
        return {"received": True}

    playback = result.get("playback", {}) or {}
    episode.hls_url = playback.get("hls") or episode.hls_url
    episode.thumbnail_url = result.get("preview") or episode.thumbnail_url
    episode.duration_seconds = int(result.get("duration") or episode.duration_seconds or 0)
    # Direct-upload creates the video with this uid; persist it.
    if not episode.stream_uid:
        episode.stream_uid = uid
    # A Stream webhook always describes a Stream-sourced episode.
    episode.source = EpisodeSource.STREAM
    if episode.status == "pending":
        episode.status = "ready"
    await session.commit()
    return {"received": True}
