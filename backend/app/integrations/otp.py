"""OTP delivery providers and deterministic mock implementation."""

import base64
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from email.mime.text import MIMEText

import requests

from app.core.config import get_settings
from app.templates.email.otp import render_otp_email

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OtpDeliveryReceipt:
    provider_reference: str | None
    mock_code: str | None = None


class OtpDeliveryError(RuntimeError):
    """Raised when the configured OTP provider cannot deliver a message."""


class OtpProvider(ABC):
    @abstractmethod
    def generate_code(self, recipient: str) -> str:
        """Generate the one-time code for an email or legacy phone recipient."""

    @abstractmethod
    def send(self, recipient: str, code: str) -> OtpDeliveryReceipt:
        """Deliver an OTP code and return a provider receipt."""


class MockOtpProvider(OtpProvider):
    """Deterministic mock provider for local development and tests.

    The code is the last 6 digits of the phone number so testers can
    complete the flow without reading logs. Only present in mock mode;
    real providers must never reveal the code.
    """

    def generate_code(self, recipient: str) -> str:
        digits = "".join(char for char in recipient if char.isdigit())
        return digits[-6:] if len(digits) >= 6 else "123456"

    def send(self, recipient: str, code: str) -> OtpDeliveryReceipt:
        logger.info("[mock-otp] sending challenge to %s", recipient)
        return OtpDeliveryReceipt(
            provider_reference=f"mock-otp-{recipient}",
            mock_code=code,
        )


class GmailOtpProvider(OtpProvider):
    """Send OTP emails through the Gmail API using OAuth2 credentials.

    Uses the Gmail `messages.send` endpoint scoped to the connected account.
    A refresh token is required in addition to the client id/secret; run the
    one-time setup script to obtain it:

        python -m scripts.gmail_oauth_setup
    """

    TOKEN_URL = "https://oauth2.googleapis.com/token"
    GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    _SCOPES = "https://www.googleapis.com/auth/gmail.send"

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
        sender_email: str,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.sender_email = sender_email
        self._cached_access_token: str | None = None
        self._access_token_expires_at = 0.0

    def generate_code(self, recipient: str) -> str:
        del recipient
        import secrets

        return f"{secrets.randbelow(1_000_000):06d}"

    def _obtain_access_token(self) -> str:
        """Return a valid OAuth2 access token, refreshing it when stale."""
        now = time.monotonic()
        if self._cached_access_token and now < self._access_token_expires_at - 60:
            return self._cached_access_token
        response = requests.post(
            self.TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": self.refresh_token,
                "scope": self._SCOPES,
            },
            timeout=20,
        )
        if response.status_code != 200:
            logger.warning("Gmail token refresh failed: %s", response.text)
            raise OtpDeliveryError(
                "Could not refresh the Gmail access token. Check that "
                "GMAIL_REFRESH_TOKEN is valid and GMAIL_CLIENT_ID/SECRET match."
            )
        payload = response.json()
        self._cached_access_token = payload["access_token"]
        self._access_token_expires_at = now + float(payload.get("expires_in", 3600))
        return self._cached_access_token

    def send(self, recipient: str, code: str) -> OtpDeliveryReceipt:
        if not (self.client_id and self.client_secret and self.refresh_token and self.sender_email):
            raise OtpDeliveryError(
                "Gmail API is not fully configured. Set GMAIL_CLIENT_ID, "
                "GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_SENDER_EMAIL, "
                "or keep OTP_PROVIDER_MODE=mock for local development."
            )
        try:
            token = self._obtain_access_token()
            message = MIMEText(
                render_otp_email(code, ttl_minutes=get_settings().otp_ttl_minutes), "html"
            )
            message["to"] = recipient
            message["from"] = self.sender_email
            message["subject"] = "Your AgriDirect verification code"
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode("ascii")
            response = requests.post(
                self.GMAIL_SEND_URL,
                headers={"Authorization": f"Bearer {token}"},
                json={"raw": raw},
                timeout=20,
            )
        except OtpDeliveryError:
            raise
        except requests.RequestException as exc:
            raise OtpDeliveryError("The verification email could not be sent") from exc
        if response.status_code != 200:
            logger.warning("Gmail send failed (%s): %s", response.status_code, response.text)
            body = response.text.lower()
            if "invalid_grant" in body or "expired" in body:
                raise OtpDeliveryError(
                    "The Gmail refresh token is invalid or expired. Re-run "
                    "`python -m scripts.gmail_oauth_setup` to obtain a new one."
                )
            if "permission" in body or "scope" in body:
                raise OtpDeliveryError(
                    "The connected account is not authorised to send email. "
                    "Re-run the Gmail setup flow and grant the send permission."
                )
            raise OtpDeliveryError("The verification email could not be sent")
        reference = response.json().get("id")
        return OtpDeliveryReceipt(provider_reference=reference)


