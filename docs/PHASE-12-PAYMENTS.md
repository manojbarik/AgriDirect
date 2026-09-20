# Phase 12 — Payment Architecture and Financial Workflow

This phase layers a real payment *architecture* on top of the Phase 11 order workflow using a
pluggable provider boundary. In production the provider would be Razorpay (credentials injected via
env); in this demo the default **mock sandbox provider** captures payments with zero real money and
no card storage. Buyers pay a 20% advance on acceptance and the remaining balance after quality
confirmation; farmers receive a settlement minus a 2% platform fee, paid out via the same boundary.

## Provider Abstraction

`backend/app/integrations/payment.py`:

- `PaymentProvider` ABC — `create_intent`, `confirm_capture`, `refund`, `transfer` (payout).
- Result dataclasses: `PaymentIntentReceipt`, `ProviderConfirmation`, `ProviderRefund`,
  `PayoutReceipt`.
- `MockPaymentProvider` — `provider_name = "mock"`, modes `success`/`fail` (from
  `PAYMENT_MOCK_MODE`). Deterministic references: intents `mock-int-*`, events `evt-mock-*`,
  refunds `mock-ref-*`, payouts `mock-pay-*`; checkout URL
  `https://sandbox-pay.example/checkout/{reference}`.
- `get_payment_provider()` factory — returns mock by default; `razorpay` mode raises
  `NotImplementedError` until a real integration is wired.

## Configuration (backend/app/core/config.py)

| Setting | Default | Notes |
| --- | --- | --- |
| `PAYMENT_PROVIDER_MODE` | `mock` | Provider to use; `razorpay` is the future production mode |
| `PAYMENT_MOCK_MODE` | `success` | `success` or `fail` for the mock provider |
| `PAYMENT_ADVANCE_PERCENT` | `20.0` | Advance share of the order total |
| `PAYMENT_FEE_PERCENT` | `2.0` | Platform fee deducted from the settlement |
| `PAYMENT_PROVIDER_KEY_ID` / `..._KEY_SECRET` | `""` | Never committed; injected via env |
| `PAYMENT_WEBHOOK_SECRET` | `""` | When set, `X-Webhook-Signature` must match |

## Data Model

`backend/app/db/models/transaction.py`:

- `Payment` — new `checkout_url` (sandbox redirect URL), `refunded_amount` (default 0), and two new
  check constraints:
  - `ck_payments_status_valid`: PENDING, AUTHORIZED, PAID, FAILED, REFUNDED,
    PARTIALLY_REFUNDED, SETTLED.
  - `ck_payments_operation_valid`: ADVANCE, BALANCE.
- Idempotency is enforced at the DB level with `UniqueConstraint(operation, idempotency_key)`
  and a unique `provider_event_id`.
- `Settlement` and `Payout` tables (pre-existing) now get rows filled by the balance-payment flow.

## Payment Workflow

- **Advance intent** (`operation=ADVANCE`) is allowed only while the order is `ACCEPTED`. Amount =
  `total_amount × advance_percent / 100` (e.g. 500.00 on a 2500.00 order). On capture the payment →
  `PAID` and the order is auto-transitioned `ACCEPTED → CONFIRMED` by the actor `SYSTEM`
  (`orders.service.confirm_by_advance_payment`).
- **Balance intent** (`operation=BALANCE`) is allowed only while the order is `QUALITY_CHECK` or
  `COMPLETED`. Amount = `total_amount − advance captured`. On capture the payment →
  `SETTLED`, and a `Settlement` (gross = total, fee = 2%, net = gross − fee, status `RELEASED`)
  plus a `Payout` to the farmer (status `SETTLED`) are created automatically via
  `provider.transfer`.
- **Refunds** (full or partial) are allowed on payments in `PAID` or `PARTIALLY_REFUNDED`;
  `refunded_amount` tracks partials, status flips to `REFUNDED` at 100%.
- **Webhooks** accept provider events (`payment.captured`, `payment.failed`, `refund.processed`,
  `payout.completed`); duplicates are skipped idempotently by `provider_event_id`. Signature
  verification when `PAYMENT_WEBHOOK_SECRET` is configured.

## API

All endpoints live under `/api/v1/payments` and are role-scoped server-side (payment creation
requires a `BUYER`; admins may also confirm; refunds require the payer or an admin).

| Endpoint | Description |
| --- | --- |
| `POST /payments/intents` | Create an ADVANCE or BALANCE intent (idempotent via `idempotency_key`) |
| `POST /payments/{id}/confirm` | Confirm (capture) an intent against the sandbox provider |
| `POST /payments/webhook/{provider}` | Provider webhook receiver (open, signature-checked) |
| `POST /payments/{id}/refund` | Full or partial refund (payer or admin) |
| `GET /payments/orders/{order_id}` | All payments for an order |
| `GET /payments/orders/{order_id}/settlement` | Settlement + payout for an order (404 until settled) |
| `GET /payments` | List the caller's payments (BUYER) |

The frontend surfaces this in `OrderDetailPage` via a `PaymentSection` that shows the payment list,
the sandbox checkout/confirm modal, and the farmer's settlement card.

## Tests

`backend/tests/test_payments.py` (12 tests): advance intent created only after acceptance,
advance amount, sandbox confirm → order CONFIRMED by system, balance intent blocked until
quality/delivery, balance capture → settlement + payout release, refund full/partial/guards,
webhook idempotency, and role/ownership guards (403/404).

## Files Changed

- `backend/app/integrations/payment.py` (new) — provider ABC, mock provider, factory.
- `backend/app/db/models/transaction.py` — Payment enrichment + constraints.
- `backend/migrations/versions/20260906_0007_payment_batch_quality.py` (new) — payments + batches
  + quality-check schema (single head migration).
- `backend/app/modules/payments/{__init__,schemas,service,router}.py` (new), registered in
  `app/api/router.py`.
- `backend/app/modules/orders/service.py` — `SYSTEM` transitions, `apply_status_transition`
  wrapper, `confirm_by_advance_payment`.
- `backend/app/core/config.py` — payment settings.
- `backend/tests/test_payments.py` (new).
- `frontend/src/lib/payments.ts` (new), `frontend/src/components/payments/PaymentSection.tsx`
  (new), wired into `frontend/src/pages/orders/OrderDetailPage.tsx`.

## Checks Run

- Backend: **112 tests passed** (includes 20 new Phase 12+13 tests), `ruff check` clean,
  `compileall` OK, `alembic upgrade head --sql` OK.
- Frontend: `npx tsc -b` clean, `npm run lint` clean, `npm run build` clean (119 modules).

## Deferred

- Real Razorpay integration (mode `razorpay`) — schema and boundary are ready; provider
  implementation plus live webhook secret handling remains.
- Refund-to-source round trip against a live provider and payout status webhooks.
- Escrow / refund rules for disputed orders (Phase 14) and admin reconciliation tools (Phase 15).