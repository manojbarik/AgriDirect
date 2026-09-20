# Phase 17 — Notification System

This phase adds an in-app notification layer so users learn about marketplace events the moment
they happen, with a pluggable provider abstraction ready for real email/SMS/push delivery later.

## Design

- **Central `emit()` hook** in `app/modules/notifications/service.py`:
  `emit(db, event_type, *, user_id, changed_by=None, **context)`. It renders the title/body from
  the event template, inserts a `Notification` row for the recipient, and hands the rendered
  message to every registered provider. It is **fail-soft**: a notification problem never breaks
  the business transaction that caused it.
- **Templates** (`templates.py`): one `(title, body)` per event; body supports `{key}`
  substitution from context. Unknown keys are left as-is.
- **Providers** (`providers.py`): a `NotificationProvider` ABC and a registry with no-op
  `EMAIL` / `SMS` / `PUSH` stubs (log only). Real providers can be registered later with no
  changes to call sites.
- In-app delivery is the only channel used now (`channel="IN_APP"`), tracked on the `Notification`
  table that already existed (`channel`, `notification_type`, `title`, `body`, `read_at`,
  `delivery_status`, `provider_reference`). No migration was required.

## Events Wired

All 14 lifecycle events notify the right person:

| Event | Triggered when | Recipient |
| --- | --- | --- |
| `registration` | user registers | the user |
| `verification` | verification approved (identity verify / admin farmer & buyer VERIFIED) | the user |
| `new_buyer_demand` | buyer creates a demand | farmers with PUBLISHED listings, same crop + state (cap 20) |
| `new_farmer_match` | farmer publishes a listing | buyers with DRAFT demands, same crop + state (cap 20) |
| `order_request` | buyer requests to buy | the farmer |
| `order_accepted` | farmer accepts the offer | the buyer |
| `delivery_update` | order moves to READY_FOR_PICKUP / IN_TRANSIT / DELIVERED | the buyer |
| `quality_confirmation` | order moves to QUALITY_CHECK / COMPLETED | the farmer |
| `payment_received` | advance or balance payment captured | the farmer |
| `settlement` | settlement released on balance capture | the farmer |
| `refund` | admin refund processed | the paying buyer |
| `batch_ready` | batch prepared and ready for pickup | the buyer |
| `dispute` | dispute opened (or status change) | farmer + buyer |
| `new_review` | review submitted (Phase 16) | the reviewee |

## API

| Endpoint | Access | Description |
| --- | --- | --- |
| `GET /notifications?unread_only=&limit=` | FARMER/BUYER/ADMIN | List my notifications (newest first) |
| `GET /notifications/unread-count` | FARMER/BUYER/ADMIN | `{unread_count}` |
| `POST /notifications/{notification_id}/read` | owner | Mark one as read → returns the row |
| `POST /notifications/read-all` | owner | Mark everything as read → `{unread_count}` |

Read/read-all endpoints enforce ownership; a user can only read their own notifications.

## Frontend

- `src/lib/notifications.ts` — typed client + event-title map.
- `src/components/notifications/NotificationBell.tsx` — bell with live unread count (polls every
  30s and on focus), linking to the notification center; placed on the farmer and buyer
  dashboards.
- `src/pages/notifications/NotificationsPage.tsx` — `/notifications` route (protected): All/Unread
  filter, unread highlighting, mark-one-read, and mark-all-read.

## Tests

`backend/tests/test_notifications.py` covers:

- Registration + verification events are created for a new user.
- `new_buyer_demand` reaches farmers with matching published listings.
- `order_request` reaches the farmer on a real order.
- `new_review` reaches the reviewee after a rating.
- Mark-one-read and mark-all-read update `unread_count` correctly.
- List/unread endpoints require auth.

## Deferred

- Notification preferences (opt-in per event / channel) and unsubscribe tokens.
- Real EMAIL/SMS/PUSH providers, retries, and delivery-status tracking.
- Push via websocket/SSE for instant badge updates.