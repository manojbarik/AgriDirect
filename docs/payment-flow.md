# Payment Flow

A controlled, auditable money workflow built on a **pluggable provider boundary**. Today every
deployment uses the **mock provider** — no real money moves. Enabling a real provider
requires an explicit provider mode + credentials and is never done implicitly.

## 1. Provider boundary

- `app/integrations/payment.py` defines a provider interface; `get_payment_provider()` returns
  the configured provider by `PAYMENT_PROVIDER_MODE`.
- Implemented modes:
  - `mock` — in-process sandbox; `success` (auto-captures) or `fail` (marks failure) per
    `PAYMENT_MOCK_MODE`. Default `success`.
  - Razorpay is a **stub boundary, not implemented**. No credentials are shipped.
- **Non-dev guard:** when `APP_ENV` is not `development`/`test`, the webhook refuses events
  unless `PAYMENT_WEBHOOK_SECRET` is set, and mock-provider webhooks are only accepted in dev.
- **No real payment functionality is deployed without explicit provider credentials.**

## 2. Financial model

| Rule | Default | Setting |
| --- | --- | --- |
| Buyer pays an **advance** on acceptance to confirm | 20% of agreed total | `payment_advance_percent` |
| Remaining **balance** paid after quality confirmation | 80% | — |
| Platform **fee** charged on the farmer settlement | 2.0% | `payment_fee_percent` |
| Currency | INR | per payment |

## 3. Order-to-payment lifecycle

```
ACCEPTED
  │  buyer: POST /payments/intents {operation: ADVANCE}  (idempotency key)
  │  buyer: POST /payments/{id}/confirm          → provider capture
  ▼
CONFIRMED (order locked, fulfillment starts)
  │  batches → quality checks → pickup → DELIVERED
  │  buyer confirms receipt → QUALITY_CHECK (window: quality_confirmation_days = 2)
  ▼
QUALITY_CHECK
  │  buyer: POST /payments/intents {operation: BALANCE}
  │  buyer: POST /payments/{id}/confirm          → provider capture
  ▼
COMPLETED
  │  settlement released (eligible_at → released_at) with 2% fee
  ▼
FARMER PAYOUT
```

- **Order confirmation is payment-bound**: an accepted order moves to `CONFIRMED` only when the
  advance capture succeeds. Cancellation before that returns funds/undoes the offer.
- **Completion is payment-bound**: the balance capture (or an allowed refund route) completes
  the order. Delivery confirmation opens the quality window; the balance is due within it.

## 4. Payment entity types

| Operation | Trigger | Amount |
| --- | --- | --- |
| `ADVANCE` | acceptance → confirm | 20% of agreed total |
| `BALANCE` | quality confirmation | remaining 80% |
| `REFUND` | cancellation/dispute resolution | prescribed from `refunds` |

`payments` rows are immutable records: `idempotency_key` (client retry safety),
`provider_reference` per provider, `status`, and `provider_event_id` for webhook dedupe.

## 5. Webhooks (provider → system)

- `POST /payments/webhook/{provider}` is **public** but **signature-verified**:
  - Outside dev/test a missing `PAYMENT_WEBHOOK_SECRET` → `503`.
  - Any configured secret mismatch on `X-Webhook-Signature` → `401`.
  - Events deduplicated on `provider_event_id` — duplicate delivery is a no-op.
- Supported event kinds: `payment.captured`, `payment.failed`, `refund.processed`,
  `payout.completed` (mock emits the applicable subset).

## 6. Refunds & settlements

- Refund: `POST /payments/{id}/refund` (party or admin) returns captured amounts —
  used for pre-fulfillment cancellation and admin-resolved disputes.
- Settlement: one per order — `gross = agreed total`, `fee = 2%`, `net = gross − fee`;
  released automatically on completion, then a `payouts` row for the farmer is created.

## 7. Failure & edge cases

- `mock_fail` mode: capture marks `FAILED` with a failure code; intents of a *different op*
  that are still pending are refunded; order transitions are guarded — confirmation never
  happens without a successful advance.
- Idempotency: same `idempotency_key` returns the existing intent; same webhook `event_id`
  is ignored.
- Disputes can produce admin-triggered refunds and replacement-fulfillment (see
  [dispute-management.md](dispute-management.md)).

## 8. Admin visibility

- `GET /admin/payments`, `GET /admin/refunds` — payment/refund lists.
- `GET /payments/orders/{order_id}/settlement` — settlement + payout breakdown per order.

See also [api.md](api.md) (payments section) and `docs/PHASE-12-PAYMENTS.md`.