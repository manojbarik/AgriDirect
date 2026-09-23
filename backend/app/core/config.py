from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "AgriDirect Marketplace API"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    host: str = "127.0.0.1"
    port: int = 8000

    database_url: str = (
        "postgresql+psycopg://marketplace:marketplace@localhost:5432/farmer_buyer_marketplace"
    )

    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_minutes: int = 15
    jwt_refresh_token_days: int = 30

    backend_cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:5175",
            "http://127.0.0.1:5175",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    # When True, the app trusts X-Forwarded-For from a reverse proxy for
    # client IP resolution (rate limiting, refresh audit log).
    trust_proxy_headers: bool = False

    log_level: str = "INFO"

    otp_provider_mode: str = "mock"

    # Gmail API (OAuth2) settings for email delivery.
    gmail_client_id: str = Field(
        default="",
        validation_alias=AliasChoices(
            "GMAIL_CLIENT_ID",
            "GOOGLE_GMAIL_CLIENT_ID",
        ),
    )

    gmail_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices(
            "GMAIL_CLIENT_SECRET",
            "GOOGLE_GMAIL_CLIENT_SECRET",
        ),
    )

    gmail_refresh_token: str = Field(
        default="",
        validation_alias=AliasChoices(
            "GMAIL_REFRESH_TOKEN",
            "GOOGLE_GMAIL_REFRESH_TOKEN",
        ),
    )

    gmail_sender_email: str = Field(
        default="",
        validation_alias=AliasChoices(
            "GMAIL_SENDER_EMAIL",
            "GMAIL_USER",
        ),
    )

    # SMTP settings for email delivery.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_app_password: str = ""
    smtp_sender_email: str = ""

    otp_ttl_minutes: int = 3
    otp_resend_cooldown_seconds: int = 30
    otp_resend_max_per_hour: int = 3

    password_reset_token_ttl_minutes: int = 30

    kyc_provider_mode: str = "mock"

    payment_provider_mode: str = "mock"
    payment_mock_mode: str = "success"
    payment_advance_percent: float = 20.0
    payment_fee_percent: float = 2.0
    payment_provider_key_id: str = ""
    payment_provider_key_secret: str = ""
    payment_webhook_secret: str = ""

    quality_confirmation_days: int = 2

    notification_provider_mode: str = "mock"
    delivery_provider_mode: str = "mock"

    # AI Assistant (Gemini)
    gemini_api_key: str = ""
    gemini_live_model: str = Field(
        default="gemini-2.5-flash",
        validation_alias=AliasChoices(
            "GEMINI_LIVE_MODEL",
            "GEMINI_MODEL",
        ),
    )
    gemini_voice: str = "Kore"

    # External search (Tavily)
    tavily_api_key: str = ""

    # Weather (OpenWeather)
    openweather_api_key: str = ""

    # AgriDirect API base URL for external webhooks/assistant
    agridirect_api_url: str = Field(
        default="http://127.0.0.1:8000",
        validation_alias=AliasChoices(
            "AGRIDIRECT_API_URL",
            "API_URL",
        ),
    )

    # WhatsApp (future integration)
    whatsapp_api_key: str = ""
    whatsapp_phone_id: str = ""

    # Telephony (future integration)
    telephony_provider_key: str = ""

    # Transparent trust score engine configuration.
    trust_calculation_version: str = "v1"
    trust_verification_weight: float = 20.0
    trust_transaction_weight: float = 25.0
    trust_quality_weight: float = 20.0
    trust_rating_weight: float = 20.0
    trust_dispute_weight: float = 15.0
    trust_orders_for_full_credit: int = 10
    trust_rating_target: float = 5.0
    trust_history_limit: int = 50

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]
        return value

    @field_validator("database_url", mode="after")
    @classmethod
    def resolve_database_url(cls, value: str) -> str:
        """
        Normalize database URLs for SQLAlchemy.

        Local development can use SQLite.

        Render can provide:
            postgresql://...

        This converts it to:
            postgresql+psycopg://...

        because this project uses Psycopg 3.
        """

        value = value.strip()

        # -----------------------------------------
        # SQLite
        # -----------------------------------------
        if value.startswith("sqlite:///"):
            if (
                not value.startswith("sqlite:////")
                and value != "sqlite:///:memory:"
            ):
                raw_path = value[len("sqlite:///") :]

                backend_dir = (
                    Path(__file__).resolve().parent.parent.parent
                )

                resolved_file = (backend_dir / raw_path).resolve()

                return f"sqlite:///{resolved_file}"

            return value

        # -----------------------------------------
        # PostgreSQL normalization
        # -----------------------------------------
        # Render, Cloud SQL, Supabase, and common setup variations provide:
        #   postgres://...
        #   postgresql://...
        # or users accidentally configure:
        #   postgresql+postgresql://...
        #   postgresql+psycopg2://...
        # Since this project uses Psycopg 3 (psycopg[binary]),
        # normalize all these to postgresql+psycopg://...
        for prefix in (
            "postgresql+postgresql://",
            "postgresql+psycopg2://",
            "postgresql://",
            "postgres://",
        ):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix) :]

        # -----------------------------------------
        # Already normalized PostgreSQL URL
        # -----------------------------------------
        if value.startswith("postgresql+psycopg://"):
            return value

        # -----------------------------------------
        # Unknown/other database URL
        # -----------------------------------------
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()