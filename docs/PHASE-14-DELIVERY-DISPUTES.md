# Phase 14 — Delivery, Receipt, and Dispute Management

This phase completes the money-back guarantee loop and adds a manual, auditable dispute
resolution workflow:

- **Buyer receipt confirmation** — on delivery the buyer has a quality-confirmation window
  (`quality_confirmation_days`, default 2) to inspect the produce; `QUALITY_CHECK` records the
  receipt confirmation timestamp.
- **Disputes are raised by the buyer** against any in-progress order. The order pauses in
  `DISPUTED` (its pre-dispute status is remembered) until a human admin decides.
- **No auto-approval**: an admin picks `REFUND`, `REPLACEMENT`, or `REJECT`. Refunds execute only
  through that explicit decision (the old buyer-initiated refund endpoint is now admin-only).
- **Auditable trail**: every status change for disputes, refunds, and replacements is written to
  `dispute_status_events` with who (user id + role), when, the reason, and the previous/new
  status. Order transitions caused by resolutions are recorded as `SYSTEM` (the admin identity
  lives in the dispute trail).

## Order Status Additions

`REFUNDED` and `REPLACED` are new terminal order statuses.

| Status | Meaning |
| --- | --- |
| `DISPUTED` | Order paused; buyer has raised a dispute |
| `REFUNDED` | Admin approved a refund; captured payments refunded in full |
| `REPLACED` | Admin approved and completed a replacement |

New delivery columns on `orders`: `quality_confirmation_deadline`, `receipt_confirmed_at`,
`pre_dispute_status`, `refunded_at`, `replaced_at`.

- `DELIVERED` sets `quality_confirmation_deadline = delivered_at + quality_confirmation_days`.
- `QUALITY_CHECK` sets `receipt_confirmed_at` (the buyer's confirmation of receipt).
- Manual order transitions into `DISPUTED` no longer exist; entry is via the disputes module.
- `DISPUTED → {REFUNDED, REPLACED}` are `SYSTEM`-only transitions; `REJECT` restores the order to
  `pre_dispute_status` via a `SYSTEM` restore event.

## Dispute Lifecycle

| Status | Meaning |
| --- | --- |
| `OPEN` | Buyer filed the dispute; order is `DISPUTED` |
| `UNDER_REVIEW` | Admin opened the dispute for review |
| `REFUND_APPROVED` | Admin decision: refund captured payments, order → `REFUNDED`, dispute → `CLOSED` |
| `REPLACEMENT_APPROVED` | Admin decision: replacement requested; order stays `DISPUTED` |
| `REJECTED` | Admin rejected; order restored to `pre_dispute_status` |
| `CLOSED` | Resolution complete (refund executed or replacement completed) |

`disputes.resolution` records `REFUND`, `REPLACEMENT`, or `REJECTED`.

## API

New `app/modules/disputes` module routed under `/api/v1/disputes`.

| Endpoint | Access | Description |
| --- | --- | --- |
| `POST /disputes` | BUYER | Open a dispute on a disputable order (order → `DISPUTED`) |
| `GET /disputes` | BUYER/FARMER | Disputes the caller is a party to |
| `GET /disputes/{dispute_id}` | party/admin | Dispute + full audit trail |
| `GET /disputes/orders/{order_id}` | party/admin | Disputes for one order |
| `GET /disputes/admin/list?status=` | ADMIN | Admin dispute queue |
| `POST /disputes/admin/{id}/review` | ADMIN | Decide: `REFUND` / `REPLACEMENT` / `REJECT` + reason |
| `POST /disputes/admin/replacements/{id}/complete` | ADMIN | Complete an approved replacement → order `REPLACED` |

Supporting changes:

- `POST /orders/{order_id}/dispute` removed; `dispute_order` service removed (replaced by
  `_dispute_entry` + public `mark_order_disputed` / `restore_from_dispute`).
- `GET /orders` response now exposes `quality_confirmation_deadline`, `receipt_confirmed_at`,
  `pre_dispute_status`, `refunded_at`, `replaced_at` on the detail payload.
- `POST /payments/{payment_id}/refund` is **ADMIN-only** (no auto-approval; buyers no longer
  refund themselves). `RefundCreate.dispute_id` links a refund to the issuing dispute.
- Batch disputes (`POST /batches/{id}/dispute`) now only flag the batch `DISPUTED` — the parent
  order no longer auto-transitions; quality disputes go through the formal buyer dispute flow.

## Frontend

- `frontend/src/lib/disputes.ts` — dispute types, status tone/labels, API functions.
- `components/disputes/DisputeSection.tsx` — order-scoped dispute list with audit timeline and a
  **Raise dispute** modal (category, details, requested resolution); embedded in
  `OrderDetailPage` and triggered from the order's `dispute` action.
- `components/AdminRoute.tsx` + `pages/admin/AdminDisputesPage.tsx` — admin dashboard at
  `/admin/disputes` with queue tabs (OPEN / UNDER_REVIEW / REPLACEMENT_APPROVED / REJECTED /
  CLOSED), decision buttons (refund / replacement / reject) with a mandatory reason prompt, and
  "complete replacement" for pending replacements.
- `lib/orders.ts` — `REFUNDED`/`REPLACED` added to status tones and the orders status filter;
  `OrderDetailPage` shows delivered/receipt/quality-deadline rows.
- `AccountPage` gains an admin link to the dispute dashboard.

## Tests

`backend/tests/test_disputes.py` (12 tests): buyer-only dispute creation + order lock, farmer 403,
admin REJECT restores the pre-dispute order status, admin REFUND settles refunds and closes order
to `REFUNDED`, admin REPLACEMENT → `REPLACED` on completion, refund block when no captured
payments, admin-only review, delivery quality-deadline + receipt stamps, party visibility, queue
filtering, and double-decision conflicts. Existing suites updated for the new rules
(`test_orders.py`, `test_batches.py`, `test_payments.py`, plus an `admin_user` helper).

## Checks Run

- Backend: **122 tests passed**, `ruff check` clean, `compileall` OK,
  `alembic upgrade head --sql` OK (migration `20260906_0008`).
- Frontend: `npx tsc -b` clean, `npm run lint` clean, `npm run build` clean (123 modules).

## Deferred

- Buyer side submits photo/geo evidence; admin review decisions reference uploaded evidence.
- Escrow-style auto-reminders when the quality-confirmation window lapses.
- Automatic replacement order creation (a new order reusing the agreed terms).