# Phase 18 — Admin Dashboard

This phase delivers an ADMIN-ONLY administration portal with a live overview of the entire
marketplace. Every endpoint and page is protected by the `ADMIN` role, and only sanitized,
operational data is surfaced — never passwords, OTPs, provider credentials, or unnecessary PII.

## What Administrators Can View

All of the following are available from the portal sidebar, each backed by a read-only
`/api/v1/admin/*` endpoint:

- **Users** — sanitized list (phone, role, status, joined date).
- **Farmers / Buyers** — existing verification-queue endpoints.
- **Verification requests** — pending farmer identity and buyer identity/payment requests, with
  approve / reject actions and a live pending count.
- **Crop listings** — price, quantity, location, status.
- **Buyer demands** — crop, buyer, quantity, max price, location.
- **Orders** — order number, crop, both parties, amount, source, status.
- **Payments** — advance/balance, amount, status, provider (reference only), failure code.
- **Deliveries** — lifecycle status and timestamps.
- **Quality checks** — PASS/PROBLEM result, grade, received/damaged quantities.
- **Disputes** — the existing admin dispute dashboard (`/admin/disputes`).
- **Refunds** — amount, status, reason.
- **Trust scores** — the existing trust-score dashboard (`/admin/trust-scores`).
- **Reviews** — star ratings and comments.
- **AI predictions** — sanitized log of price forecasts, demand forecasts, and matches.
- **System statistics** — aggregate counts and averages across every entity.

## Dashboard Charts (Recharts)

`GET /api/v1/admin/dashboard` returns `statistics` plus 30-day daily chart series. The React
portal at `/admin` renders them with Recharts:

- **Registered farmers** and **registered buyers** (dual-area over time)
- **Active listings** (published with available stock)
- **Orders**, **completed orders**, and **disputes** (bar chart)
- **Transaction volume** (₹ of paid payments per day)
- **Crop demand** (top crops by requested quantity)
- **AI predictions** (price/demand/matching calls per day)

## AI Prediction Audit

AI endpoints are computed on the fly and never persisted previously. Phase 18 adds an
append-only `ai_predictions` table that records a sanitized marker — `prediction_type` plus an
optional location — for every price prediction, demand forecast, farmer match, and buyer match.
Model inputs and outputs are **not** stored. This powers the AI-activity chart and list without
exposing any forecasting internals.

## Access Control & Data Safety

- All new endpoints require `ADMIN` via the existing `require_roles("ADMIN")` dependency; a
  non-admin gets `403`, unauthenticated callers get `401`.
- List serializers are explicit and whitelist-only; no raw ORM objects are returned.
- No secrets (password hash, OTP, provider event IDs, checkout URLs) are serialized.

## Endpoints

New in this phase:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/dashboard` | statistics + 30-day chart series + crop demand |
| GET | `/api/v1/admin/users` | sanitized user list |
| GET | `/api/v1/admin/listings` | crop listings |
| GET | `/api/v1/admin/demands` | buyer demands |
| GET | `/api/v1/admin/orders` | orders |
| GET | `/api/v1/admin/payments` | payments |
| GET | `/api/v1/admin/deliveries` | deliveries |
| GET | `/api/v1/admin/quality-checks` | quality checks |
| GET | `/api/v1/admin/refunds` | refunds |
| GET | `/api/v1/admin/reviews` | reviews |
| GET | `/api/v1/admin/ai-predictions` | AI activity log |
| GET | `/api/v1/admin/verification-requests` | pending farmer + buyer verification |

## Schema Change

- New migration `20260906_0011` creates the `ai_predictions` audit table (indexed by
  `(prediction_type, created_at)`).

## Files

- Backend: `app/modules/admin/dashboard_router.py`, `app/db/models/ai.py`,
  `app/modules/ai/router.py` (audit wiring), `migrations/versions/20260906_0011_ai_predictions.py`
- Frontend: `src/pages/admin/AdminDashboardPage.tsx`, `AdminBrowsePage.tsx`,
  `AdminVerificationsPage.tsx`, `src/components/admin/AdminShell.tsx`, `AdminTable.tsx`,
  `src/lib/admin.ts`
