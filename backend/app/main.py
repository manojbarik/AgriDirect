import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.modules.identity import security

logger = logging.getLogger(__name__)

_PROVIDER_MODES = (
    "otp_provider_mode",
    "kyc_provider_mode",
    "payment_provider_mode",
    "notification_provider_mode",
    "delivery_provider_mode",
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    settings = get_settings()
    security.get_jwt_secret()

    # Automatically run pending database migrations on startup
    try:
        backend_dir = Path(__file__).resolve().parent.parent
        ini_path = backend_dir / "alembic.ini"
        if ini_path.exists():
            alembic_cfg = Config(str(ini_path))
            alembic_cfg.set_main_option("script_location", str(backend_dir / "migrations"))
            alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations applied successfully")
    except Exception as exc:
        logger.warning("Startup database migration check note: %s", exc)

    if settings.app_env not in ("development", "test"):
        for name in _PROVIDER_MODES:
            if getattr(settings, name) == "mock":
                logger.warning(
                    "%s is 'mock' in %s environment; mock providers are for development only",
                    name.upper(),
                    settings.app_env,
                )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Foundation API for the AI Farmer-Buyer Marketplace.",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_origin_regex=r"^https:\/\/.*\.onrender\.com$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(self), camera=()"
        response.headers[
            "Content-Security-Policy"
        ] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        return response

    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()
