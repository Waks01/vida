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


@router.post("/signup", response_model=dict)
async def auth_signup(payload: SignUpRequest, session: SessionDep):
    try:
        result = await signup(session, payload.email, payload.password)
    except AuthError as e:
        raise _http(e) from e
    return result


@router.post("/verify-otp", response_model=TokenResponse)
async def auth_verify_otp(payload: VerifyOtpRequest, session: SessionDep):
    try:
        access, refresh = await verify_otp(session, payload.email, payload.code)
    except AuthError as e:
        raise _http(e) from e
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
async def auth_login(payload: LoginRequest, session: SessionDep):
    try:
        access, refresh = await svc_login(session, payload.email, payload.password)
    except AuthError as e:
        raise _http(e) from e
    return TokenResponse(access_token=access, refresh_token=refresh)


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
    try:
        access, refresh = await verify_pin_login(session, payload.email, payload.pin)
    except AuthError as e:
        raise _http(e) from e
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
async def auth_refresh(payload: RefreshRequest):
    try:
        access, refresh = refresh_tokens(payload.refresh_token)
    except AuthError as e:
        raise _http(e) from e
    return TokenResponse(access_token=access, refresh_token=refresh)
