# Phase 3: Database Design And Implementation

## Implemented

- SQLAlchemy 2 typed models for users, farmer and buyer profiles, farms, crops, listings, demands, batches, orders, order items, payments, deliveries, quality checks, disputes, refunds, replacements, settlements, payouts, ratings, reviews, trust scores, and notifications.
- UUID primary keys with PostgreSQL `gen_random_uuid()` in the migration.
- Foreign keys with deliberate `CASCADE`, `RESTRICT`, and `SET NULL` delete behavior.
- UTC-aware `created_at` and `updated_at` timestamps on all persisted entities.
- Workflow status fields with constraints on the most important state machines.
- Numeric precision for quantities and money; no floating-point monetary fields.
- Marketplace, ownership, workflow queue, and status indexes.
- Uniqueness for phone numbers, public order numbers, batch codes, provider event references, idempotency operations, and review/rating eligibility.
- Initial Alembic migration: `20260906_0001_initial_schema`.
- Safe, repeatable development seed script.
- Mapper configuration test and existing health test.

## Model Locations

```text
backend/app/db/models/base.py
backend/app/db/models/people.py
backend/app/db/models/marketplace.py
backend/app/db/models/transaction.py
backend/app/db/models/social.py
backend/app/db/models/__init__.py
```

## Database Relationships

```text
User
  -> one optional FarmerProfile -> many Farms -> many FarmerCropPlans -> Crop
  -> one optional BuyerProfile -> many BuyerDemands -> Crop
  -> many Notifications, Ratings, Reviews, and one TrustScore

FarmerProfile -> many CropListings -> Crop
Farm          -> many CropListings

CropListing + BuyerProfile/Demand
  -> order source
Order -> many OrderItems -> Crop and optional CropListing
Order -> many CropBatches -> many QualityChecks
Order -> many Payments
Order -> many Deliveries
Order -> disputes -> refunds or replacements
Order -> one Settlement -> many Payouts
Order -> ratings and reviews
```

### Important relationship decisions

- `buyer_demands.buyer_id` references `buyer_profiles`, because a demand belongs to the buyer business profile rather than directly to an arbitrary user.
- `orders` preserve farmer and buyer profile references and store delivery/price snapshots so historical orders remain meaningful after profile edits.
- `payments.payer_id` references `users` because the payer is an authenticated account and payment workflow permissions are account-based.
- `disputes.opened_by_id` references `users` so either authorized participant can open a dispute; the application service must verify that the user belongs to the order.
- `ratings` and `reviews` use separate rater/author and rated/subject foreign keys to support both directions without ambiguous ORM relationships.
- Sensitive KYC documents, raw OTPs, card data, bank credentials, and provider secrets are not modeled.

## Requested Tables

All requested tables are present in the initial migration:

```text
users, farmer_profiles, farms, buyer_profiles, buyer_demands, crops,
crop_listings, crop_batches, orders, order_items, payments, deliveries,
quality_checks, disputes, refunds, replacements, settlements, ratings,
reviews, trust_scores, notifications
```

Two supporting tables were also included because they are required by the approved architecture:

- `farmer_crop_plans` stores planned crop production separately from published supply.
- `payouts` stores farmer disbursement records separately from settlement calculation.

## Migration Commands

From the backend directory:

```bash
source .venv/bin/activate
alembic upgrade head
alembic current
alembic downgrade base
alembic upgrade head
```

`alembic upgrade head` requires PostgreSQL to be running and reachable through `DATABASE_URL`. The migration creates the `pgcrypto` extension if needed for UUID generation.

To validate SQL generation without a live database:

```bash
alembic upgrade head --sql > /tmp/marketplace-upgrade.sql
```

## Seed Commands

From the project root:

```bash
PYTHONPATH=backend backend/.venv/bin/python -m database.seed_dev
```

Run the seed only against a development database. It is idempotent for its reserved test users and crop identifiers.

## Verification

```bash
cd backend
source .venv/bin/activate
ruff check app tests ../database
pytest
python -c "from app.db.base import Base; print(sorted(Base.metadata.tables))"
```

In this environment PostgreSQL client tools and a running PostgreSQL server were not available, so a live `alembic upgrade` could not be executed here. The migration was checked through Alembic SQL generation and the SQLAlchemy metadata/mapper test. Run the live migration commands once PostgreSQL is available.

## Deferred To Later Phases

- Application services and API CRUD/workflow endpoints.
- Authentication and authorization behavior.
- Database readiness health checks.
- Order inventory locking and state-transition commands.
- Provider webhook/event tables if required by concrete integrations.
- Production retention, partitioning, backup, and operational policies.
