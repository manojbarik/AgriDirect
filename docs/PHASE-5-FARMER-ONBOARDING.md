# Phase 5 — Farmer Onboarding

This phase implements the complete farmer side of onboarding on top of the Phase 4 authentication layer: basic profile, farm details, farm location, crop information, crop listings, and a mock verification workflow with the PENDING → VERIFIED/REJECTED lifecycle. The architecture decisions come from `docs/PHASE-1-SYSTEM-ARCHITECTURE.md` and the roadmap in `docs/architecture/phase-roadmap.md`.

Buyer onboarding remains a separate phase (Phase 6) per the revised roadmap.

## Scope Implemented

1. **Farmer basic profile** — create, update, and read (`POST`/`PUT`/`GET /api/v1/farmer/profile`). A single profile per farmer user.
2. **Farm details** — create and list farms (`POST`/`GET /api/v1/farmer/farms`) with name, optional acreage and farming type.
3. **Farm location** — update location on a farm (`PUT /api/v1/farmer/farms/{farm_id}/location`): address summary, state, district, locality, postal code, and optional latitude/longitude.
4. **Crop information** — add a crop plan to a farm (`POST /api/v1/farmer/farms/{farm_id}/crops`), list the farmer's crop plans (`GET /api/v1/farmer/crops`), and update a plan (`PUT /api/v1/farmer/farms/{farm_id}/crops/{crop_plan_id}`). Includes the public crop catalog (`GET /api/v1/marketplace/crops`).
5. **Crop listings** — create a listing (derives state/district from the farm), list, and manage lifecycle through publish/pause/cancel (`POST`/`GET /api/v1/farmer/listings`, `PUT .../listings/{id}/publish|pause|cancel`). Publishing requires a `VERIFIED` farmer profile.
6. **Onboarding status** — `GET /api/v1/farmer/status` returns the four onboarding steps, completion percent, and whether submission is allowed.
7. **Mock verification workflow** — `POST /api/v1/farmer/verification/submit` runs a deterministic mock provider; no real KYC in this phase. `ADMIN` can verify or reject through the admin queue endpoints.

## Farmer Verification Statuses

`farmer_profiles.verification_status` now has exactly three values:

| Status | Meaning |
| --- | --- |
| `PENDING` | Default. Data recorded; awaiting (or incomplete for) verification. |
| `VERIFIED` | All four onboarding steps complete; eligible to publish listings. |
| `REJECTED` | Set only by an admin; the farmer can resubmit after fixing data (returns to `PENDING`). |

`NOT_STARTED` was replaced by `PENDING` via migration `20260906_0004`. The model constraint is `ck_farmer_profiles_verification_status_valid`.

## Mock Verification Rules

`app/integrations/verification.py` defines the `VerificationProvider` interface (`submit`, `approve`, `reject`) and `MockVerificationProvider` (returned by `get_verification_provider()`). Submission returns `VERIFIED` when all of the following hold:

- `full_name` is set on the profile
- at least one farm exists
- at least one farm has a complete location (state, district, locality, postal code)
- at least one crop plan exists

Otherwise the provider returns `PENDING` with a reason like `Missing required onboarding data: ...`. A farmer can resubmit at any time; a rejected farmer is unlocked once the missing data is fixed. Admins approve/reject explicitly and always win if they act.

## New / Modified Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/farmer/profile` | FARMER | Create basic profile (201) |
| PUT | `/api/v1/farmer/profile` | FARMER | Update basic profile |
| GET | `/api/v1/farmer/profile` | FARMER | Read basic profile |
| POST | `/api/v1/farmer/farms` | FARMER | Create farm (201) |
| GET | `/api/v1/farmer/farms` | FARMER | List own farms |
| GET | `/api/v1/farmer/farms/{farm_id}` | FARMER | Read own farm |
| PUT | `/api/v1/farmer/farms/{farm_id}` | FARMER | Update own farm |
| PUT | `/api/v1/farmer/farms/{farm_id}/location` | FARMER | Update farm location |
| POST | `/api/v1/farmer/farms/{farm_id}/crops` | FARMER | Add crop plan (201) |
| PUT | `/api/v1/farmer/farms/{farm_id}/crops/{crop_plan_id}` | FARMER | Update own crop plan |
| GET | `/api/v1/farmer/crops` | FARMER | List own crop plans |
| POST | `/api/v1/farmer/listings` | FARMER | Create crop listing draft (201) |
| GET | `/api/v1/farmer/listings` | FARMER | List own listings |
| GET | `/api/v1/farmer/listings/{listing_id}` | FARMER | Read own listing |
| PUT | `/api/v1/farmer/listings/{listing_id}` | FARMER | Update own listing |
| PUT | `/api/v1/farmer/listings/{listing_id}/publish` | FARMER | Publish (requires VERIFIED) |
| PUT | `/api/v1/farmer/listings/{listing_id}/pause` | FARMER | Pause |
| PUT | `/api/v1/farmer/listings/{listing_id}/cancel` | FARMER | Cancel |
| POST | `/api/v1/farmer/verification/submit` | FARMER | Run mock verification |
| GET | `/api/v1/farmer/status` | FARMER | Onboarding steps + completion percent |
| GET | `/api/v1/farmer/dashboard` | FARMER | Dashboard stats (completion, verification, farms, crops, active listings, orders, earnings, trust score) |
| GET | `/api/v1/marketplace/crops` | any | Public crop catalog |
| GET | `/api/v1/admin/farmers` | ADMIN | Verification queue |
| POST | `/api/v1/admin/farmers/{profile_id}/verify` | ADMIN | Approve farmer |
| POST | `/api/v1/admin/farmers/{profile_id}/reject` | ADMIN | Reject farmer |

