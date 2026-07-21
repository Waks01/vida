from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas import (
    LoginRequest,
    PinSetRequest,
    PinVerifyRequest,
    RefreshRequest,
    SignUpRequest,
    TokenResponse,
    VerifyOtpRequest,
)
from app.services.auth_service import (
    AuthError,
    refresh_tokens,
    set_pin,
    signup,
    verify_otp,
    verify_pin_login,
)
from app.services.auth_service import (
    login as svc_login,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _http(e: AuthError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


import logging
from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger("vida.auth")

@router.post("/signup", response_model=dict)
async def auth_signup(payload: SignUpRequest, session: SessionDep):
    logger.info("signup attempt email=%s", payload.email)
    try:
        result = await signup(session, payload.email, payload.password)
        logger.info("signup success email=%s result=%s", payload.email, result)
        return result
    except AuthError as e:
        logger.warning("signup auth_error email=%s error=%s", payload.email, e)
        raise _http(e) from e
    except Exception as e:
        logger.error("signup unexpected error email=%s error=%s", payload.email, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        ) from e


@router.post("/verify-otp", response_model=TokenResponse)
async def auth_verify_otp(payload: VerifyOtpRequest, session: SessionDep):
    logger.info("verify_otp attempt email=%s", payload.email)
    try:
        access, refresh = await verify_otp(session, payload.email, payload.code)
        logger.info("verify_otp success email=%s", payload.email)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except AuthError as e:
        logger.warning("verify_otp auth_error email=%s error=%s", payload.email, e)
        raise _http(e) from e


@router.post("/login", response_model=TokenResponse)
async def auth_login(payload: LoginRequest, session: SessionDep):
    logger.info("login attempt email=%s", payload.email)
    try:
        access, refresh = await svc_login(session, payload.email, payload.password)
        logger.info("login success email=%s", payload.email)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except AuthError as e:
        logger.warning("login auth_error email=%s error=%s", payload.email, e)
        raise _http(e) from e


@router.post("/pin/set", response_model=dict)
async def auth_set_pin(
    payload: PinSetRequest, session: SessionDep, user_id: CurrentUserDep
):
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auth-protected; pass bearer token in Phase 1",
        )
    try:
        await set_pin(session, user_id, payload.pin)
    except AuthError as e:
        raise _http(e) from e
    return {"message": "pin set"}


@router.post("/pin/verify", response_model=TokenResponse)
async def auth_pin_verify(payload: PinVerifyRequest, session: SessionDep):
    logger.info("pin_verify attempt email=%s", payload.email)
    try:
        access, refresh = await verify_pin_login(session, payload.email, payload.pin)
        logger.info("pin_verify success email=%s", payload.email)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except AuthError as e:
        logger.warning("pin_verify auth_error email=%s error=%s", payload.email, e)
        raise _http(e) from e


@router.post("/refresh", response_model=TokenResponse)
async def auth_refresh(payload: RefreshRequest):
    try:
        access, refresh = refresh_tokens(payload.refresh_token)
    except AuthError as e:
        raise _http(e) from e
    return TokenResponse(access_token=access, refresh_token=refresh)
