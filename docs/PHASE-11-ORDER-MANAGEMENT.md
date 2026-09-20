# Phase 11 — Negotiation and Order Management

This phase turns "orders" into an end-to-end negotiated purchase workflow between buyers and
farmers: a buyer sends a purchase request for a listing, the farmer accepts, rejects, or
counter-offers, both sides can continue negotiating (with a full history), and the agreed order
moves through a strict fulfillment state machine to completion.

## Order Lifecycle

Orders now use the Phase 11 status set replacing the legacy payment-only statuses
(`PENDING_PAYMENT`, `ADVANCE_PAID`, `QUALITY_CONFIRMED`, `SETTLED`):

| Status | Meaning |
| --- | --- |
| `PENDING` | Buyer sent a purchase request; awaiting the farmer's response |
| `NEGOTIATING` | A counter-offer is on the table |
| `ACCEPTED` | Both parties agreed on quantity/price/delivery |
| `REJECTED` | The current offer was declined (terminal) |
| `CONFIRMED` | Buyer confirms the accepted terms |
| `PREPARING` | Farmer starts preparing the produce |
| `READY_FOR_PICKUP` | Farmer staged the order for pickup |
| `IN_TRANSIT` | Order is being shipped |
| `DELIVERED` | Farmer marks delivered |
| `QUALITY_CHECK` | Buyer performs the quality check |
| `COMPLETED` | Buyer confirms quality; order complete |
| `DISPUTED` | Either party raised a dispute |
| `CANCELLED` | Order cancelled while cancellable (terminal) |

## State Machine (invalid transitions rejected)

Allowed transitions (`ORDER_TRANSITIONS` in `service.py`):

```
PENDING        → NEGOTIATING, ACCEPTED, REJECTED, CANCELLED
NEGOTIATING    → NEGOTIATING, ACCEPTED, REJECTED, CANCELLED
ACCEPTED       → CONFIRMED, DISPUTED, CANCELLED
CONFIRMED      → PREPARING, DISPUTED, CANCELLED
PREPARING      → READY_FOR_PICKUP, DISPUTED, CANCELLED
READY_FOR_PICKUP → IN_TRANSIT, DISPUTED, CANCELLED
IN_TRANSIT     → DELIVERED, DISPUTED
DELIVERED      → QUALITY_CHECK, DISPUTED
QUALITY_CHECK  → COMPLETED, DISPUTED
DISPUTED       → COMPLETED
REJECTED/CANCELLED/COMPLETED → (terminal)
```

Role-gated transitions (`TRANSITION_ACTORS`):
- `ACCEPTED → CONFIRMED`, `DELIVERED → QUALITY_CHECK`, `QUALITY_CHECK → COMPLETED`,
  `DISPUTED → COMPLETED` require the **BUYER**.
- `CONFIRMED → PREPARING`, `PREPARING → READY_FOR_PICKUP`, `READY_FOR_PICKUP → IN_TRANSIT`,
  `IN_TRANSIT → DELIVERED` require the **FARMER**.

Any other transition returns `409 Conflict`; a wrong-role transition returns `403`.

## Data Model

`backend/app/db/models/marketplace.py`:
- `Order` — new `ck_orders_status_valid` constraint, plus `listing_id`, `crop_id`, `unit`,
  `requested_quantity/price/delivery_date`, `pending_offer_*` (mirror of the latest REQUEST/COUNTER
  for fast accept/reject), `agreed_quantity/unit/price/delivery_date`,
  `completed_at/cancelled_at/disputed_at`; relationships to `listing`, `crop`,
  `negotiation_messages`, `status_events`.
- `OrderNegotiationMessage` — each REQUEST/COUNTER/ACCEPT/REJECT with quantity, unit, price,
  delivery date, note (`ck_order_negotiation_from_role_valid`, `ck_order_negotiation_action_valid`,
  `ix_order_negotiation_order_created`).
- `OrderStatusEvent` — audit trail of every transition (`ck_order_status_events_role_valid`,
  `ix_order_status_events_order_created`).
- `order_items` rows created at request time with a `grade_snapshot` of the listing grade; the line
  item and `total_amount` are kept in sync with the agreed terms.

Migration `20260906_0006_negotiation_orders.py` maps legacy statuses (`PENDING_PAYMENT→PENDING`,
`ADVANCE_PAID→ACCEPTED`, `QUALITY_CONFIRMED→QUALITY_CHECK`, `SETTLED→COMPLETED`), swaps the orders
status check constraint, adds the new columns/FKs, and creates the two new tables.

