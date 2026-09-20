# Phase 20 - Complete Testing

Phase 20 actually runs every test surface in the repository and fixes the errors it
discovers. This phase adds the two test areas that previously had **zero** coverage —
the ML workspace and the React frontend — while re-running the full backend suite.

## Scope and Context

| Area       | Before Phase 20 | After Phase 20 |
| ---------- | --------------- | -------------- |
| Backend    | 148 tests / 17 modules | 148 tests / 17 modules (verified green) |
| ML         | no test files, no runner | 25 tests, `ml/tests/` suite |
| Frontend   | no runner, no config   | Vitest + Testing Library, 35 tests / 5 files |

## What Was Verified or Added

### 1. Backend suite (already comprehensive — re-run, all green)

`backend/tests/` already covered the Phase-20 requirements:

- Authentication, registration, OTP and authorization (401/403) everywhere.
- All marketplace modules: identity, marketplace, orders, payments, batches,
  disputes, trust, ratings, notifications, AI price/demand/matching, admin dashboard.
- Invalid/duplicate/unauthorized requests, invalid order transitions
  (`test_orders.py`), payment failures (`test_mock_fail_mode_marks_payment_failed`),
  duplicate payment webhooks idempotency (`test_webhook_capture_and_duplicate_handling`),
  advance-intent idempotency (`test_advance_intent_is_idempotent`).

Run:

```bash
cd backend && .venv/bin/python -m pytest -q
```

Result: `148 passed`.

### 2. New ML test suite — `ml/tests/`

- `test_preprocessing.py` — price and demand `ColumnTransformer` schemas, feature/target
  extraction, fitted transform shape, feature-name output compatibility.
- `test_model_loading.py` — the trained artifacts on disk (`price_prediction_model.joblib`,
  `demand_model.joblib`) load and their metadata carries the contract keys.
- `test_prediction.py` — `predict_price` / `predict_demand` output contracts (prices,
  ranges, confidence bounds, INR/kg units, synthetic disclaimer), positive-price floor,
  many-crop sanity, and demand by state.
- Invalid input fallbacks: out-of-range months, non-positive quantity/demand/history,
  unknown grades/crops/defaults (`conftest.py` guarantees ML deps + repo-root import path).

Run:

```bash
backend/.venv/bin/python -m pytest ml/tests -q
```

Result: `25 passed`.

### 3. New frontend test suite — `frontend/tests/`, Vitest + Testing Library

Tooling added: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`,
`@testing-library/jest-dom`, `@testing-library/user-event`, `axios-mock-adapter`.
Config: `vitest.config.ts` (jsdom, `tests/setup.ts`, `restoreMocks`). Script:
`npm test` (was `npm run test`).

- `auth-validation.test.ts` — `normalizePhone`, `phoneError` (valid/invalid E.164),
  `apiErrorMessage` (string detail, pydantic array detail, fallbacks).
- `api-client.test.ts` — token store, Bearer attachment, no-token requests, silent
  token refresh + one retry, refresh-failure clears tokens and fires
  `marketplace:auth-expired`, and no refresh attempt for auth-flow endpoints.
- `protected-routes.test.tsx` — `ProtectedRoute` redirect to `/login` when anonymous,
  `AdminRoute`/`FarmerRoute`/`BuyerRoute` role gating and redirect-to-`/account` behavior.
- `login-form.test.tsx` / `register-form.test.tsx` — form validation messages, role
  selection + normalized payloads, navigation to `/account` and `/verify`, backend
  error surfacing (409 duplicate account, 401 invalid credentials).

Run:

```bash
cd frontend && npm test
```

Result: `35 passed`.

## Bugs Discovered and Fixed During Testing

1. **Silent token refresh was broken for `/auth/me`.** The response interceptor
   excludes any URL starting with `/auth`; because `config.url` is the *relative*
   path (`/auth/me`, not `/api/v1/auth/me`), a 401 on `/auth/me` skipped the refresh
   branch and forced a hard logout. Fixed with an explicit `isAuthFlowUrl()` that only
   excludes `/auth/login`, `/auth/register`, `/auth/refresh`, and `/auth/otp`
   (`frontend/src/lib/api-client.ts`).

2. **`apiErrorMessage` ignored errors from duplicate axios copies / mocks.**
   It relied on `instanceof AxiosError`, which is false for errors raised by a second
   axios instance or by test mocks (both carry the `isAxiosError` marker). Switched to
   the marker check, so backend `detail` strings surface correctly in the UI
   (`frontend/src/lib/auth.ts`).

## Full Trade-Gate Commands (all green)

```bash
# Backend
cd backend && .venv/bin/python -m pytest -q                                   # 148 passed
cd backend && .venv/bin/ruff check app tests migrations ../database           # All checks passed
cd backend && .venv/bin/python -m compileall -q app tests migrations          # OK
DATABASE_URL=postgresql+psycopg://marketplace:marketplace@localhost:5432/farmer_buyer_marketplace \
  .venv/bin/alembic upgrade head --sql                                         # migration heads OK

# ML
backend/.venv/bin/python -m pytest ml/tests -q                                # 25 passed

# Frontend
cd frontend && npm run build                                                  # tsc -b + vite build OK
cd frontend && npm run lint                                                   # 0 errors
cd frontend && npm test                                                       # 35 passed
```

## Coverage Requirements From the Phase Definition

- Authentication and authorization tests — present/re-run. ✓
- Tests for all marketplace modules — present/re-run. ✓
- Invalid requests, duplicate requests, unauthorized access — present. ✓
- Invalid order state transitions — present (`test_orders.py`). ✓
- Payment failure and duplicate/webhook-idempotency paths — present. ✓
- Dispute workflows — present (`test_disputes.py`). ✓
- Frontend component, form, API-integration, and protected-route tests — added. ✓

Running the phases uncovered a real refresh-interceptor bug and a brittle error
message path; both are fixed with regression tests. The ML and frontend suites are new
and stay green via `npm test` and the `ml/tests` runner.