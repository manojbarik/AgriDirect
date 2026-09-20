# Dispute Management

A manual, auditable dispute-resolution workflow for disagreements over quality, delivery, or
payment between order parties. The system preserves the pre-dispute state so a resolution can
return the order to its prior milestone.

## 1. Lifecycle

```
OPEN → UNDER_REVIEW → (RESOLVED | REFUNDED | REPLACED)
        step transitions are recorded in dispute_status_events
```

Current statuses used by the workflow: `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `REJECTED_CLOSED`,
`REFUNDED`, `REPLACED` (guarded transitions only).

## 2. Raising a dispute (party)

- `POST /disputes` requires a party on the order and an order in a dispute-eligible status.
- Payload: `category` (e.g., `quality`, `delivery`, `payment`), `description`,
  `requested_resolution` (e.g., `full_refund`, `replacement`, `adjustment`).
- Raising stores the order's `pre_dispute_status` so resolution can restore or complete it.

## 3. Evidence & audit

- Disputes keep a `dispute_status_events` trail: `from_status`/`to_status`, `reason`,
  `changed_by_id` + role — a complete, attributable record.
- Disputes have an `open_dispute`-window: an order under dispute is still visible to both
  parties and admins but withheld from destructive transitions.

## 4. Admin review

- `GET /disputes/admin/list` — moderation queue.
- `POST /disputes/admin/{dispute_id}/review` — ADMIN decides:
  - resolve in favor of a party (`RESOLVED`), optionally triggering a **refund** of the
    appropriate payment;
  - accept a **replacement** (`REPLACED`) and mark the replacement order for re-fulfillment;
  - or close without action (`REJECTED_CLOSED`).
- `POST /disputes/admin/replacements/{replacement_id}/complete` — ADMIN completes an accepted
  replacement fulfillment.

## 5. Financial interplay

- Admin resolution can create a `refunds` record against the relevant payment(s); the order is
  marked `REFUNDED` if fully refunded.
- A replacement creates a linked replacement order; both parties see the updated state.
- Settlement/payout logic treats refunded/disputed amounts conservatively
  (see [payment-flow.md](payment-flow.md)).

## 6. Data (tables)

| Table | Purpose |
| --- | --- |
| `disputes` | category, description, requested_resolution, resolution, deadline, status |
| `dispute_status_events` | full audit trail of transitions |
| `replacements` | accepted-replacement flow (replacement_order_id, completed_at) |
| `refunds` | refund links to payments + disputes |

See also [api.md](api.md) (`/disputes`) and `docs/PHASE-14-DELIVERY-DISPUTES.md`.