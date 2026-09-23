"""System integration health endpoint.

Returns the configuration status of each external service.
NEVER returns actual credentials or secret values.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter(prefix="/system", tags=["system"])


class IntegrationStatus(BaseModel):
    gemini: str
    weather: str
    tavily: str
    smtp: str
    whatsapp: str
    telephony: str
    database: str


@router.get(
    "/integrations",
    response_model=IntegrationStatus,
    summary="Get configuration status of external service integrations (never returns secrets)",
)
def get_integrations() -> IntegrationStatus:
    settings = get_settings()
    return IntegrationStatus(
        gemini="configured" if settings.gemini_api_key else "not_configured",
        weather="configured" if settings.openweather_api_key else "not_configured",
        tavily="configured" if settings.tavily_api_key else "not_configured",
        smtp="configured" if settings.smtp_user and settings.smtp_app_password else "not_configured",
        whatsapp="configured" if settings.whatsapp_api_key and settings.whatsapp_phone_id else "not_configured",
        telephony="configured" if settings.telephony_provider_key else "not_configured",
        database="configured" if settings.database_url else "not_configured",
    )


@router.get(
    "/db-status",
    summary="Get database connectivity and table status (never returns passwords)",
)
def get_db_status(init_tables: bool = False) -> dict:
    import urllib.parse
    from app.db.base import Base
    from app.db.session import engine
    from sqlalchemy import inspect

    settings = get_settings()
    parsed = urllib.parse.urlparse(settings.database_url)
    is_sqlite = "sqlite" in parsed.scheme

    if is_sqlite:
        safe_url = f"{parsed.scheme}://{parsed.path}"
        host = "sqlite (local file)"
    else:
        safe_url = f"{parsed.scheme}://{parsed.username or ''}:***@{parsed.hostname}:{parsed.port}{parsed.path}"
        host = parsed.hostname or "unknown"

    if init_tables:
        try:
            Base.metadata.create_all(bind=engine)
        except Exception:
            pass

    connected = False
    table_count = 0
    tables: list[str] = []
    error: str | None = None

    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        table_count = len(tables)
        connected = True
    except Exception as exc:
        error = str(exc)

    return {
        "connected": connected,
        "database_url_safe": safe_url,
        "host": host,
        "is_localhost": host in ("localhost", "127.0.0.1"),
        "table_count": table_count,
        "tables_sample": tables[:10],
        "error": error,
        "ready": connected and table_count > 0,
    }

