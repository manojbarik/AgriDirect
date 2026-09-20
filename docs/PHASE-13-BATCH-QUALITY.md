# Phase 13 — Fulfillment and Quality Management

This phase gives confirmed orders a traceable physical journey: the farmer prepares a **crop
batch** (quantity, harvest date, grade, packaging, photo references), quality is recorded by
either party against that batch, and the batch moves through pickup → in-transit → delivered in
lockstep with the parent order.

## Batch Lifecycle

A batch is auto-created when an order enters `PREPARING` (`orders.service._ensure_batch`),
keyed `BATCH-{public_order_number}` and seeded to the agreed quantity. Batches hold their own
status track:

| Status | Meaning |
| --- | --- |
| `PREPARING` | Batch created, farmer is assembling the produce |
| `PREPARED` | Farmer captured quantity/harvest/grade/packaging |
| `INSPECTING` | Quality inspection in progress |
| `PASSED` | Quality check passed |
| `PROBLEM` | Quality problem recorded |
| `DELIVERED` | Batch delivered with the order |
| `DISPUTED` | Batch (e.g. quality) disputed |

Sub-status tracks keep the detail view readable: `preparation_status`
(`NOT_STARTED`/`PREPARING`/`PREPARED`), `pickup_status` (`NOT_STARTED`/`PICKED_UP`), and
`delivery_status` (`NOT_STARTED`/`IN_TRANSIT`/`DELIVERED`).

## Quality Checks

`QualityCheck` rows are attached to a batch with `result` constrained to `PASS`/`PROBLEM`,
plus `quality_grade`, `quantity_received`, `damaged_quantity`, `notes`, and evidence reference.
Recording a `PASS` moves the batch (and via a sync, the order) forward; a `PROBLEM` parks the
batch and flags the order for dispute/rework.

## Flow Integration with Orders

- `POST /orders/{id}/prepare` equivalent via batches — starting preparation records the batch and
  moves the order `CONFIRMED → PREPARING`.
- Batch `PASSED` syncs the order to `READY_FOR_PICKUP`; pickup syncs `READY_FOR_PICKUP →
  IN_TRANSIT`; delivery syncs `IN_TRANSIT → DELIVERED` and stamps `delivered_at`.
- A disputed problem batch also disputes the parent order (role-gated).

## API

All endpoints under `/api/v1/batches`, role-scoped (preparation requires `FARMER`/`ADMIN`,
inspection requires a party to the order or an admin). Route ordering: `/orders/{order_id}`
before `/{batch_id}`.

| Endpoint | Description |
| --- | --- |
| `GET /batches` | List the caller's batches (farmer's own, or admin) |
| `GET /batches/orders/{order_id}` | Batches for an order |
| `POST /batches/orders/{order_id}/prepare` | Create/update the batch → `PREPARED`, order → `PREPARING` |
| `GET /batches/{batch_id}` | Detail + quality history + `next_allowed_actions` |
| `GET /batches/{batch_id}/quality-checks` | Quality-check history |
| `POST /batches/{batch_id}/inspect` | Record a PASS/PROBLEM quality check |
| `POST /batches/{batch_id}/pickup` | Mark picked up (requires `PASSED`) |
| `POST /batches/{batch_id}/deliver` | Mark delivered (requires `PICKED_UP`) |
| `POST /batches/{batch_id}/dispute` | Raise a dispute (party role) |

## Frontend

- `frontend/src/lib/batches.ts` — client types + API functions + status/action labels.
- `components/batches/BatchDetailView.tsx` — full batch card: status badges, prepare/inspect
  modals, pickup/deliver/dispute buttons driven by `next_allowed_actions`.
- `components/batches/BatchSection.tsx` — order-scoped batch list with a **Start preparation**
  button shown to the farmer while the order is `CONFIRMED`; embedded in `OrderDetailPage`.
- `pages/batches/FarmerBatchesPage.tsx` — `GET /batches` list with fold-out details; routed at
  `/farmer/batches` and linked from the farmer dashboard (dashboard now returns
  `batches_count`).

## Tests

`backend/tests/test_batches.py` (8 tests): batch creation via prepare (no duplicates), quality
pass/problem permutations, pickup/delivery gating on previous steps, problem → dispute sync with
the order, and role/ownership guards.

## Files Changed

- `backend/app/db/models/marketplace.py` — `CropBatch` enrichment (crop_id, farmer_id, harvest
  date, grade, photo references, three sub-status tracks, batch status constraint, farmer-status
  index) and `QualityCheck` enrichment.
- `backend/migrations/versions/20260906_0007_payment_batch_quality.py` (new) — combined with
  Phase 12 migration.
- `backend/app/modules/batches/{__init__,schemas,service,router}.py` (new), registered in
  `app/api/router.py`.
- `backend/app/modules/orders/service.py` — `_ensure_batch` auto-creation on `PREPARING`.
- `backend/modules/farmer/` — dashboard gains `batches_count`.
- `backend/tests/test_batches.py` (new).
- `frontend/src/lib/batches.ts` (new), `frontend/src/components/batches/{BatchDetailView,
  BatchSection}.tsx` (new), `frontend/src/pages/batches/FarmerBatchesPage.tsx` (new),
  `frontend/src/app/App.tsx` route, farmer dashboard link + count.

## Checks Run

- Backend: **112 tests passed**, `ruff check` clean, `compileall` OK,
  `alembic upgrade head --sql` OK.
- Frontend: `npx tsc -b` clean, `npm run lint` clean, `npm run build` clean (119 modules).

## Deferred

- Traceability hash-chain / provenance ledger per batch (photo + geo evidence uploads).
- Delivery-location tracking with provider geo events; buyer-side delivery confirmation flow.
- Quality-check failure rework loop (farmer re-prepare after `PROBLEM`) — currently `DISPUTED`
  parks the batch until Phase 14 dispute resolution.