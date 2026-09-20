# Database

SQLAlchemy 2.0 ORM over PostgreSQL (production/target) or SQLite (local development default).
Schema is managed with Alembic (`backend/migrations/`). The ORM lives in
`backend/app/db/models/`.

## 1. Connection & Configuration

| Setting | Env var | Default |
| --- | --- | --- |
| Driver URL | `DATABASE_URL` | `sqlite:///./marketplace_dev.db` (backend cwd) |
| Dialects | `postgresql+psycopg://` for production | — |
| Dev init | app startup calls `Base.metadata.create_all` (SQLite only) | — |
| Alembic | `backend/alembic.ini` + env | Postgres via `.env` |

```bash
DATABASE_URL=postgresql+psycopg://marketplace:marketplace@localhost:5432/farmer_buyer_marketplace
```
Migrations validate offline against the Postgres dialect:
`alembic upgrade head --sql`.

## 2. Schema by Domain

### Identity & people (`models/people.py`, `models/identity.py`)

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `users` | accounts | `phone_e164` (unique), `email`, `password_hash`, `role` (`FARMER`/`BUYER`/`ADMIN`), `status` (`PENDING`/`ACTIVE`/`SUSPENDED`/`CLOSED`), `phone_verified_at` |
| `farmer_profiles` | farmer profile + verification | `verification_status`, `full_name`, `payout_profile_reference` |
| `farmer_crop_plans` | seasonal plan per crop | `season`, `estimated_quantity`, `expected_harvest_start/end`, `status` |
| `farms` | farm locations | `name`, `state/district/locality`, `acreage`, `farming_type`, lat/lng |
| `buyer_profiles` | buyer profile + payment method | `business_name`, `buyer_type`, `payment_verification_status` |
| `buyer_demands` | purchase intent | crop, quantities, target price range, `required_by`, `status` |
| `otp_challenges` | phone verification | `code_hash`, `expires_at`, `consumed_at`, `attempts`, `provider_reference` |
| `refresh_tokens` | rotating refresh tokens | `token_hash` (unique), `ip_address`, `user_agent`, `revoked_at`, `replaced_by` |

### Marketplace (`models/marketplace.py`)

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `crops` | catalog | `name`, `variety`, `category`, `default_unit` |
| `crop_listings` | sell-side supply offer | `farm_id`, `crop_id`, `unit_price`, `available_quantity`, `grade`, `status`, `published_at` |
| `orders` | negotiation + lifecycle | statuses (`REQUESTED`→`ACCEPTED`→`CONFIRMED`→`…`→`COMPLETED`), price/qty agreements, `pending_offer_*`, `source_type` (listing/demand/direct), `quality_confirmation_deadline`, `public_order_number` |
| `order_status_events` | audit trail | `from_status`, `to_status`, `changed_by_id`, `reason` |
| `crop_batches` | fulfillment lot | `batch_code` (QR key), `qr_identifier` (traceability QR, `AGRI:<batch_code>:<id>`), `listing_id`, `order_id`, `prepared_quantity`, `quality_grade`, `preparation_status`, `delivery_status` |

### Transactions (`models/transaction.py`)

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `payments` | payment intents + results | `operation` (`ADVANCE`/`BALANCE`/`REFUND`), `amount`, `status`, `idempotency_key`, `provider_reference`, `provider_event_id` |
| `settlements` | per-order merchant settlement | `gross_amount`, `fee_amount` (2% default), `net_amount`, `status`, `eligible_at`, `released_at` |
| `payouts` | farmer disbursement | `amount`, `settlement_id`, `provider_reference`, `status` |
| `refunds` | refunds after dispute or cancellation | `amount`, `payment_id`, `dispute_id`, `reason`, `status` |
| `quality_checks` | inspection results | `quality_grade`, `result` (PASS/FAIL/PARTIAL), `quantity_received`, `damaged_quantity`, `evidence_reference` |
| `deliveries` | fulfillment delivery | `status`, `picked_up_at`, `delivered_at`, `provider_reference` |
| `disputes` | buyer/farmer disputes | `category`, `requested_resolution`, `resolution`, `deadline`, `status` |
| `dispute_status_events` | dispute audit | `from_status`, `to_status`, `reason` |
| `replacements` | replacement-fulfillment flow | `replacement_order_id`, `status`, `completed_at` |

### Social (`models/social.py`)

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `trust_scores` | current per-user score | `score` (0–100), `score_band`, `calculation_version`, `contributing_factors` |
| `trust_score_history` | change journal | `score`, `breakdown`, `reason`, `changed_by_id/role` |
| `ratings` | two-way reviews | `order_id`, `rater_id`, `rated_user_id`, `score` (1–5), `comment` |
| `notifications` | in-app inbox | `title`, `body`, `notification_type`, `read_at`, `delivery_status` |

### AI audit (`models/ai.py`)

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `ai_predictions` | audit log per prediction | `prediction_type` (`price_prediction`/`demand_prediction`), `location`, `user_id`, `crop_id` |

## 3. Relationships Overview (ER summary)

```
users 1─* refresh_tokens · 1─* otp_challenges
users 1─1 farmer_profiles 1─┐
farmer_profiles 1─* farms 1─┴─* farmer_crop_plans 1─* crops (M2M via plan)
farmer_profiles 1─* crop_listings 1─* crops · crop_listings 1─* orders
users 1─1 buyer_profiles 1─* buyer_demands 1─* crops · buyer_demands 1─* orders
orders 1─1 settlement · 1─* payments · 1─* order_status_events · 1─* disputes
orders 1─* crop_batches 1─* quality_checks · 1─1 deliveries
disputes 1─* refunds · 1─1 replacements
payments 1─* refunds
users 1─* trust_scores(history) / ratings (as rater & reviewee) / notifications / ai_predictions
```

## 4. Important Design Decisions

- **UUID primary keys** (`UUIDPrimaryKeyMixin`) for all business tables; timestamps via
  `TimestampMixin` (`created_at`/`updated_at`).
- **Status as string-enumerated columns**, advanced by service-layer state machines; every
  order/certain transitions write an audit event.
- **No raw SQL** in application code — all queries use the ORM with bound parameters
  (SQL-injection audit: clean).
- **Sensitive data**: password and OTP codes stored only as hashes; refresh tokens hashed.
- **Money**: `Decimal`/numeric amounts with a `currency` column (default `INR`) on every
  money-bearing table; fee rate derives from settings (`payment_settlement_fee_percent =
  2.0`).
- **Unique/idempotency guards**: `payments.idempotency_key`, `payments.provider_event_id`
  (webhook dedupe), `refresh_tokens.token_hash` unique, one active OTP challenge per user.

## 5. Migrations

- Command: `alembic revision --autogenerate -m "..."` (edit by hand to confirm), then
  `alembic upgrade head`.
- The production-targeted migration is Postgres-compatible; the offline SQL gate
  (`alembic upgrade head --sql`) is run in CI/verification.
- SQLite dev builds the schema from models at startup; run
  `alembic upgrade head` against Postgres for real deployments.

## 6. Seeds

- No production seed data is shipped. A dev/test ADMIN
  (`+919000000110` / `Admin@12345`) exists only inside the test suite helpers
  (`backend/tests/helpers.py`) — never created on the main startup path.