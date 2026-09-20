from __future__ import annotations

import re
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.identity import OtpChallenge, PasswordResetToken, RefreshToken
from app.db.models.people import (
    BulkBuyerProfile,
    ConsumerProfile,
    LogisticsPartnerProfile,
    User,
)
from app.integrations.otp import OtpDeliveryError, OtpDeliveryReceipt, get_otp_provider
from app.modules.identity import security
from app.modules.identity.schemas import (
    ChallengeResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
    VerifyOtpRequest,
    VerifyResponse,
)
from app.modules.notifications import service as notifications_service

MAX_OTP_ATTEMPTS = 5
OTP_LIFETIME_MINUTES = 5  # informational; effective TTL is settings.otp_ttl_minutes

# Timing equalization: unknown phone numbers verify against a dummy bcrypt hash
# so the response time does not reveal whether an account exists.
_DUMMY_PASSWORD_HASH: str | None = None


def _dummy_password_hash() -> str:
    global _DUMMY_PASSWORD_HASH
    if _DUMMY_PASSWORD_HASH is None:
        _DUMMY_PASSWORD_HASH = security.hash_password(
            "timing-equalization-not-a-real-password"
        )
    return _DUMMY_PASSWORD_HASH

# OTP resend abuse throttling. The resend endpoint is unauthenticated and has no
# other natural back-pressure, so without a cooldown an attacker could request
# an unlimited number of fresh challenges (each with its own 5-verify budget)
# and SMS-flood the target. Limits are process-local (see security notes in
# ``app.core.rate_limit``); a Redis-backed store is the deployment upgrade path.
RESEND_COOLDOWN_SECONDS = 30
RESEND_MAX_PER_HOUR = 5

# Login brute-force lockout: process-local, keyed by phone number. Combined with
# the per-IP ``rate_limit`` on the login route.
LOGIN_MAX_FAILURES = 10
LOGIN_LOCKOUT_SECONDS = 900.0

_login_lock = threading.Lock()
_resend_lock = threading.Lock()
_login_failures: dict[str, deque[float]] = defaultdict(deque)
_last_resend: dict[str, float] = {}
_email_delivery_events: dict[str, deque[float]] = defaultdict(deque)


def _mock_code_enabled() -> bool:
    settings = get_settings()
    return settings.app_env == "test" or (
        settings.otp_provider_mode == "mock" and settings.app_env == "development"
    )


def _issue_challenge(db: Session, user: User) -> tuple[OtpChallenge, OtpDeliveryReceipt]:
    now = security.utc_now()
    for active in db.scalars(
        select(OtpChallenge).where(
            OtpChallenge.user_id == user.id, OtpChallenge.consumed_at.is_(None)
        )
    ):
        active.consumed_at = now

    provider = get_otp_provider()
    recipient = user.email or user.phone_e164
    code = provider.generate_code(recipient)
    try:
        receipt = provider.send(recipient, code)
    except OtpDeliveryError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
            headers={"Retry-After": "60"},
        ) from exc
    challenge = OtpChallenge(
        user_id=user.id,
        channel="EMAIL" if user.email else "SMS",
        code_hash=security.hash_code(code),
        expires_at=now + timedelta(minutes=get_settings().otp_ttl_minutes),
        provider_reference=receipt.provider_reference,
    )
    db.add(challenge)
    db.flush()
    return challenge, receipt


def _challenge_response(
    user: User, challenge: OtpChallenge, receipt: OtpDeliveryReceipt
) -> ChallengeResponse:
    return ChallengeResponse(
        user_id=user.id,
        challenge_id=challenge.id,
        purpose=challenge.purpose,
        expires_at=challenge.expires_at,
        resend_after_seconds=get_settings().otp_resend_cooldown_seconds,
        mock_code=receipt.mock_code if _mock_code_enabled() else None,
    )