## API

All order endpoints require a `BUYER` or `FARMER` token; the user's own profile, ownership, and
role are enforced server-side.

| Endpoint | Description |
| --- | --- |
| `POST /api/v1/orders` | Buyer creates a purchase request (validates listing is `PUBLISHED`, quantity ≤ available, not own listing) |
| `GET /api/v1/orders?status=` | List orders the caller is party to (role-scoped, newest first) |
| `GET /api/v1/orders/{id}` | Order detail + full negotiation and status history |
| `POST /orders/{id}/accept` | Accept the pending offer → `ACCEPTED`, agree terms, sync totals |
| `POST /orders/{id}/reject` | Decline the pending offer → `REJECTED` |
| `POST /orders/{id}/counter` | Counter-offer → `NEGOTIATING` |
| `POST /orders/{id}/status` | Explicit transition (`CONFIRMED`, `PREPARING`, …, `COMPLETED`) |
| `POST /orders/{id}/cancel` | Cancel while allowed (PENDING…READY_FOR_PICKUP) |
| `POST /orders/{id}/dispute` | Raise a dispute (ACCEPTED…QUALITY_CHECK) |

Each response includes `my_role` and `next_allowed_actions` (e.g. `accept`, `reject`, `counter`,
`confirm`, `prepare`, `deliver`, `quality_check`, `complete`, `cancel`, `dispute`) so the UI can
render exactly the valid actions for the current viewer.

Order numbers use `ORD-YYYYMMDD-<hex>`; source type is `NEGOTIATION`.

## Frontend

- `frontend/src/lib/orders.ts` — client types + API functions + `ACTION_LABELS` + status badge tones.
- `OrderStatusBadge`, `NegotiationThread`, `CounterOfferModal` components (shared by both roles).
- `pages/orders/OrdersPage` — role-aware list with status filter (`/buyer/orders`, `/farmer/orders`).
- `pages/orders/OrderDetailPage` — detail + history + action buttons driven by
  `next_allowed_actions` (shared by both roles).
- `ListingDetailPage` — buyers now get a **Request to buy** modal (quantity, offered price,
  delivery date, address, note) instead of a demand redirect; success navigates to the order.
- Buyer/Farmer dashboards link their **Orders** cards to the new pages.

## Tests

`backend/tests/test_orders.py` (15 tests): create success + guards (403 for farmers, 400 oversized,
409 responding to own offer), accept/reject/counter flows, buyer accepting a farmer counter-offer,
invalid transition rejection (409), wrong-actor transition (403), the full fulfillment chain
(accept → confirm → prepare → ready → in-transit → delivered → quality-check → complete → no
further cancel), cancellation, dispute + resolution, ownership (404 for outsiders), list + status
filter, and negotiation/status history preservation.

## Files Changed

- `backend/app/db/models/marketplace.py` — Order model evolution + new message/status-event tables.
- `backend/migrations/versions/20260906_0006_negotiation_orders.py` (new).
- `backend/app/modules/orders/` — `schemas.py`, `service.py`, `router.py`, `__init__.py` (new).
- `backend/app/api/router.py` — registers `orders_router`.
- `backend/tests/test_orders.py` (new).
- `frontend/src/lib/orders.ts` (new); `components/{OrderStatusBadge,NegotiationThread,CounterOfferModal}.tsx` (new).
- `frontend/src/pages/orders/{OrdersPage,OrderDetailPage}.tsx` (new).
- `frontend/src/pages/marketplace/ListingDetailPage.tsx` — Request to buy modal.
- `frontend/src/{app/App.tsx,pages/buyer/BuyerDashboardPage.tsx,pages/farmer/FarmerDashboardPage.tsx}` — routes + links.

## Checks Run

- Backend: **92 tests passed** (77 previous + 15 new), `ruff check` clean, `compileall` OK,
  `alembic upgrade head --sql` OK.
- Frontend: `npx tsc -b` clean, `npm run lint` clean, `npm run build` clean (113 modules).

## Deferred

- Payment capture and settlement wiring (Phase 12) — `DISPUTED` and `COMPLETED` currently have no
  money movement; payments tables already exist.
- Automated matching of demand IDs to orders and order expiration timeouts on stale `PENDING` offers.
- Notifications for new offers and status changes (Phase 15).