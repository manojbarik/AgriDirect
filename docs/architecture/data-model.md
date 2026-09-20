# Data Model

This is the logical model for the MVP. It is intentionally not an Alembic migration yet.

## Identity and Users

### `users`

- `id` UUID primary key
- `phone_e164` unique, normalized mobile number
- `email` nullable, unique when present
- `role` enum: `FARMER`, `BUYER`, `ADMIN`
- `status` enum: `PENDING`, `ACTIVE`, `SUSPENDED`, `CLOSED`
- `phone_verified_at` nullable timestamp
- `created_at`, `updated_at`

### `otp_challenges`

- `id` UUID
- `user_id` nullable until registration is complete
- `phone_e164`
- `purpose` enum: registration, login, phone-change, sensitive-action
- `code_hash`, never the raw OTP
- `expires_at`, `attempt_count`, `consumed_at`
- provider reference and timestamps

### `refresh_tokens`

- `id` UUID
- `user_id`
- `token_hash`
- `expires_at`, `revoked_at`, `replaced_by_id`
- created timestamp and optional device metadata

## Verification

### `verification_cases`

- `id` UUID
- `user_id`
- `subject_type` enum: farmer identity, buyer identity, buyer business, payment profile
- `status` enum: `NOT_STARTED`, `PENDING`, `IN_REVIEW`, `VERIFIED`, `REJECTED`, `EXPIRED`
- provider name and external reference, if any
- rejection reason code, not unrestricted sensitive notes
- submitted/reviewed timestamps

### `verification_events`

- `id` UUID
- `verification_case_id`
- actor type and actor ID
- previous status, next status, reason code
- event timestamp and correlation ID

## Profiles, Farms, and Crops

### `farmer_profiles`

- `user_id` primary/foreign key
- display name and contact preferences
- verification summary status

### `farms`

- `id` UUID
- `farmer_user_id`
- name, acreage, farming type, address summary
- `location_id`

### `locations`

- `id` UUID
- country, state, district, locality, postal code
- latitude/longitude with access policy
- geocoding source and precision

### `crops`

- `id` UUID
- canonical name, variety, category, unit of measure

### `farmer_crop_plans`

- `id` UUID
- `farm_id`, `crop_id`
- season, expected harvest window, estimated quantity
- cultivation method and status

## Marketplace

### `crop_listings`

- `id` UUID
- `farmer_user_id`, `farm_id`, `crop_id`
- title, description, grade, unit, available quantity
- indicative price, currency, harvest/availability dates
- status: `DRAFT`, `PUBLISHED`, `PAUSED`, `SOLD_OUT`, `EXPIRED`, `CANCELLED`
- created/updated/published timestamps

### `demand_posts`

- `id` UUID
- `buyer_user_id`, `crop_id`
- requested quantity, target price range, required quality
- delivery location, required-by date
- status: `DRAFT`, `PUBLISHED`, `MATCHED`, `FULFILLED`, `CANCELLED`, `EXPIRED`

### `recommendations`

- `id` UUID
- recipient user ID and role
- source entity type and ID
- recommendation type, score, explanation, model version
- generated/expired timestamps

## Negotiation and Orders

### `negotiations`

- `id` UUID
- listing ID, demand ID nullable, farmer ID, buyer ID
- status: `OPEN`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`
- agreed quantity/price snapshot and accepted timestamp

### `offers`

- `id` UUID
- `negotiation_id`, actor user ID
- quantity, unit price, currency, message
- status and created timestamp

### `orders`

- `id` UUID and public order number
- farmer ID, buyer ID
- source type: direct purchase or negotiation
- status: `PENDING_PAYMENT`, `ADVANCE_PAID`, `CONFIRMED`, `PREPARING`, `IN_TRANSIT`, `DELIVERED`, `QUALITY_CONFIRMED`, `DISPUTED`, `SETTLED`, `CANCELLED`
- immutable total, currency, delivery snapshot
- expected and actual dates

### `order_items`

- `id` UUID
- `order_id`, `listing_id`, `crop_id`
- quantity, unit price, line total, quality/grade snapshot

## Payments and Settlement

### `payment_intents`

- `id` UUID
- `order_id`, payer user ID
- purpose: advance, balance, refund, payout
- amount, currency, status
- provider and provider reference
- idempotency key, timestamps

### `payment_transactions`

- `id` UUID
- `payment_intent_id`
- provider event reference, event type, status, raw payload storage policy reference
- processed timestamp and failure code

### `settlements` and `payouts`

- order reference, gross/net/fee amounts, currency
- eligibility status, release timestamp, destination profile reference
- provider reference and reconciliation status

## Fulfillment, Quality, and Disputes

### `order_batches`

- `id` UUID, order ID, batch code
- prepared quantity, preparation timestamp, protection/packaging details

### `quality_checks`

- batch ID, inspector/actor ID, quality dimensions, result, evidence references

### `deliveries`

- order ID, batch ID, delivery provider/reference
- status, pickup/delivery timestamps, destination snapshot

### `disputes`

- `id` UUID, order ID, opened by user ID
- category, description, status, deadline
- requested resolution and final resolution

### `dispute_decisions`

- dispute ID, admin ID, decision type, reason code, financial consequence
- decided timestamp and audit reference

## Trust, Reviews, and Audit

### `reviews`

- order ID, author ID, subject ID
- rating, text, moderation status, created timestamp
- one eligible review per author/order/subject rule

### `trust_scores`

- subject user ID
- score, score band, calculation version
- contributing event summary and calculated timestamp

### `audit_logs`

- actor ID/type, action, resource type/ID
- outcome, request/correlation ID, safe metadata, created timestamp

Raw tokens, OTPs, payment credentials, and identity documents must not be written into audit metadata.

## Indexing and Constraints

- Unique normalized phone number and public order number.
- Index listing status, crop, location, availability date, and farmer ID.
- Index demand status, crop, required-by date, location, and buyer ID.
- Index order status, farmer ID, buyer ID, and created timestamp.
- Index open disputes by status and deadline.
- Enforce non-negative quantities and monetary amounts with database constraints.
- Use optimistic locking or guarded updates for listing inventory and order transitions.
- Use database transactions when reserving inventory, accepting an offer, creating an order, or recording payment state.
