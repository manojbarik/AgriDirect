# API Reference

Base path: **`/api/v1`**. Interactive OpenAPI docs: `http://127.0.0.1:8001/docs` (Swagger UI).

## Conventions

- Auth: `Authorization: Bearer <access-token>` (see [authentication.md](authentication.md)).
- Errors use FastAPI JSON: `{"detail": ...}`; status semantics:
  - `401` missing/invalid token · `403` wrong role / forbidden · `404` missing or **not yours**
    (ownership is hidden — see Security) · `409` conflict · `429` rate-limited · `422` validation.
- Pagination params used by list endpoints: `limit` / `offset` (bounded) and sorting filters.
- All `datetime` fields are UTC ISO-8601. Money fields are decimal numbers with a `currency`.
- Every role-gated router declares its own dependency, e.g.
  `require_roles("FARMER")`, `require_roles("BUYER")`, `require_roles("FARMER","BUYER")`,
  `require_roles("ADMIN")`. Only **public** endpoints are listed without auth.

---

## Health (`app/api/v1/health.py`)

| Method & Path | Auth | Description |
| --- | --- | --- |
| `GET /health` | public | Liveness + DB connectivity probe. `{"status":"ok","database":"ok"}` |

---

## Authentication (`/auth`)

| Method & Path | Auth | Description |
| --- | --- | --- |
| `POST /auth/register` | public · 5/h/IP | Create user (role `FARMER`/`BUYER`), returns OTP challenge. `{phone_e164, password, role, ...}` |
| `POST /auth/login` | public · 20/5min/IP | `{phone_e164, password}` → tokens. 429 after phone lockout |
| `POST /auth/otp/resend` | public · 10/h/IP | `{user_id}` → new challenge (30 s cooldown, 5/h/user) |
| `POST /auth/otp/verify` | public · 30/5min/IP | `{challenge_id, code}` → tokens; 5 tries/challenge |
| `POST /auth/refresh` | public · 60/5min/IP | `{refresh_token}` → rotated token pair (UA+IP audited) |
| `POST /auth/logout` | auth | `{refresh_token}` → revoke |
| `GET /auth/me` | auth | Current user profile |
| `GET /auth/role` | auth | `{"role": ...}` |

**Register payloads** (all Pydantic-validated): `phone_e164` matches `^\+[1-9]\d{7,14}$`,
`password` 8–72 chars, role enum, optional name/email. OTP responses include `challenge_id`,
`expires_at`, and **`mock_code` (development/test only)**.

---

## Marketplace (public) (`/marketplace`)

| Method & Path | Auth | Description |
| --- | --- | --- |
| `GET /marketplace/crops` | public | Crop catalog, optional `q` filter |
| `GET /marketplace/locations` | public | Distinct `state`/`district` facets with published listings |
| `GET /marketplace/listings` | public | Search: `q`, crop filters, `min_price`/`max_price`, `state`/`district`, sort, pagination |
| `GET /marketplace/listings/{listing_id}` | public | Listing detail incl. embedded farmer summary |
| `GET /marketplace/farmers/{farmer_id}` | public | Public farmer profile (trust band, location, status) |

See [marketplace.md](marketplace.md).

---

## Farmer (`/farmer`)  — `Auth: FARMER`

| Method & Path | Description |
| --- | --- |
| `POST /farmer/profile` / `PUT` / `GET` | create/update/read farmer profile |
| `POST /farmer/farms` / `GET` | add/list farms |
| `GET|PUT /farmer/farms/{farm_id}` · `PUT /farmer/farms/{farm_id}/location` | farm details/update |
| `POST|GET /farmer/farms/{farm_id}/crops` · `DELETE /farmer/farms/{farm_id}/crops/{crop_plan_id}` | crop plans |
| `GET /farmer/crops` | my catalog snapshot |
| `POST /farmer/listings` · `GET /farmer/listings` | create/list my listings |
| `GET|PUT /farmer/listings/{listing_id}` · `PUT .../publish|pause|cancel` · `DELETE .../{listing_id}` | manage listings |
| `POST /farmer/verification/submit` · `GET /farmer/status` | request verification / view status |
| `GET /farmer/dashboard` | farmer KPIs |

---

## Buyer (`/buyer`)  — `Auth: BUYER`

