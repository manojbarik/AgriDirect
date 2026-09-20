from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import client_ip, rate_limit
from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity import service
from app.modules.identity.dependencies import get_current_user
from app.modules.identity.schemas import (
    ChallengeResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LogoutRequest,
    OtpResendRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    RoleResponse,
    UserResponse,
    VerifyOtpRequest,
    VerifyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user and send a verification OTP challenge",
)
def register(
    payload: RegisterRequest,
    _: None = Depends(rate_limit(limit=5, window_seconds=3600, bucket="auth_register")),
    db: Session = Depends(get_db),
) -> RegisterResponse:
    return service.register(db, payload)


@router.post(
    "/login",
    response_model=VerifyResponse,
    summary="Authenticate with phone number and password",
)
def login(
    payload: LoginRequest,
    _: None = Depends(rate_limit(limit=20, window_seconds=300, bucket="auth_login")),
    db: Session = Depends(get_db),
) -> VerifyResponse:
    return service.log_in(db, payload.email or payload.phone_e164 or "", payload.password)


@router.post(
    "/otp/resend",
    response_model=ChallengeResponse,
    summary="Resend a new OTP challenge for an existing user",
)
def resend_otp(
    payload: OtpResendRequest,
    _: None = Depends(rate_limit(limit=10, window_seconds=3600, bucket="auth_otp_resend")),
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    return service.resend_otp(db, payload.user_id)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Request a password reset link (email or phone identifier)",
)
def forgot_password(
    payload: ForgotPasswordRequest,
    _: None = Depends(rate_limit(limit=5, window_seconds=3600, bucket="auth_forgot_password")),
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    return service.request_password_reset(db, payload)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Set a new password using a one-time, expiring reset token",
)
def reset_password(
    payload: ResetPasswordRequest,
    _: None = Depends(rate_limit(limit=10, window_seconds=3600, bucket="auth_reset_password")),
    db: Session = Depends(get_db),
) -> ResetPasswordResponse:
    return service.reset_password(db, payload)


@router.post(
    "/otp/verify",
    response_model=VerifyResponse,
    summary="Verify an OTP code and receive tokens",
)
def verify_otp(
    payload: VerifyOtpRequest,
    _: None = Depends(rate_limit(limit=30, window_seconds=300, bucket="auth_otp_verify")),
    db: Session = Depends(get_db),
) -> VerifyResponse:
    return service.verify(db, payload)


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Rotate a refresh token and issue a new access token",
)
def refresh(
    payload: RefreshRequest,
    request: Request,
    _: None = Depends(rate_limit(limit=60, window_seconds=300, bucket="auth_refresh")),
    db: Session = Depends(get_db),
) -> RefreshResponse:
    tokens = service.refresh(
        db,
        payload.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=client_ip(request),
    )
    return RefreshResponse(tokens=tokens)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a refresh token",
)
def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db),
) -> None:
    service.logout(db, payload.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the authenticated user profile",
)
def me(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


@router.get(
    "/role",
    response_model=RoleResponse,
    summary="Return the authenticated user role",
)
def role(
    current_user: User = Depends(get_current_user),
) -> RoleResponse:
    return RoleResponse(role=current_user.role)
