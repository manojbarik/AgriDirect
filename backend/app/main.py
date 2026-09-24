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

def _ensure_database_ready(settings) -> None:
    # 1. Try Alembic upgrade
    try:
        backend_dir = Path(__file__).resolve().parent.parent
        ini_path = backend_dir / "alembic.ini"
        if ini_path.exists():
            alembic_cfg = Config(str(ini_path))
            alembic_cfg.set_main_option("script_location", str(backend_dir / "migrations"))
            alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations applied successfully via Alembic")
    except Exception as exc:
        logger.warning("Alembic upgrade note: %s; ensuring tables with Base.metadata.create_all", exc)

    # 2. Guarantee all tables exist via SQLAlchemy metadata
    try:
        from app.db.base import Base
        from app.db.session import engine

        Base.metadata.create_all(bind=engine)
        logger.info("Base metadata tables verified/created successfully")
    except Exception as exc:
        logger.error("Base metadata create_all error: %s", exc)

    # 3. Seed initial crops if catalog is empty (non-test environments)
    if settings.app_env != "test":
        try:
            from sqlalchemy import func, select
            from app.db.models.marketplace import Crop
            from app.db.session import SessionLocal

            with SessionLocal() as db:
                count = db.scalar(select(func.count(Crop.id)))
                if count == 0:
                    default_crops = [
                        Crop(name="Tomato", variety="Hybrid", category="Vegetables", default_unit="kg"),
                        Crop(name="Potato", variety="Jyoti", category="Vegetables", default_unit="kg"),
                        Crop(name="Onion", variety="Red Nashik", category="Vegetables", default_unit="kg"),
                        Crop(name="Wheat", variety="Sharbati", category="Grains", default_unit="quintal"),
                        Crop(name="Rice", variety="Basmati 1121", category="Grains", default_unit="quintal"),
                        Crop(name="Cotton", variety="Bt Cotton", category="Cash Crops", default_unit="quintal"),
                        Crop(name="Soybean", variety="JS-335", category="Oilseeds", default_unit="quintal"),
                        Crop(name="Maize", variety="Sweet Corn", category="Grains", default_unit="quintal"),
                        Crop(name="Mango", variety="Alphonso", category="Fruits", default_unit="kg"),
                        Crop(name="Banana", variety="Robusta", category="Fruits", default_unit="dozen"),
                        Crop(name="Green Chilli", variety="G-4", category="Vegetables", default_unit="kg"),
                        Crop(name="Mustard", variety="Pusa Bold", category="Oilseeds", default_unit="quintal"),
                    ]
                    db.add_all(default_crops)
                    db.commit()
                    logger.info("Initial crop catalog seeded (%d crops)", len(default_crops))
        except Exception as exc:
            logger.warning("Initial crop catalog seeding note: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    settings = get_settings()
    security.get_jwt_secret()

    _ensure_database_ready(settings)

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
        allow_origin_regex=r"^https:\/\/.*(\.onrender\.com|\.vercel\.app|\.netlify\.app|\.pages\.dev)$",
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
