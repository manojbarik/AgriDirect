# KRISHILINK AI — AgriDirect

> **Project codename:** KRISHILINK AI (Smart India Hackathon 2026). The branded UI shows
> **AgriDirect**, an Intelligent Farmer–Buyer Ecosystem. This doc uses the KRISHILINK AI
> codename for the project and references AgriDirect for the user-facing product.

A full-stack agricultural marketplace that connects **farmers** and **buyers** end to end:
discovery, negotiation, order management, payments, quality management, delivery, disputes,
trust scoring, ratings, notifications, and an admin dashboard — powered by trained ML models
for crop-price prediction and demand forecasting, plus a transparent hybrid farmer–buyer
matching engine.

> **Stage:** Phase 24 complete. Phases 1–20 built the platform end to end; Phase 21 hardened
> security; Phase 22 formally evaluated and selected the ML models (LightGBM for price and
> demand); Phase 23 produced this professional documentation set; Phase 24 packaged the
> application for deployment (Dockerfiles + docker-compose, PostgreSQL-backed, health checks,
> mock providers only). Phase 25 added the missing SIH-2026 feature set: storage intelligence
> (sell-now vs store-then-sell), a public market-prices/intelligence page, and QR-keyed batch
> traceability. Next: Phase 26 (Production Hardening).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Database](#database)
- [API](#api)
- [ML Methodology](#ml-methodology)
- [Model Evaluation](#model-evaluation)
- [Security](#security)
- [Installation](#installation)
- [Running](#running)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Limitations](#limitations)
- [Future Enhancements](#future-enhancements)

---

## Project Overview

Farmers publish crop supply and production intent; buyers publish crop demand and purchase
intent. The platform mediates every step of a transaction through a controlled, auditable
workflow — from a public, searchable marketplace and ML-assisted price/demand forecasts, to
negotiation, advance + balance escrow-style payments, batch quality checks, delivery
confirmation, disputes, and two-way reviews. Every user has a transparent, explainable trust
score, and an admin dashboard closes the loop with verification, moderation, and analytics.

## Problem Statement

Indian agriculture suffers from **information asymmetry and trust gaps** between farmers and
buyers:

- Farmers often sell at unfair prices because they lack transparent, timely market price
  information and a wide buyer network.
- Buyers struggle to discover reliable, quality-assured supply.
- Short-sighted or low-volume marketing channels leave demand signals unused.
- Cross-party disputes (quality, delivery, payment) are slow, opaque, and rarely auditable.
- There is no transparent, data-driven signal of a counterparty's reliability.

This project addresses these gaps with a structured digital marketplace, ML-assisted price
and demand insights, a transparent matching engine, and an auditable transaction lifecycle.

## Objectives

1. **Transparent price discovery** — ML price forecasts per crop, variety, location, and month.
2. **Demand visibility** — ML demand forecasts so farmers can match production to market pull.
3. **Efficient matching** — rank listings vs. demands fairly using explainable, criteria-driven
   scores (hybrid scoring, not a black box).
4. **Controlled transactions** — negotiation, orders, advance + balance payment workflow,
   quality inspection, delivery confirmation.
5. **Trust and fairness** — explainable trust scores, two-way ratings, auditable dispute
   resolution, and an ADMIN moderation layer.
6. **Security and correctness** — hardened authentication, rate limiting, webhook-signature
   enforcement, and a formal, data-driven ML model selection (Phase 21/22).

## Features

- **Public marketplace**: crop catalog, location facets, searchable/filtered/sorted/paginated
  listings, farmer profile pages.
- **Farmer** onboarding: profile, farms, crop plans, listings (publish/pause/cancel), order
  fulfillment, quality checks, delivery, and dashboard.
- **Buyer** onboarding: profile, payment-method verification, demands (CRUD), purchasing,
  delivery confirmation, reviews.
- **AI engine** (`/api/v1/ai/*`): price prediction, demand prediction, farmer↔buyer matching.
- **Market prices & intelligence** (`/prices`, public): expected crop price, range, confidence,
  a 5-day projected trend, and nearby-market context powered by the public AI endpoints
  (`/ai/public/price-preview`, `/ai/public/crops`).
- **Storage intelligence** (`/api/v1/storage/*`, farmer page `/farmer/storage`): compares
  **SELL NOW** vs **STORE THEN SELL** using the expected price, storage cost, expected loss and
  transaction cost — including breakeven storage days and a demo storage-facility directory.
- **Order lifecycle**: create → negotiate (accept/reject/counter) → confirm on advance payment →
  quality check → delivery → complete.
- **Payments** (pluggable provider, **mock in all current deployments**): advance + balance
  intents, provider capture, webhooks (signature-verified), refunds, settlements, payouts.
- **Quality management**: QR-keyed crop batches (`qr_identifier` per batch, e.g.
  `AGRI:<batch_code>:<id>` rendered as a scannable QR on the farmer's batch detail),
  inspection, pickup, delivery, buyer receipt confirmation.
- **Disputes**: raise, evidence-bounded review, admin resolution, replacement workflow.
- **Trust score**: five explainable weighted components (verification, transaction, quality,
  rating, dispute); admin recalculation.
- **Ratings & reviews**: two-way, once per order pair, completed orders only.
- **Notifications**: read/unread inbox + unread count.
- **Admin dashboard**: overall stats and per-entity analytics (users, listings, demands, orders,
  payments, deliveries, quality checks, refunds, reviews, AI activity, verification queue).

## Architecture

The system is a **three-tier web application** with a separate ML workspace:

```
┌────────────────────────────────────────────────────────────────────┐
│  FRONTEND  React + Vite + TypeScript + Tailwind + Recharts          │
│  Port 5173 (dev, Vite proxy → backend) · production served by Nginx │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTPS / JSON over Axios (JWT bearer)
┌───────────────────────────────▼────────────────────────────────────┐
│  BACKEND  FastAPI + SQLAlchemy 2 + Alembic (Port 8001 dev)          │
│  app/modules/*  identity, farmer, buyer, marketplace, orders,       │
│     payments, batches, disputes, trust, ratings, notifications, ai, │
│     storage, admin, admin-dashboard                                 │
│  app/core       config, security headers, rate limiting, logging    │
│  app/integrations  otp, payment, kyc, notification, delivery (mock) │
└───────────────┬──────────────────────────────┬─────────────────────┘
                │                              │
        ┌───────▼────────┐            ┌────────▼─────────┐
        │   DATABASE      │            │  ML WORKSPACE    │
        │   PostgreSQL    │            │  ml/ (str)       │
        │   (SQLite dev)  │            │  price, demand   │
        └─────────────────┘            │  match           │
                                       └──────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for component breakdown, module boundaries,
data flow, and the AI/ML engine.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.14, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, Uvicorn |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Recharts |
| Database | PostgreSQL (production/target), SQLite (local dev) |
| ML | scikit-learn, XGBoost, LightGBM, Pandas, NumPy, Joblib |
| Auth | JWT (HS256, pinned algorithm + audience) access/refresh rotation, bcrypt, mock OTP |
| Deployment | Docker Compose (Phase 24), Nginx (frontend), Gunicorn/Uvicorn (backend) |
| Quality | ruff, mypy-compatible typing, pytest (backend+ML), Vitest + Testing Library (frontend) |

## Database

Core domains: people (users/profiles), marketplace (crops, listings, demands, orders),
transaction (payments, settlements, payouts, refunds, disputes, quality checks, deliveries),
social (trust scores, ratings, notifications), identity (OTP challenges, refresh tokens),
admin (AI prediction audit).

See [docs/database.md](docs/database.md) for the full schema, ER summary, and migration notes.

## API

Interactive docs are available at **`http://127.0.0.1:8001/docs`** (Swagger). The complete
endpoint reference is in [docs/api.md](docs/api.md). Base path: `/api/v1`.

## ML Methodology

- **Price prediction** — regression over crop/variety/category/state/district/mandi/month/
  season/grade/quantity, demand index, and historical average price. Candidates: Linear
  Regression, Random Forest, XGBoost, LightGBM.
- **Demand forecasting** — regression over crop, location, season, month, buyer type, price
  elasticity, and historical demand. Candidates: historical baseline, Random Forest, XGBoost,
  LightGBM.
- **Matching** — a transparent hybrid-scoring ranker (relevance + buyer/farmer intent), not a
  trained ML model.

Details: [docs/ml-price-prediction.md](docs/ml-price-prediction.md),
[docs/ml-demand-prediction.md](docs/ml-demand-prediction.md),
[docs/ai-matching.md](docs/ai-matching.md).

## Model Evaluation

Phase 22 formally compared all candidates on a 70/15/15 split with a held-out test set and a
documented selection rule (no "most advanced wins" bias). Results:

| Forecast | Winner | Key held-out metrics |
| --- | --- | --- |
| Price (INR/kg) | **LightGBM** | test R² 0.9844, MAE 2.17, RMSE 3.15 |
| Demand (kg/month) | **LightGBM** | test MAPE 7.52% (beats historical baseline by ~75% rel RMSE) |

Reproduce: `python -m ml.evaluation.compare`. Full rationale + tables + plots in
[docs/ml-price-prediction.md](docs/ml-price-prediction.md) and
[docs/ml-demand-prediction.md](docs/ml-demand-prediction.md).

## Security

Phase 21 hardened the platform: fail-fast JWT secret policy, pinned HS256 + audience claim,
rate limiting on auth/AI endpoints, per-phone login lockout, OTP resend throttling, payment
webhook signature enforcement, login timing equalization, log redaction, security headers, and
opt-in trusted-proxy IP handling. See [docs/authentication.md](docs/authentication.md),
[docs/deployment.md](docs/deployment.md), and `docs/PHASE-21-SECURITY-AUDIT.md`.

## Installation

Prerequisites: Python 3.11+ and Node 20+.

```bash
git clone <repo-url> "SIH PROJECT 2026" && cd "SIH PROJECT 2026"

# Backend + ML dependencies
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cd ..

# Frontend
cd frontend
npm install
```

## Running

Local development (full guide in [docs/deployment.md](docs/deployment.md)):

```bash
# 1. Set environment (defaults are ready for local use)
cp .env.example .env          # edit if needed

# 2. Backend on :8001 (SQLite, auto-migrate + seed on import)
cd backend && source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# 3. Frontend on :5173 (proxies /api/v1 → 127.0.0.1:8001)
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`. API health: `GET http://127.0.0.1:8001/api/v1/health`.
Swagger: `http://127.0.0.1:8001/docs`.

**Docker Compose** (PostgreSQL-backed local orchestration, recommended for previews):

```bash
cp .docker.env.example .env   # edit JWT_SECRET_KEY for production
docker compose up --build
# Frontend http://localhost:8080 · Backend http://localhost:8000
```

## Environment Variables

All configuration lives in environment variables (see `backend/app/core/config.py`). A
starter file with every documented variable is in `.env.example`. **Never commit a real `.env`.**
Database URLs, JWT secrets, CORS origins, provider modes, and the webhook secret are the
critical items. See [docs/deployment.md](docs/deployment.md) for the reference table.

## Testing

```bash
cd backend && .venv/bin/python -m pytest -q        # 250 backend tests
cd .. && backend/.venv/bin/python -m pytest ml/tests -q   # 25 ML tests (run from repo root)
cd frontend && npm test                              # 66 frontend tests
cd frontend && npm run lint && npm run build         # static checks + prod build
```

See [docs/testing.md](docs/testing.md).

## Deployment

Phase 24 provides production-ready artifacts: backend + frontend Dockerfiles, a
`docker-compose.yml` for PostgreSQL-backed local orchestration, health checks, and deployment
instructions. Real payment providers remain disabled-by-default: **no real payment
functionality is deployed unless explicit provider credentials are supplied.** See
[docs/deployment.md](docs/deployment.md).

## Documentation

| Doc | Covers |
| --- | --- |
| [architecture.md](docs/architecture.md) | components, boundaries, data flow, AI/ML engine |
| [database.md](docs/database.md) | schema, ER, migrations |
| [api.md](docs/api.md) | full endpoint reference |
| [authentication.md](docs/authentication.md) | register/login/OTP/JWT/roles/security |
| [marketplace.md](docs/marketplace.md) | catalog, listings, search, matching entry points |
| [payment-flow.md](docs/payment-flow.md) | advance + balance, capture, settlement, refunds, webhooks |
| [quality-management.md](docs/quality-management.md) | batches, inspections, delivery, confirmation |
| [dispute-management.md](docs/dispute-management.md) | dispute lifecycle |
| [trust-score.md](docs/trust-score.md) | explainable score engine |
| [ml-price-prediction.md](docs/ml-price-prediction.md) | price ML: methodology + evaluation |
| [ml-demand-prediction.md](docs/ml-demand-prediction.md) | demand ML: methodology + evaluation |
| [ai-matching.md](docs/ai-matching.md) | hybrid ranking engine |
| [storage-intelligence.md](docs/storage-intelligence.md) | sell-now vs store-then-sell, breakeven, demo facilities |
| [market-prices.md](docs/market-prices.md) | public price page, AI preview endpoints |
| [testing.md](docs/testing.md) | test surfaces and commands |
| [deployment.md](docs/deployment.md) | install, run, env vars, Docker, production |

## Limitations

- **Synthetic data**: ML models are trained on seeded synthetic datasets for demonstration and
  prototype purposes (`is_synthetic: true` in model metadata). Production accuracy requires
  real mandi/demand data and re-evaluation (see Future Enhancements).
- **Mock providers**: OTP, KYC, payment, notification, and delivery integrations are mock
  implementations. No real money, SMS, or documents move through the system today.
- **In-process throttles**: rate limiting/lockout stores are process-local; a shared Redis
  store is recommended for multi-worker or distributed deployments.
- **Tokens in localStorage**: the SPA stores access/refresh tokens in `localStorage`;
  `httpOnly` cookies are the recommended hardening step for production.
- **Single-region assumptions**: verification and dispute flows assume admin availability and
  simple geography.

## Future Enhancements

- Retrain price/demand models on real historical mandi datasets; register and compare with
  tuned hyperparameter search (Optuna) and time-series-aware evaluation.
- Adopt real provider adapters (OTP, KYC, payment, delivery) once sandbox credentials are
  available; enable Razorpay/UPI checkouts under explicit configuration.
- Redis-backed rate limiting and `httpOnly`-cookie token storage.
- Horizontal scaling, object storage for documents/QR images, background job workers.
- Webhook replay and provider sandbox certification suites; load/failure/chaos runs.
- Multi-lingual UI; regional language support.

---

Phase history: [docs/architecture/phase-roadmap.md](docs/architecture/phase-roadmap.md) ·
Prior phase reports live in `docs/PHASE-*.md`.