# Phase 6 — Buyer Onboarding

This phase implements the complete buyer side of onboarding: buyer type, basic information, mock identity/business and payment verification, location, trust status, and the buyer dashboard. It follows the Phase 5 farmer module conventions and the flow defined in the Phase 1 architecture.

## Buyer Types

`INDIVIDUAL`, `RESTAURANT`, `HOTEL_HOSTEL`, `RETAILER`, `WHOLESALER`, `BUSINESS` — all validated against a `CheckConstraint` on `buyer_profiles.buyer_type`. Business types (`RESTAURANT`, `HOTEL_HOSTEL`, `RETAILER`, `WHOLESALER`, `BUSINESS`) require a `business_name` for identity verification; `INDIVIDUAL` does not.

## Onboarding Flow

```
Buyer Registration → OTP → Buyer Type → Basic Information
  → Identity / Business Verification (mock)
  → Location
  → Payment Verification (mock)
  → Trust Status
```

Statuses are `PENDING` → `VERIFIED` / `REJECTED`, independently tracked for identity (`verification_status`) and payment (`payment_verification_status`). Both were migrated from the old `NOT_STARTED` default in migration `20260906_0005`, which also adds the three check constraints.

## Mock Verification Rules

`app/integrations/buyer_verification.py` defines `BuyerVerificationProvider` and `MockBuyerVerificationProvider` (returned by `get_buyer_verification_provider()`).

- **Identity/business submit** returns `VERIFIED` when the buyer type and full name are set, plus a business name for business buyer types. Otherwise `PENDING` with a reason like `Missing required buyer data: business name`.
- **Payment submit** returns `VERIFIED` only when identity is already `VERIFIED` and the buyer has a complete location (state, district, locality, postal code — used as the payment address), then records the payment profile reference (`mock-payment-ok`). Otherwise `PENDING` with the specific missing item.
- `REJECTED` is applied only by an admin through the queue; a rejected buyer can fix data and resubmit (returns to `VERIFIED`/`PENDING` from the mock).
- Admin claims override auto results on the four admin endpoints.

## New / Modified Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/buyer/profile` | BUYER | Create buyer profile (buyer type + name + optional business name) (201) |
| PUT | `/api/v1/buyer/profile` | BUYER | Update basic information / buyer type |
| GET | `/api/v1/buyer/profile` | BUYER | Read buyer profile |
| PUT | `/api/v1/buyer/location` | BUYER | Update buyer location (delivery/payment address) |
| GET | `/api/v1/buyer/status` | BUYER | Onboarding steps, completion percent, submit flags |
| POST | `/api/v1/buyer/verification/identity/submit` | BUYER | Mock identity/business verification |
| POST | `/api/v1/buyer/verification/payment/submit` | BUYER | Mock payment verification |
| POST | `/api/v1/buyer/demands` | BUYER | Create buyer demand draft (201) |
| GET | `/api/v1/buyer/demands` | BUYER | List own demands |
| GET | `/api/v1/buyer/dashboard` | BUYER | Dashboard statistics (all 9 sections) |
| GET | `/api/v1/admin/buyers` | ADMIN | Buyer verification queue |
| POST | `/api/v1/admin/buyers/{profile_id}/verify` | ADMIN | Approve buyer identity |
| POST | `/api/v1/admin/buyers/{profile_id}/reject` | ADMIN | Reject buyer identity |
| POST | `/api/v1/admin/buyers/{profile_id}/payment/verify` | ADMIN | Approve buyer payment verification |
| POST | `/api/v1/admin/buyers/{profile_id}/payment/reject` | ADMIN | Reject buyer payment verification |

## Buyer Dashboard

`GET /api/v1/buyer/dashboard` returns every section the buyer dashboard requires:

- **Marketplace** — count of published crop listings
- **Create demand** — the buyer's demand count + create action
- **Recommendations** — count of published listings in the buyer's state (rule-based placeholder; ML surfaces land in Phase 8)
- **Orders** — orders placed by the buyer
- **Payments** — payment records for the buyer
- **Deliveries** — delivery records across the buyer's orders
- **Disputes** — disputes opened by the buyer
- **Reviews** — reviews received by the buyer
- **Trust score** — score + band from `trust_scores`, defaulting to `0` / `NEW`

