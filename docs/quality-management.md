# Quality Management

Fulfillment and quality in one auditable chain: confirmed order → farmer prepares a **QR-keyed
crop batch** → quality inspection → pickup → delivery → buyer receipt confirmation that opens
the quality/balance-payment window.

## 1. Concepts

| Term | Meaning |
| --- | --- |
| `crop_batches` | A fulfillment lot tied to one order; unique `batch_code` (QR key) |
| `quality_checks` | Inspection snapshots: grade, result, quantity, notes, evidence refs |
| `deliveries` | Pickup → delivery events per batch |
| Order statuses | `CONFIRMED` → `QUALITY_CHECK`/`DELIVERED` → `COMPLETED` |

## 2. Flow

```
CONFIRMED
  │ farmer: POST /batches/orders/{order_id}/prepare   → creates batch (status PREPARING)
  │ farmer: POST /batches/{batch_id}/inspect          → quality check (PASS/FAIL/PARTIAL)
  ▼
BATCH READY
  │ farmer: POST /batches/{batch_id}/pickup           → courier pickup event
  │ farmer: POST /batches/{batch_id}/deliver          → delivered
  ▼
QUALITY_CHECK (window = quality_confirmation_days = 2)
  │ buyer: confirm receipt → order.receipt_confirmed_at set
  ▼
BALANCE CAPTURE → COMPLETED
```

## 3. Quality checks

`POST /batches/{id}/inspect` records:

- `result`: `PASS` / `FAIL` / `PARTIAL`
- `quality_grade`: Grade A / B / C
- `quantity_received`, `damaged_quantity`
- `notes`, `evidence_reference` (photo refs)

A failing/incomplete batch blocks the delivery/confirmation progression; the failed quantity
can flow into a dispute (see [dispute-management.md](dispute-management.md)).

## 4. Delivery

- `pickup` records `picked_up_at` (+ optional provider reference).
- `deliver` records `delivered_at` and a destination snapshot.
- Buyer confirmation is required for the quality window (`receipt_confirmed_at`). If the buyer
  does not act within the window, the quality confirmation auto-advances so the balance
  payment can proceed — sellers are never stuck on an inactive buyer after delivery.

## 5. Roles & ownership

- Farmer performs prepare/inspect/pickup/deliver on their **own** order batches.
- Buyer confirms receipt; ownership checks raise `404` for other parties.
- `GET /batches`, `GET /batches/orders/{order_id}`, `GET /batches/{id}` lists are party-scoped.

## 6. Quality data → trust

Quality results feed the **quality component** (20%) of the trust score, and failures reduce
the farmer's reliability component (see [trust-score.md](trust-score.md)).

See also [api.md](api.md) (`/batches`) and `docs/PHASE-13-BATCH-QUALITY.md`.