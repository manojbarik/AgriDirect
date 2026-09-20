# Phase 16 — Ratings and Reviews

This phase adds two-way ratings and reviews for completed orders. After an order reaches
`COMPLETED`, the buyer and the farmer may each review the other party exactly once, with a
1–5 star score and an optional comment. Every valid review refreshes the reviewee's trust score
through the Phase 15 trust engine.

## Rules

- Only the two parties of the order can review it: `403` for anyone else.
- Reviews are only allowed when `order.status == "COMPLETED"`: `409` otherwise.
- Each party reviews the other **once** per order — enforced by the unique constraint
  `ug_ratings_order_rater_rated (order_id, rater_id, rated_user_id)` (migration `20260906_0010`)
  plus an explicit pre-check that returns `409` with a readable message.
- A buyer's review targets the farmer (and vice versa) via the profile → user mapping
  (`FarmerProfile.user_id` / `BuyerProfile.user_id`).
- Valid reviews call `trust_service.maintain(db, reviewee, changed_by=user)` so the reviewee's
  score and history stay current, and emit a `new_review` in-app notification.

## Data Model

The existing `Rating` model (`app/db/models/social.py`, table `ratings`) is reused. This phase
adds the `comment` column:

- `score` (`int`, 1–5) — required star rating.
- `comment` (`str`, nullable, ≤ 2000 chars) — optional review text.
- `rater_id` / `rated_user_id` → `users.id`; `order_id` → `orders.id`.

Migration: `backend/migrations/versions/20260906_0010_ratings_comment.py`
(alembic revision `20260906_0010`, down `20260906_0009`).

## Module and API

New `app/modules/ratings` module. Endpoints:

| Endpoint | Access | Description |
| --- | --- | --- |
| `POST /ratings` | FARMER/BUYER (party) | Submit a review `{order_id, rating, comment?}` → `201` |
| `GET /ratings/orders/{order_id}` | FARMER/BUYER (party) | Rating state: `can_rate`, `my_rating`, `counterpart_rating` |
| `GET /ratings/users/{user_id}` | public | Average rating, count, and up to 20 recent reviews with reviewer name/role |

The marketplace farmer profile (`GET /marketplace/farmers/{id}`) now also returns the farmer's
`user_id`, so the public farmer profile page can load the full review history.

## Frontend

- `src/components/ratings/RatingSection.tsx` — shown in the order detail page when the order is
  `COMPLETED`: interactive star picker + optional comment, then displays your review and the
  counterpart's review once submitted.
- `src/pages/marketplace/FarmerProfilePage.tsx` — public rating summary: average, star badges,
  count, and the review history list.
- `src/lib/ratings.ts` — typed client for the endpoints above.

## Tests

`backend/tests/test_ratings.py` covers:

- Buyer rates farmer (`201`), duplicate review (`409`).
- Farmer rates buyer.
- Non-`COMPLETED` order → `409`.
- Non-party → `403`.
- Order rating state transitions (`can_rate` flips after reviewing; my/counterpart review shown).
- Public per-user summary (average 4.0, count 1, history with comment).
- Trust score integration: after a 5-star review on a completed order the farmer's
  `GET /trust-score/me` score reflects the rating factor plus transaction/dispute evidence from
  the completed order.

## Deferred

- Review moderation / reporting and editing or deleting reviews.
- Photo/video attachments and verified-purchase badges.