Counts for orders/payments/deliveries/disputes/reviews are `0` in this phase because those workflows arrive in later phases.

## Demand Creation (Bounded)

Demand creation (`POST /buyer/demands`) is included so the dashboard's "create demand" section is functional: it creates a `DRAFT` demand on the buyer's profile, deriving state/district from the buyer when not supplied, validating quantity, price range (`target_max_price >= target_min_price`), and crop existence. Full demand lifecycle, search, filtering, pagination, and buyer-facing marketplace UI remain Phase 7.

## Files Changed

- `backend/app/db/models/people.py` — `BuyerProfile` check constraints + `PENDING` defaults
- `backend/migrations/versions/20260906_0005_buyer_verification_status.py` — re-value + constraint migration
- `backend/app/integrations/buyer_verification.py` — buyer verification provider interface + mock
- `backend/app/modules/buyer/` — new module: `schemas.py`, `service.py`, `router.py`
- `backend/app/modules/admin/router.py` — buyer queue + identity/payment verify/reject
- `backend/app/api/router.py` — mounts buyer router
- `database/seed_dev.py` — buyer trust score + demo demand
- `backend/tests/helpers.py` — `complete_buyer` helper
- `backend/tests/test_buyer.py` — 14 new tests
- Frontend: `src/lib/buyer.ts`, `src/components/BuyerRoute.tsx`, `src/pages/buyer/` (onboarding wizard, dashboard, demands), routes in `src/app/App.tsx`, links in `src/pages/AccountPage.tsx` and the home nav

## Seed Data

The demo buyer `+919000000002` (`Sandbox@123`) is seeded as a `RETAILER` (Demo Fresh Stores, Pune) with `VERIFIED` identity and payment status, a trust score (60, ESTABLISHING), and a demo demand for 300 kg of tomatoes.

## Run Instructions

```bash
cd "/Users/manojbarik/Desktop/SIH PROJECT 2026/backend"
source .venv/bin/activate
alembic upgrade head
PYTHONPATH=backend backend/.venv/bin/python -m database.seed_dev
uvicorn app.main:app --reload
```

Frontend:

```bash
cd "/Users/manojbarik/Desktop/SIH PROJECT 2026/frontend"
npm run dev
```

Walkthrough: log in as the demo buyer → `/buyer/onboarding` (6-step wizard) → `/buyer/dashboard` (9 sections) → `/buyer/demands`. The mock OTP code is the last 6 digits of the phone number.

## Checks Run

- Backend: `ruff check`, `compileall`, `alembic upgrade head --sql`, `pytest` — **53 tests passing** total (39 from Phases 4–5 + 14 new buyer tests):
  - role/anonymous guards on every buyer route
  - profile create/conflict/get/update, invalid buyer type rejection (422)
  - identity verification PENDING/VERIFIED rules incl. business-name requirement
  - payment verification chain: identity-first → location → VERIFIED + payment profile reference
  - status/onboarding progress (completion percent, submit flags)
  - location update preserving existing fields
  - demand create/list, unknown crop 404, bad price range 422
  - dashboard all-9-sections stats incl. marketplace/recommendations counts
  - admin buyer queue: identity + payment verify/reject, 403 non-admin, 404 unknown
  - rejected buyer can resubmit identity
- Frontend: `npm run lint` and `npm run build` — clean.

## Deferred

- Full demand lifecycle, search, filtering, pagination, and buyer-facing marketplace UI (Phase 7).
- Real identity/business and payment KYC providers; only deterministic mocks exist.
- Admin console UI for the buyer verification queue (backend endpoints only).
- Order, payment, delivery, dispute, review, and rating workflows (Phases 9–12) to make those dashboard counts non-zero.
- ML-based recommendations and trust-score growth from real activity (Phases 8, 12).