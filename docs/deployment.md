# Deployment

Phase 24 prepares the application for deployment: Dockerized backend and frontend, a
PostgreSQL-backed composition, health checks, and a documented environment/secret policy.
**The default configuration runs mock providers only and never touches real money.**

## 1. Architecture of the deployment

```
┌───────────────┬───────────────────────────────┬────────────────┐
│  CLIENT       │  FRONTEND (Nginx)              │                │
│  Browser ─────►  static SPA  :80               │                │
│               │  /api/v1/* ── proxy ───────────┼──► BACKEND     │
│               └───────────────────────────────┼──► Uvicorn:8000 │
│                                                │  app/main:app  │
│                                                ├──► PostgreSQL  │
└────────────────────────────────────────────────┴────────────────┘
```

- **Frontend**: Node build stage → static files in Nginx; `/api/v1` reverse-proxied to the
  backend (same-origin API calls, no CORS needed in that path).
- **Backend**: FastAPI served by Uvicorn (2 workers), runs `alembic upgrade head` before start.
- **Database**: PostgreSQL 16 (named volume, health-gated start).
- **ML**: trained artifacts (`ml/models/*.joblib` + metadata) are **baked into the image** at
  build time and loaded lazily + cached at runtime (`ml/models/` path resolved from the repo
  layout). The backend never retrains at serve time in production.

## 2. Local development (no Docker)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
# ML tests/eval deps come from requirements-dev.txt; evaluate models with:
#   python -m ml.evaluation.compare   (run from the repo root with the venv)

cd frontend
npm install
npm run dev            # :5173, proxies /api/v1 → 127.0.0.1:8001
```

## 3. Docker Compose (recommended)

```bash
cp .docker.env.example .env      # edit JWT_SECRET_KEY for production
docker compose up --build
```

- Frontend → `http://localhost:8080` (SPA that calls same-origin `/api/v1`).
- Backend → `http://localhost:8000` (Swagger at `/docs`).
- PostgreSQL runs internally; migrations applied automatically before the backend starts.
- Health checks: PostgreSQL `pg_isready`, backend `GET /api/v1/health` (URLLib probe),
  frontend Nginx `wget` through the `/api/v1/health` proxy.

To validate the rendered Compose configuration without building:

```bash
docker compose config            # resolves variables, validates YAML + interpolation
docker compose config --quiet    # exit 0 = valid
```

## 4. Environment variable reference

| Variable | Required (prod) | Description |
| --- | --- | --- |
| `APP_ENV` | yes | `development` (safe defaults) — set `production` in real deployments |
| `DATABASE_URL` | yes | SQLAlchemy URL. For local dev default: `sqlite:///./marketplace_dev.db`; compose uses `postgresql+psycopg://user:pass@db:5432/db` |
| `JWT_SECRET_KEY` | **yes, strong** | HS256 signing secret. `openssl rand -hex 32`. Refused startup when insecure outside dev/test |
| `JWT_ALGORITHM` | no | pinned `HS256` (any other value refused) |
| `JWT_ACCESS_TOKEN_MINUTES` | no | default 15 |
| `JWT_REFRESH_TOKEN_DAYS` | no | default 30 |
| `BACKEND_CORS_ORIGINS` | yes | comma-separated frontend origins for direct (non-proxy) calls |
| `TRUST_PROXY_HEADERS` | yes* | `true` only when behind a trusted proxy/LB; `false` otherwise (*= correctness of IP rate limits) |
| `LOG_LEVEL` | no | `INFO`/`DEBUG`/`WARNING` |
| `OTP_PROVIDER_MODE` | no | `mock` only (production: disable mock) |
| `KYC_PROVIDER_MODE` | no | `mock` only |
| `PAYMENT_PROVIDER_MODE` | no | `mock` only — **real providers require explicit selection + credentials** |
| `PAYMENT_MOCK_MODE` | no | `success` / `fail` (mock behavior) |
| `PAYMENT_WEBHOOK_SECRET` | yes* | required to accept payment webhooks outside dev/test |
| `NOTIFICATION_PROVIDER_MODE` | no | `mock` only |
| `DELIVERY_PROVIDER_MODE` | no | `mock` only |
| `VITE_API_BASE_URL` | no | frontend build arg; empty = same-origin `/api/v1` |

> **ML model path**: `ml/models/` is resolved relative to the repository root layout
> (`app/__init__.py` adds the workspace root to `sys.path`); inside the image it is
> `/srv/ml/models`. No domain-specific setting is required. Models must exist at image build.

## 5. Production checklist

1. **Secrets**: generate `JWT_SECRET_KEY` (`openssl rand -hex 32`), `PAYMENT_WEBHOOK_SECRET`,
   and DB password; pass them via a secrets manager or a git-ignored `.env`. **Never** commit
   them or the example placeholder.
2. **Environment**: `APP_ENV=production`; `BACKEND_CORS_ORIGINS` = real frontend origin(s).
3. **Proxy**: put the frontend (or your LB) in front of everything; set `TRUST_PROXY_HEADERS=true`
   only behind it; do **not** expose the backend or DB publicly.
4. **Payments**: keep `PAYMENT_PROVIDER_MODE=mock` unless real provider credentials and
   configuration are explicitly supplied. With mock + production env the app logs a startup
   warning; webhooks require a signature secret.
5. **Health**: monitor `/api/v1/health` (returns `{"status":"ok","database":"ok"}`).
6. **Migrations**: generated by `alembic upgrade head` on backend start (idempotent, guarded
   against missing `DATABASE_URL` SQLite dev-init confusion in production).
7. **Scale-out items** (future): Redis-backed rate limiting — current throttles are
   process-local; `httpOnly`-cookie token storage.

## 6. Backend production configuration notes

- Uvicorn command: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2`
  (no `--reload`). For higher concurrency use more workers or a process manager.
- `app/main.py` checks, at startup: JWT secret policy, mock-provider warnings; config is
  read from environment (`.env` file support exists for local use only).
- CORS: explicit allow-list (never `*` with credentials); security headers on every response.

## 7. Verifying a deployment

| Check | Command / URL | Expected |
| --- | --- | --- |
| Compose validity | `docker compose config --quiet` | exit 0 |
| DB health | compose health events | PostgreSQL healthy |
| Backend health | `curl http://localhost:8000/api/v1/health` | `{"status":"ok","database":"ok"}` |
| Frontend serves | `curl -I http://localhost:8080/` | `200` + SPA index |
| Proxy works | `curl http://localhost:8080/api/v1/health` | same health body |
| ML serves | `POST /api/v1/ai/price-prediction` | price + `model_version` |
| Migration applied | `psql -c "\dt"` | marketplace tables present |

## 8. Security posture

See [authentication.md](authentication.md) and `docs/PHASE-21-SECURITY-AUDIT.md`. Phase 24 adds:
secrets handled only through env (no baked-in secrets), non-root production users, health
checks (no debug endpoints), and an explicit provider policy that **never enables real
payments without supplied credentials**.