| Method & Path | Description |
| --- | --- |
| `POST|PUT|GET /buyer/profile` | create/update/read buyer profile |
| `PUT /buyer/location` | delivery base location |
| `POST /buyer/verification/identity/submit` · `/payment/submit` | KYC + payment-method verification requests |
| `POST|GET /buyer/demands` · `GET|PUT|DELETE /buyer/demands/{demand_id}` | demand CRUD |
| `GET /buyer/status` | verification status + trust |
| `GET /buyer/dashboard` | buyer KPIs |

---

## Orders (`/orders`)  — `Auth: FARMER or BUYER`

| Method & Path | Description |
| --- | --- |
| `POST /orders` | Create order (buyer→farmer via listing/demand/direct) |
| `GET /orders` | My orders (party-scoped), filters + pagination |
| `GET /orders/{order_id}` | Detail (party only) |
| `POST /orders/{order_id}/accept` | Farmer accepts the requested offer |
| `POST /orders/{order_id}/reject` | Farmer rejects with a reason |
| `POST /orders/{order_id}/counter` | Either party counters (price/qty/delivery) |
| `POST /orders/{order_id}/status` | Advance lifecycle (e.g., mark fulfilled milestones) |
| `POST /orders/{order_id}/cancel` | Cancel with reason (transitions guarded) |

Lifecycle: request → accepted/counter → **confirmed on advance payment** → … quality →
delivery → complete. See [payment-flow.md](payment-flow.md) and
[quality-management.md](quality-management.md).

---

## Payments (`/payments`)  — `Auth: BUYER/ADMIN` (webhook public)

| Method & Path | Auth | Description |
| --- | --- | --- |
| `POST /payments/intents` | buyer/admin | Create `ADVANCE`/`BALANCE` intent for an order (idempotent by key) |
| `POST /payments/{payment_id}/confirm` | buyer/admin | Trigger provider capture (mock auto-pays) |
| `POST /payments/webhook/{provider}` | **public** | Provider callback — signature-verified (see Security), idempotent by `event_id` |
| `POST /payments/{payment_id}/refund` | buyer/admin | Refund on completed advance or dispute |
| `GET /payments/orders/{order_id}` | party/admin | Payment history for an order |
| `GET /payments/orders/{order_id}/settlement` | party/admin | Settlement + payout breakdown |
| `GET /payments` | buyer/admin | My payments |

Provider modes: **mock** by default; only `mock` is implemented. Real payment is never enabled
without explicit credentials. See [payment-flow.md](payment-flow.md).

---

## Batches & Quality (`/batches`)  — `Auth: FARMER or BUYER`

| Method & Path | Description |
| --- | --- |
| `GET /batches` | My batches (party-scoped) |
| `GET /batches/orders/{order_id}` | Batches for an order |
| `POST /batches/orders/{order_id}/prepare` | Farmer creates batch linked to the order. Response includes `qr_identifier` (format `AGRI:<batch_code>:<id>`) for scannable traceability QR |
| `GET /batches/{batch_id}` | Batch detail |
| `GET /batches/{batch_id}/quality-checks` | Inspection history |
| `POST /batches/{batch_id}/inspect` | Log quality check (PASS/FAIL/PARTIAL + grade) |
| `POST /batches/{batch_id}/pickup` | Courier pickup (delivery event) |
| `POST /batches/{batch_id}/deliver` | Mark delivered (destination snapshot) |
| `POST /batches/{batch_id}/dispute` | Move fulfilment-side problem to a dispute |

See [quality-management.md](quality-management.md).

---

## Disputes (`/disputes`)  — `Auth: FARMER or BUYER` (+ ADMIN)

| Method & Path | Auth | Description |
| --- | --- | --- |
| `POST /disputes` | party | Raise a dispute on an order (with evidence/category) |
| `GET /disputes` | party | My disputes |
| `GET /disputes/{dispute_id}` | party/admin | Detail incl. status history |
| `GET /disputes/orders/{order_id}` | party/admin | Disputes for an order |
| `GET /disputes/admin/list` | **ADMIN** | Moderation queue |
| `POST /disputes/admin/{dispute_id}/review` | **ADMIN** | Resolve (decision, refund trigger) |
| `POST /disputes/admin/replacements/{replacement_id}/complete` | **ADMIN** | Complete replacement fulfillment |

See [dispute-management.md](dispute-management.md).

---

## Trust Score (`/trust-score`, `/admin/trust-scores`)  — `Auth: FARMER or BUYER` / ADMIN

