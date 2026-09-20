from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt as pyjwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DEV_JWT_SECRET = "dev-insecure-secret-change-me-000000000000"

# Pinned signing algorithm. ``JWT_ALGORITHM`` must match; anything outside the
# allowlist is refused so a misconfigured deployment can never downgrade to a
# weaker algorithm (e.g. "none").
JWT_ALGORITHM = "HS256"
JWT_ALLOWED_ALGORITHMS = ("HS256",)
JWT_AUDIENCE = "marketplace-api"

# Values that are never acceptable as a production signing secret.
_INSECURE_SECRETS = {
    "",
    "replace-with-a-local-development-secret",
    DEV_JWT_SECRET,
}


def get_jwt_secret() -> str:
    """Return the JWT signing secret, refusing insecure fallbacks in prod.

    Development/test environments may fall back to the shared ``DEV_JWT_SECRET``
    so local runs and the test suite work without configuration. Any other
    environment must provide its own strong secret; silently signing tokens
    with a value that is public in the repository would let anyone forge an
    ADMIN token.
    """
    settings = get_settings()
    secret = settings.jwt_secret_key
    if secret and secret not in _INSECURE_SECRETS:
        return secret
    if settings.app_env in ("development", "test"):
        logger.info("Using the development JWT secret (development/test environment)")
        return DEV_JWT_SECRET
    raise RuntimeError(
        "JWT_SECRET_KEY is not configured with a strong secret in "
        f"{settings.app_env!r}; refusing to sign tokens with an insecure key"
    )


def _assert_supported_algorithm() -> str:
    algorithm = get_settings().jwt_algorithm
    if algorithm not in JWT_ALLOWED_ALGORITHMS:
        raise RuntimeError(
            f"Unsupported JWT algorithm {algorithm!r}; allowed: "
            f"{', '.join(JWT_ALLOWED_ALGORITHMS)}"
        )
    return JWT_ALGORITHM


def utc_now() -> datetime:
    return datetime.now(UTC)


def coerce_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def create_access_token(user_id: str, role: str) -> tuple[str, int]:
    settings = get_settings()
    now = utc_now()
    expires_in_seconds = settings.jwt_access_token_minutes * 60
    algorithm = _assert_supported_algorithm()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "aud": JWT_AUDIENCE,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in_seconds),
    }
    token = pyjwt.encode(payload, get_jwt_secret(), algorithm=algorithm)
    return token, expires_in_seconds


def decode_access_token(token: str) -> dict[str, Any]:
    algorithm = _assert_supported_algorithm()
    payload = pyjwt.decode(
        token,
        get_jwt_secret(),
        algorithms=[algorithm],
        audience=JWT_AUDIENCE,
        options={"require": ["sub", "exp", "iat", "aud"]},
    )
    if payload.get("type") != "access":
        raise pyjwt.InvalidTokenError("Token is not an access token")
    return payload


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def generate_password_reset_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def code_matches(code_hash: str, code: str) -> bool:
    return hmac.compare_digest(code_hash, hash_code(code))


def hash_password(password: str) -> str:
    """Hash a password with bcrypt. Passwords must be at most 72 bytes."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def password_matches(password_hash: str, password: str) -> bool:
    """Verify a password against a bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False
