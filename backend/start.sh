#!/usr/bin/env bash
# Render startup script for the AgriDirect backend.
# 1. Run Alembic migrations to create/update database tables.
# 2. Start the Uvicorn server.
set -e

echo "==> Running database migrations..."
python -m alembic upgrade head || echo "==> Alembic note: proceeding to server start (tables handled by app startup)"
echo "==> Starting server..."

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