def _record_failed_login(phone_e164: str) -> None:
    now = time.monotonic()
    with _login_lock:
        window = _login_failures[phone_e164]
        cutoff = now - LOGIN_LOCKOUT_SECONDS
        while window and window[0] <= cutoff:
            window.popleft()
        window.append(now)


def _clear_failed_logins(phone_e164: str) -> None:
    with _login_lock:
        _login_failures.pop(phone_e164, None)


def _login_locked_out(phone_e164: str) -> bool:
    now = time.monotonic()
    with _login_lock:
        window = _login_failures.get(phone_e164)
        if not window:
            return False
        cutoff = now - LOGIN_LOCKOUT_SECONDS
        while window and window[0] <= cutoff:
            window.popleft()
        return len(window) >= LOGIN_MAX_FAILURES


def _enforce_resend_limits(db: Session, user: User) -> None:
    now = time.monotonic()
    user_key = str(user.id)
    with _resend_lock:
        last = _last_resend.get(user_key)
        cooldown = get_settings().otp_resend_cooldown_seconds
        if last is not None and now - last < cooldown:
            wait = int(cooldown - (now - last)) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait} seconds before requesting another code",
                headers={"Retry-After": str(wait)},
            )

    hour_ago = security.utc_now() - timedelta(hours=1)
    recent = db.scalar(
        select(func.count(OtpChallenge.id)).where(
            OtpChallenge.user_id == user.id,
            OtpChallenge.created_at >= hour_ago,
        )
    ) or 0
    if recent >= get_settings().otp_resend_max_per_hour:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many One Time Passwords requested for this account. Try again later.",
        )

    if user.email:
        now = time.monotonic()
        with _resend_lock:
            events = _email_delivery_events[user.email.lower()]
            cutoff = now - 3600
            while events and events[0] <= cutoff:
                events.popleft()
            cooldown = get_settings().otp_resend_cooldown_seconds
            if events and now - events[-1] < cooldown:
                wait = int(cooldown - (now - events[-1])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {wait} seconds before requesting another email code",
                    headers={"Retry-After": str(wait)},
                )
            if len(events) >= get_settings().otp_resend_max_per_hour:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many verification emails requested. Try again later.",
                )


def _note_email_delivery(email: str | None) -> None:
    if email:
        with _resend_lock:
            _email_delivery_events[email.lower()].append(time.monotonic())


def _note_resend(user_id: str) -> None:
    with _resend_lock:
        _last_resend[user_id] = time.monotonic()


def reset_security_state() -> None:
    """Clear process-local auth throttles (called by the test suite)."""
    with _login_lock:
        _login_failures.clear()
    with _resend_lock:
        _last_resend.clear()
        _email_delivery_events.clear()


def register(db: Session, payload: RegisterRequest) -> RegisterResponse:
    existing = db.scalar(
        select(User).where(
            (User.phone_e164 == payload.phone_e164)
            | (payload.email is not None and User.email == payload.email)
        )
    )
    if existing is not None:
        # If the user registered previously but has not verified their OTP yet,
        # update their pending account credentials and re-issue a fresh challenge.
        if existing.status == "PENDING" and existing.phone_verified_at is None:
            existing.phone_e164 = payload.phone_e164
            if payload.email:
                existing.email = payload.email
            existing.role = payload.role
            existing.password_hash = security.hash_password(payload.password)
            challenge, receipt = _issue_challenge(db, existing)
            _note_email_delivery(existing.email)
            _note_resend(str(existing.id))
            response = _challenge_response(existing, challenge, receipt)
            db.commit()
            return RegisterResponse(
                phone_e164=existing.phone_e164,
                email=existing.email,
                role=existing.role,
                status=existing.status,
                **response.model_dump(exclude={"phone_e164", "role", "status"}),
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this phone number or email is already registered",
        )
    user = User(
        phone_e164=payload.phone_e164,
        email=payload.email,
        role=payload.role,
        password_hash=security.hash_password(payload.password),
        status="PENDING",
    )
    db.add(user)
    db.flush()
    if payload.role == "CONSUMER":
        db.add(ConsumerProfile(user_id=user.id))
    elif payload.role == "LOGISTICS":
        db.add(LogisticsPartnerProfile(user_id=user.id, company_name=f"Logistics-{user.phone_e164[-6:]}"))
    elif payload.role == "BULK_BUYER":
        db.add(
            BulkBuyerProfile(
                user_id=user.id,
                organization_name=f"Enterprise-{user.phone_e164[-6:]}",
                org_type="OTHER",
            )
        )
    challenge, receipt = _issue_challenge(db, user)
    _note_email_delivery(user.email)
    response = _challenge_response(user, challenge, receipt)
    db.commit()
    notifications_service.emit(db, "registration", user_id=user.id, role=user.role)
    db.commit()
    return RegisterResponse(
        phone_e164=user.phone_e164,
        email=user.email,
        role=user.role,
        status=user.status,
        **response.model_dump(exclude={"phone_e164", "role", "status"}),
    )