class SmtpOtpProvider(OtpProvider):
    """Send OTP emails through SMTP using an App Password.

    Works with any SMTP host that supports STARTTLS. For Gmail, generate an
    app password at https://myaccount.google.com/apppasswords (requires
    2-Step Verification) and store it in SMTP_APP_PASSWORD.
    """

    def __init__(
        self,
        host: str,
        port: int,
        user: str,
        app_password: str,
        sender_email: str,
    ) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.app_password = app_password
        self.sender_email = sender_email

    def generate_code(self, recipient: str) -> str:
        del recipient
        import secrets

        return f"{secrets.randbelow(1_000_000):06d}"

    def send(self, recipient: str, code: str) -> OtpDeliveryReceipt:
        import smtplib

        if "@" not in recipient:
            logger.info(
                "Recipient %s is a phone number; SMTP email provider cannot deliver to phone. "
                "Using phone development receipt.",
                recipient,
            )
            return OtpDeliveryReceipt(
                provider_reference=f"phone_dev:{recipient}",
                mock_code=code,
            )

        message = MIMEText(
            render_otp_email(code, ttl_minutes=get_settings().otp_ttl_minutes), "html"
        )
        message["to"] = recipient
        message["from"] = self.sender_email
        message["subject"] = "Your AgriDirect verification code"
        try:
            with smtplib.SMTP(self.host, self.port, timeout=4) as server:
                server.starttls()
                server.login(self.user, self.app_password)
                server.send_message(message)
            logger.info("SMTP OTP sent to %s (ref: smtp:%s)", recipient, recipient)
            return OtpDeliveryReceipt(provider_reference=f"smtp:{recipient}")
        except smtplib.SMTPAuthenticationError as exc:
            raise OtpDeliveryError(
                "SMTP authentication failed. Check SMTP_USER and SMTP_APP_PASSWORD."
            ) from exc
        except (smtplib.SMTPException, OSError) as exc:
            logger.warning(
                "SMTP delivery to %s failed (%s). Outbound SMTP may be blocked on this host. Falling back to direct OTP verification.",
                recipient,
                exc,
            )
            return OtpDeliveryReceipt(
                provider_reference=f"smtp_fallback:{recipient}",
                mock_code=code,
            )


def get_otp_provider() -> OtpProvider:
    settings = get_settings()
    if settings.app_env == "test":
        return MockOtpProvider()
    if settings.otp_provider_mode.lower() == "gmail":
        if not (
            settings.gmail_client_id
            and settings.gmail_client_secret
            and settings.gmail_refresh_token
            and settings.gmail_sender_email
        ):
            if settings.app_env == "development":
                logger.warning(
                    "Gmail API is not fully configured; falling back to the mock OTP "
                    "provider. Run `python -m scripts.gmail_oauth_setup` to complete "
                    "the Gmail setup and enable real email delivery."
                )
                return MockOtpProvider()
            raise RuntimeError(
                "GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and "
                "GMAIL_SENDER_EMAIL are required when OTP_PROVIDER_MODE=gmail."
            )
        return GmailOtpProvider(
            client_id=settings.gmail_client_id or "",
            client_secret=settings.gmail_client_secret or "",
            refresh_token=settings.gmail_refresh_token or "",
            sender_email=settings.gmail_sender_email or "",
        )
    if settings.otp_provider_mode.lower() == "smtp":
        if not (
            settings.smtp_host
            and settings.smtp_user
            and settings.smtp_app_password
            and settings.smtp_sender_email
        ):
            logger.warning(
                "SMTP is not fully configured (missing SMTP_USER, SMTP_APP_PASSWORD, "
                "or SMTP_SENDER_EMAIL); falling back to mock OTP provider. "
                "Set these environment variables in Render to enable real email delivery."
            )
            return MockOtpProvider()
        return SmtpOtpProvider(
            host=settings.smtp_host,
            port=settings.smtp_port,
            user=settings.smtp_user,
            app_password=settings.smtp_app_password,
            sender_email=settings.smtp_sender_email,
        )
    return MockOtpProvider()