## Ownership And Validation Rules

- All farm, crop plan, and listing routes are scoped to the authenticated farmer: a foreign `farm_id`/`crop_plan_id`/`listing_id` returns 404 (not 403) to avoid leaking existence.
- Listing `created` derives `state`/`district` from the listing's farm.
- Listing lifecycle: DRAFT → PUBLISHED → PAUSED → (PUBLISHED); CANCELLED is terminal; SOLD_OUT listings cannot be cancelled. Publishing without a `VERIFIED` profile returns 403.
- Crop plan and listing availability windows are validated so `start <= end`; crop plans require a non-empty `crop_id`.
- Profile completion is the four steps (profile, farm, location, crops) as an integer percent; `can_submit` is true only when all four are done.

## Files Changed

- `backend/app/db/models/people.py` — `FarmerProfile.verification_status` default `PENDING` with `CheckConstraint`
- `backend/migrations/versions/20260906_0004_farmer_verification_status.py` — re-value + constraint migration
- `backend/app/integrations/verification.py` — `VerificationProvider` interface, `MockVerificationProvider`, `VerificationReceipt`, `FarmerVerificationInput`
- `backend/app/modules/farmer/` — new module: `schemas.py`, `service.py`, `router.py`
- `backend/app/modules/marketplace/router.py` — public crop catalog
- `backend/app/modules/admin/router.py` — farmer queue, verify, reject
- `backend/app/api/router.py` — mounts farmer and marketplace routers
- `database/seed_dev.py` — crop catalog (12 crops), demo farmer crop plan, published listing, trust score
- `backend/tests/conftest.py`, `backend/tests/helpers.py`, `backend/tests/test_farmer.py` — 17 new tests
- Frontend: `src/lib/farmer.ts` (API layer), `src/components/FarmerRoute.tsx`, `src/pages/farmer/` (onboarding wizard, dashboard, listings), routes in `src/app/App.tsx`, links in `src/pages/AccountPage.tsx`

## Seed Data

The dev seed adds a crop catalog (Tomato Hybrid/Desi, Potato, Onion, Green Chilli, Rice, Wheat, Maize, Soybean, Groundnut, Mango) and gives the demo farmer `+919000000001` a crop plan, a published listing ("Fresh organic tomatoes", 800 kg at ₹25/kg), and a trust score (55, ESTABLISHING). Login seed accounts from Phase 4:

| Role | Phone | Password |
| --- | --- | --- |
| `ADMIN` | `+919000000000` | `Sandbox@123` |
| `FARMER` | `+919000000001` | `Sandbox@123` |
| `BUYER` | `+919000000002` | `Sandbox@123` |

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

Walkthrough: log in as the demo farmer → `/farmer/onboarding` (5-step wizard) → `/farmer/dashboard` → `/farmer/listings`. The mock OTP code is the last 6 digits of the phone number.

## Checks Run

- Backend: `ruff check`, `compileall`, `alembic upgrade head --sql`, `pytest` — **39 tests passing** total (22 from Phase 4 + 17 new farmer tests):
  - role/anonymous guards on every farmer route
  - profile create/duplicate/update/get
  - farm create, location update (partial and complete), ownership 404s
  - crop plan lifecycle + window validation
  - public catalog access
  - verification: incomplete → PENDING with reason, complete → VERIFIED, rejected → resubmit → PENDING
  - status progression and completion percent
  - listing lifecycle including publish-requires-verified 403, pause, cancel, SOLD_OUT, ownership
  - dashboard stats (counts, earnings, trust score)
  - admin queue: list, verify, reject, 403 for non-admin, 404 unknown profile
- Frontend: `npm run lint` and `npm run build` — clean.

## Deferred

- Buyer onboarding (Phase 6) — buyer profile, business details, and location.
- Real KYC/verification provider (Aadhaar, Voter ID, etc.); only the deterministic mock exists.
- Admin console UI for the verification queue (backend endpoints only in this phase).
- Listing search/filter/pagination and buyer-facing marketplace UI (Phase 7).
- Order/payment integration to make dashboard earnings and orders non-zero.
- Rating-based trust score evolution and explanation UI.