def resend_otp(db: Session, user_id: object) -> ChallengeResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    _enforce_resend_limits(db, user)
    challenge, receipt = _issue_challenge(db, user)
    _note_email_delivery(user.email)
    _note_resend(str(user.id))
    response = _challenge_response(user, challenge, receipt)
    db.commit()
    return response


def log_in(db: Session, identity: str, password: str) -> VerifyResponse:
    identity = identity.strip()
    if _login_locked_out(identity):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
            headers={"Retry-After": str(int(LOGIN_LOCKOUT_SECONDS))},
        )

    # Normalize phone candidate representations
    phone_digits = re.sub(r"\D", "", identity)
    phone_candidates = [identity]
    if phone_digits:
        if len(phone_digits) == 10:
            phone_candidates.append(f"+91{phone_digits}")
            phone_candidates.append(f"+{phone_digits}")
        elif phone_digits.startswith("91") and len(phone_digits) == 12:
            phone_candidates.append(f"+{phone_digits}")
            phone_candidates.append(f"+{phone_digits[2:]}")
        else:
            phone_candidates.append(f"+{phone_digits}")

    user = db.scalar(
        select(User).where(
            (func.lower(User.email) == identity.lower())
            | User.phone_e164.in_(phone_candidates)
        )
    )
    if user is None or user.password_hash is None:
        security.password_matches(_dummy_password_hash(), password)
        _record_failed_login(identity)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password",
        )
    if not security.password_matches(user.password_hash, password):
        _record_failed_login(identity)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password",
        )
    if user.status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Phone number not verified; complete OTP verification first",
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or closed",
        )
    tokens = _issue_tokens(db, user)
    _clear_failed_logins(identity)
    if user.phone_e164:
        _clear_failed_logins(user.phone_e164)
    if user.email:
        _clear_failed_logins(user.email)
    db.commit()
    return VerifyResponse(
        user_id=user.id,
        role=user.role,
        status=user.status,
        tokens=tokens,
    )


def verify(db: Session, payload: VerifyOtpRequest) -> VerifyResponse:
    now = security.utc_now()
    challenge = db.get(OtpChallenge, payload.challenge_id)
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Challenge is invalid or has expired",
        )
    if challenge.consumed_at is not None or security.coerce_utc(challenge.expires_at) < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Challenge is invalid or has expired",
        )
    if not security.code_matches(challenge.code_hash, payload.code):
        challenge.attempts += 1
        if challenge.attempts >= MAX_OTP_ATTEMPTS:
            challenge.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired code",
        )
    user = db.get(User, challenge.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    challenge.consumed_at = now
    user.phone_verified_at = now
    user.status = "ACTIVE"
    db.flush()
    tokens = _issue_tokens(db, user)
    db.commit()
    notifications_service.emit(db, "verification", user_id=user.id, role=user.role)
    db.commit()
    return VerifyResponse(
        user_id=user.id,
        role=user.role,
        status=user.status,
        tokens=tokens,
    )


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    raw_refresh = security.generate_refresh_token()
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=security.hash_token(raw_refresh),
        expires_at=security.utc_now() + timedelta(days=get_settings().jwt_refresh_token_days),
    )
    db.add(refresh_record)
    db.flush()
    access_token, expires_in = security.create_access_token(str(user.id), user.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=expires_in,
    )


