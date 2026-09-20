# Testing

Three test surfaces cover the whole stack: backend (pytest), ML (pytest), and frontend
(Vitest + Testing Library). All are green and are part of the release gate.

## 1. Test surfaces & commands

### Backend — `backend/tests/` (250 tests)

```bash
cd backend && .venv/bin/python -m pytest -q
```

Suites:

| Suite | Focus |
| --- | --- |
| `test_health` | liveness + DB probe |
| `test_identity` | register, login, OTP (verify/resend/cooldown), refresh, logout, me, role |
| `test_security` | Phase 21: JWT secret policy, audience, rate limiting, login lockout, OTP throttling, webhook signature enforcement, security headers, log redaction, proxy trust |
| `test_farmer` / `test_buyer` | profiles, farms, crop plans, listings, verification, demands, dashboards |
| `test_marketplace` | catalog, locations, search/filter/sort/pagination |
| `test_ai` / `test_ai_demand` / `test_ai_matching` | price/demand predictions, matching ranking + explanations, audit rows |
| `test_orders` | create, accept/reject/counter, lifecycle transitions, invalid transitions, cancel |
| `test_payments` | intents, confirm, idempotency, webhooks (dedupe + signature), refunds, settlements, mock-fail, advance-intent idempotency |
| `test_batches` | prepare (incl. `qr_identifier`), inspect, pickup, deliver, quality checks |
| `test_storage` | storage facility search, SELL NOW vs STORE THEN SELL recommendation, AI-forecast fallback |
| `test_disputes` | raise/review/resolve, replacement, status audit |
| `test_trust` | score computation, factor breakdown, admin recalc |
| `test_ratings` | two-way reviews on completed orders, once-per-pair, trust side effects |
| `test_notifications` | inbox, unread count, mark read |
| `test_admin_dashboard` | overview + per-entity admin lists, ADMIN-only access |
| `test_models` | ORM model definitions / relationships |

### ML — `ml/tests/` (25 tests)

```bash
# Run from the repository root (top-level `ml` must be importable):
backend/.venv/bin/python -m pytest ml/tests -q
```

- `test_preprocessing` — feature engineering contracts.
- `test_model_loading` — trained artifacts on disk load and produce correct shapes;
  metadata contract (`model_version`, `best_model_name`, `residual_std`, `data_disclaimer`).
- `test_prediction` — price + demand prediction contracts, invalid-input fallbacks.

### Frontend — `frontend/tests/` (66 tests in 12 files)

```bash
cd frontend && npm test
```

Covers auth helpers, axios interceptors + **silent refresh**, protected/role route guards,
login/register form flows, cart, and the restored original dark-glass public auth pages
(`restore-smoke.test.tsx`).

## 2. Static & build gates

```bash
# Backend lint + compile
backend/.venv/bin/ruff check backend/app backend/tests ml ../database
backend/.venv/bin/python -m compileall -q backend/app backend/tests backend/migrations

# Migration SQL validity (offline, Postgres dialect)
DATABASE_URL=postgresql+psycopg://... backend/.venv/bin/alembic upgrade head --sql

# Frontend type-check + lint + production build
cd frontend && npm run build && npm run lint
```

## 3. Test data & isolation

- Backend tests use an **in-memory SQLite** via a TestClient fixture
  (`tests/conftest.py`) with helper factories (`tests/helpers.py`) including a dev ADMIN.
- Rate limits are reset between tests (`reset_rate_limits`, `reset_security_state`).
- ML tests load the real trained artifacts from `ml/models/` (reproducible via the Phase 22
  runner).
- Frontend uses jsdom + axios-mock-adapter, no real network.

## 4. Gate results (Phase 21/22/25)

| Gate | Result |
| --- | --- |
| Backend `pytest` | 250 passed |
| ML `pytest` | 25 passed |
| Frontend `vitest run` | 66 passed |
| `ruff check` + `compileall` | clean |
| Alembic offline SQL (Postgres) + live SQLite head | OK (single head `20260911_0022`) |
| Frontend `tsc -b` + eslint + `vite build` | 0 errors |

## 5. Adding tests

- Backend: add a `test_<module>.py`; reuse the TestClient + factories in `conftest.py`/
  `helpers.py`; never weaken a security invariant to make a test pass.
- ML: add to `ml/tests/`; run through the same venv as backend.
- Frontend: Vitest + Testing Library, mock axios with `axios-mock-adapter`.
- Re-run the full gate above before finishing a change.