| Method & Path | Auth | Description |
| --- | --- | --- |
| `GET /trust-score/me` | farmer/buyer | Current score + contributing factors + recent history |
| `GET /admin/trust-scores` | **ADMIN** | All scores |
| `GET /admin/trust-scores/{user_id}` | **ADMIN** | Score detail incl. history |
| `POST /admin/trust-scores/{user_id}/recalculate` | **ADMIN** | Force recalculation |

See [trust-score.md](trust-score.md).

---

## Ratings (`/ratings`)  — `Auth: FARMER or BUYER`

| Method & Path | Description |
| --- | --- |
| `POST /ratings` | Review the other party on a COMPLETED order (once per pair) |
| `GET /ratings/orders/{order_id}` | Ratings for an order (party only) |
| `GET /ratings/users/{user_id}` | Public summary (average + counts) |

---

## Notifications (`/notifications`)  — `Auth: any logged-in user`

| Method & Path | Description |
| --- | --- |
| `GET /notifications` | My inbox (paginated) |
| `GET /notifications/unread-count` | `{unread_count}` |
| `POST /notifications/{notification_id}/read` | Mark read (own only) |
| `POST /notifications/read-all` | Mark all read |

---

## AI (`/ai`)  — public, rate-limited 60/min/IP

| Method & Path | Description |
| --- | --- |
| `POST /ai/price-prediction` | `{crop_name, variety?, category?, state?, district?, month?, season?, grade?, quantity?}` → `{predicted_price, currency, unit, range_low/high, model_version}` |
| `POST /ai/demand-prediction` | same context + `{buyer_type?}` → `{predicted_demand, unit, range_low/high, model_version}` |
| `POST /ai/match/farmers` | Rank farms/listings for a buyer's crop requirements → scored list |
| `POST /ai/match/buyers` | Rank buyers/demands for a farmer's listing → scored list |
| `GET /ai/public/price-preview` | Public: `?crop=&state=&district=` → expected price, range, confidence, best model. No auth required |
| `GET /ai/public/crops` | Public: returns list of crop names available for the public price preview |

See [ml-price-prediction.md](ml-price-prediction.md), [ml-demand-prediction.md](ml-demand-prediction.md),
[ai-matching.md](ai-matching.md).

---

## Storage (& `/market-place-sell-decision`) intelligence — `Auth: FARMER`

| Method & Path | Description |
| --- | --- |
| `GET /storage/options` | `?state=&district=` → list of (demo) storage facilities, services, pricing, demo flag + disclaimer |
| `POST /storage/recommendation` | Compare SELL NOW vs STORE THEN SELL for a crop lot: revenue, costs, net income per option, `recommendation_rank`, breakeven storage days, reasoning, confidence. Leave `predicted_price_per_kg` unset to auto-fill from the AI price forecast |

See [storage-intelligence.md](storage-intelligence.md).

---

## Admin (`/admin`)  — `Auth: ADMIN`

| Method & Path | Description |
| --- | --- |
| `GET /admin/overview` | Platform counts (users/listings/orders/payments/… + volumes) |
| `GET /admin/farmers` · `POST /admin/farmers/{profile_id}/verify|reject` | Farmer verification queue/action |
| `GET /admin/buyers` · `POST /admin/buyers/{profile_id}/verify|reject` | Buyer verification queue/action |
| `POST /admin/buyers/{profile_id}/payment/verify|reject` | Payment-method verification |
| `GET /admin/dashboard` | Chart series (users over time, revenue by stage, …) |
| `GET /admin/users` · `/listings` · `/demands` · `/orders` · `/payments` · `/deliveries` · `/quality-checks` · `/refunds` · `/reviews` · `/ai-predictions` · `/verification-requests` | Per-entity admin lists (sanitized, paginated) |

---

## Rate Limits (Phase 21)

| Endpoint bucket | Window | Limit |
| --- | --- | --- |
| `auth_register` | 1 h | 5/IP |
| `auth_login` | 5 min | 20/IP (+10 fails/15 min per phone) |
| `auth_otp_resend` | 1 h | 10/IP (+30 s cooldown, 5/h per user) |
| `auth_otp_verify` | 5 min | 30/IP (5 tries per challenge) |
| `auth_refresh` | 5 min | 60/IP |
| `ai` | 1 min | 60/IP |

Excess requests return `429` with `Retry-After`.