def refresh(
    db: Session,
    refresh_token: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> TokenResponse:
    now = security.utc_now()
    record = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == security.hash_token(refresh_token))
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid",
        )
    if record.revoked_at is not None or security.coerce_utc(record.expires_at) < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked or has expired",
        )
    user = db.get(User, record.user_id)
    if user is None or user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is not active",
        )

    raw_next = security.generate_refresh_token()
    next_record = RefreshToken(
        user_id=user.id,
        token_hash=security.hash_token(raw_next),
        expires_at=now + timedelta(days=get_settings().jwt_refresh_token_days),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(next_record)
    db.flush()
    record.revoked_at = now
    record.replaced_by = next_record.id
    access_token, expires_in = security.create_access_token(str(user.id), user.role)
    db.commit()
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_next,
        expires_in=expires_in,
    )


def logout(db: Session, refresh_token: str) -> None:
    record = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == security.hash_token(refresh_token))
    )
    if record is not None:
        record.revoked_at = security.utc_now()
        db.commit()


def _reset_token_mock_enabled() -> bool:
    return get_settings().app_env in ("development", "test")


def request_password_reset(db: Session, payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
    """Issue a password reset token without revealing whether the account exists.

    A fresh token invalidates any outstanding reset tokens for the same user
    (``consumed_at`` marks both used and superseded tokens). The raw token is
    only ever returned to the caller in development/test so the demo flow can
    complete; production always answers with the same generic message.
    """
    identifier = payload.identifier.strip()
    now = security.utc_now()
    ttl_minutes = get_settings().password_reset_token_ttl_minutes

    user = db.scalar(
        select(User).where(
            (User.email == identifier.lower())
            | (User.phone_e164 == identifier)
        )
    )

    raw_token = security.generate_password_reset_token()
    if user is not None and user.status in ("ACTIVE", "PENDING"):
        outstanding = db.scalars(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.consumed_at.is_(None),
            )
        ).all()
        for token in outstanding:
            token.consumed_at = now
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=security.hash_token(raw_token),
                expires_at=now + timedelta(minutes=ttl_minutes),
            )
        )
        db.commit()
        notifications_service.emit(
            db,
            "password_reset_requested",
            user_id=user.id,
            role=user.role,
            ttl_minutes=ttl_minutes,
        )
        db.commit()
    else:
        db.commit()

    return ForgotPasswordResponse(
        message=(
            "If an account exists for that email or phone number, a password reset "
            "link has been sent. Please also check your spam folder."
        ),
        expires_in_minutes=ttl_minutes,
        mock_reset_token=raw_token if _reset_token_mock_enabled() else None,
    )


def reset_password(db: Session, payload: ResetPasswordRequest) -> ResetPasswordResponse:
    """Consume a reset token and update the user's password.

    The token is stored hashed, so lookup uses the hash. Tokens are one-time:
    ``consumed_at`` is set on success, which also invalidates refresh sessions.
    """
    record = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == security.hash_token(payload.token)
        )
    )
    now = security.utc_now()
    if record is None or record.consumed_at is not None:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has already been used",
        )
    if security.coerce_utc(record.expires_at) < now:
        record.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired. Please request a new one",
        )

    user = db.get(User, record.user_id)
    if user is None or user.status in ("SUSPENDED", "CLOSED"):
        record.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has already been used",
        )

    user.password_hash = security.hash_password(payload.new_password)
    record.consumed_at = now

    active_refresh = db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
    ).all()
    for refresh in active_refresh:
        refresh.revoked_at = now

    db.commit()
    notifications_service.emit(db, "password_changed", user_id=user.id, role=user.role)
    db.commit()
    return ResetPasswordResponse(message="Your password has been reset successfully")
