# AI Farmer-Buyer Marketplace — Backend image
# Runtime layout mirrors the repo so the app's sys.path bootstrap
# (app/__init__.py → REPO_ROOT) resolves to /srv with ml/ present.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# libgomp1 is required by LightGBM on Debian.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/backend

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

# Copy the ML workspace next to the repo root as expected by app/__init__.py
COPY ml /srv/ml

ENV APP_ENV=production \
    LOG_LEVEL=INFO

RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /srv/backend /srv/ml
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4).status==200 else 1)"

# Migrations run before app start; override APP_ENV / JWT_SECRET_KEY at runtime.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]