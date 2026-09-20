# Architecture

The **AI Farmer-Buyer Marketplace** is a three-tier web application with a dedicated ML
workspace and a pluggable integrations layer. This document describes the components, module
boundaries, data flow, and the AI/ML engine.

## 1. System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND  (frontend/)                                                      │
│  React + TypeScript + Vite + Tailwind CSS + React Router + Axios + Recharts │
│  Roles: Farmer, Buyer, Admin · protected routes + role guards                │
│  Dev: Vite on :5173 with /api/v1 proxy → backend · Prod: Nginx static build  │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ JSON over HTTPS · Authorization: Bearer <JWT>
┌─────────────────────────────▼───────────────────────────────────────────────┐
│  BACKEND  (backend/)                                                         │
│  FastAPI app = create_app() (app/main.py)                                    │
│  ├─ app/core        config(env), logging(redaction), rate_limit, security    │
│  │                  headers middleware, CORS                                 │
│  ├─ app/api         router assembly + /api/v1/health                         │
│  ├─ app/modules     identity, farmer, buyer, marketplace, orders, payments,  │
│  │                  batches, disputes, trust, ratings, notifications, ai,    │
│  │                  admin, admin_dashboard                                   │
│  ├─ app/integrations otp, payment, kyc, notification, delivery (mock)        │
│  ├─ app/db          models, session, base (Alembic migrations)               │
│  └─ app/services    cross-cutting helpers (e.g., internal notifications)     │
└──────────────┬──────────────────────────────┬───────────────────────────────┘
               │                              │
    ┌──────────▼──────────┐        ┌──────────▼──────────┐
    │ DATABASE            │        │ ML WORKSPACE (ml/)   │
    │ SQLite (dev)        │        │ models/price + demand│
    │ PostgreSQL (target) │        │ evaluation/ compare  │
    └─────────────────────┘        │ demand/ models       │
                                   └──────────────────────┘
```

## 2. Components

### 2.1 Frontend (`frontend/`)

- **Entry**: `index.html` → `src/main.tsx`, routes under `src/pages`.
- **Auth layer** (`src/lib/auth.ts`): token storage, login/register helpers,
  `apiErrorMessage`, phone validation/normalization.
- **HTTP layer** (`src/lib/api-client.ts`): Axios instance with base URL `VITE_API_BASE_URL`
  (or `/api/v1` proxy), request token injection, response error normalization, and a
  **silent refresh-on-401** interceptor that exempts only the real auth-flow URLs.
- **Routing**: `ProtectedRoute` (auth), `FarmerRoute`/`BuyerRoute` (roles), `AdminRoute`.
- **UI**: Tailwind CSS; statistics rendered with Recharts (admin dashboard).

### 2.2 Backend (`backend/`)

- **App factory** (`app/main.py`) wires CORS (explicit origins), a security-headers HTTP
  middleware, the module router tree under `/api/v1`, and a lifespan that configures logging,
  validates the JWT secret policy, and warns on mock providers in non-dev.
- **Module pattern**: each domain lives in `app/modules/<domain>/` with `router.py` (HTTP),
  `service.py` (business logic), `schemas.py` (Pydantic I/O), and models in `app/db/models/`.
  Routers are thin; services hold the workflow and transactional logic.
- **Cross-cutting**:
  - `app/core/config.py` — Pydantic `Settings` from env/`.env`
    (`.env` then `../.env`).
  - `app/core/rate_limit.py` — in-process sliding-window limiter + `client_ip()`.
  - `app/core/logging.py` — JSON logs with a redaction filter.
  - `app/core/security_utils/…` and identity `security.py` — JWT & bcrypt.

### 2.3 Model layer / database

SQLAlchemy 2.0 ORM models grouped by domain; Alembic migrations under
`backend/migrations/versions/`. Dev uses a default SQLite file (`marketplace_dev.db`);
production targets PostgreSQL. See [database.md](database.md).

### 2.4 ML workspace (`ml/`)

- `data/` synthetic crop-price dataset (seeded, reproducible).
- `demand/` synthetic demand dataset + its train/evaluate/predict pipeline.
- `preprocessing.py`, `train.py`, `predict.py`, `evaluate.py` — price pipeline.
- `models/*.joblib` + metadata JSON — **served** by the API (not trained inside the API).
- `evaluation/` — Phase 22 formal comparison runner (`python -m ml.evaluation.compare`)
  emitting `reports/` tables + plots and re-exporting the selected models.

## 3. Domain Boundaries

| Module | Responsibility | Owns | Writes | Consumers |
| --- | --- | --- | --- | --- |
| identity | register/login/OTP/JWT | OtpChallenge, RefreshToken | users | all |
| farmer | profiles, farms, crop plans, listings, verification | FarmerProfile, Farm, CropPlan, Listing | — | marketplace, orders |
| buyer | profiles, payment method, demands, verification | BuyerProfile, BuyerDemand | — | marketplace, orders, ai |
| marketplace | public catalog, locations, listing search | — (views) | — | public |
| orders | negotiation + order lifecycle | Order, OrderStatusEvent | — | payments, batches, disputes |
| payments | intents, capture, refunds, settlements, payouts | Payment, Refund, Settlement, Payout | Order | orders, transactions |
| batches | QR batches, quality checks, delivery, pickup | CropBatch, QualityCheck, Delivery | Order | payments |
| storage | sell-now vs store-then-sell decision + demo facility directory | — (computed) | — | ai (forecast fallback) |
| disputes | raise/review/resolve, replacements | Dispute, Replacement | Payment | admin |
| trust | explainable score + history | TrustScore, TrustScoreHistory | — | ratings |
| ratings | two-way reviews on completed orders | Rating | TrustScore | trust |
| notifications | inbox | Notification | — | orders, payments, admin |
| ai | price/demand predictions + matching audit | AiPrediction | — | public |
| admin + dashboard | verification, moderation, analytics | — | — | all read |

## 4. Core Data Flows

### 4.1 Order-to-payment flow

```
ACCEPTED → (buyer advance intent + provider capture) → CONFIRMED
CONFIRMED → batch prepared → quality check → pickup → DELIVERED
DELIVERED → buyer confirms receipt (quality confirmation window) → QUALITY_CHECK
QUALITY_CHECK → buyer balance intent + capture → COMPLETED
COMPLETED → settlement released → farmer payout
```

Failure/cancellation can route to `CANCELLED`, `REFUNDED`, or `DISPUTED`. Notifications are
emitted at every transition; the payment webhook is signature-verified and idempotent by
`event_id`.

### 4.2 AI predictions

- `POST /ai/price-prediction` → feature row built from request → forecasts from the loaded
  `price_prediction_model.joblib` → price + confidence range; audit `AiPrediction` row.
- `POST /ai/demand-prediction` → `demand_model.joblib` → demand + range.
- `POST /ai/match/farmers` / `POST /ai/match/buyers` → hybrid scoring ranker over live
  listings/demands.
- `GET /ai/public/price-preview` / `GET /ai/public/crops` → anonymous price preview powering the
  public **Market Prices** page (`/prices`) with a Recharts 5-day projected trend.
- `POST /storage/recommendation` → SELL NOW vs STORE THEN SELL comparison; when no predicted
  price is supplied it reuses `POST /ai/price-prediction` internally for the future price.

Models are loaded lazily (joblib) and cached in-process; missing artifacts trigger training.

## 5. Security Architecture

- **AuthZ**: role gate `require_roles("FARMER"|"BUYER"|"ADMIN")` per router; ownership checks
  raise 404 (no object enumeration).
- **AuthN**: JWT access (15 min) + rotating refresh (30 days, hashed), OTP verification for
  phone, bcrypt password hashing with per-phone failure lockout.
- **Transport/API**: CORS allow-list, security headers, redacting JSON logs, rate limiting
  (`login`, `register`, `otp/*`, `ai/*`), fail-fast JWT secret policy outside dev/test.

See [authentication.md](authentication.md) and `docs/PHASE-21-SECURITY-AUDIT.md`.

## 6. AI/ML Engine Architecture

```
                          AI/ML ENGINE
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      PRICE AI       MATCHING AI     DEMAND AI
          │              │              │
          ▼              ▼              ▼
     Regression       Ranking        Forecasting
          │              │              │
     LightGBM*        Hybrid        LightGBM*
                      Scoring
     (* Phase 22 winner; served from ml/models/)
```

- **PRICE AI** — regression (LightGBM, Phase 22 winner) → `₹/kg` + confidence range.
- **DEMAND AI** — forecasting (LightGBM, Phase 22 winner) → `kg/month` + range.
- **MATCHING AI** — explainable hybrid scoring (relevance × farmer/buyer intent + availability
  weighting), not a trained model.

## 7. Repository Layout

```
.
├── README.md
├── .env.example            # documented env reference (no secrets)
├── backend/
│   ├── app/                # FastAPI application
│   ├── migrations/         # Alembic
│   ├── tests/              # pytest suite
│   └── Dockerfile          # Phase 24
├── frontend/
│   ├── src/
│   ├── tests/              # Vitest + Testing Library
│   ├── Dockerfile          # Phase 24 (multi-stage → Nginx)
│   └── nginx.conf          # Phase 24
├── ml/
│   ├── data/ demand/ models/ evaluation/ reports/ tests/
├── database/               # SQL / migration validation helpers
├── docs/
└── docker-compose.yml      # Phase 24
```

## 8. Deployment View

Phase 24 packages the backend (Uvicorn, production config) and frontend (static build served
by Nginx) as containers, backed by a PostgreSQL service with health checks and documented
environment/secrets handling. See [deployment.md](deployment.md).