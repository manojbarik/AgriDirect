# Phase 15 — Trust Score Engine

This phase adds a transparent, configurable trust score for farmers and buyers. The score is an
**informational signal** computed only from verifiable, non-sensitive platform activity. It is
never the sole basis for an irreversible decision (refunds, bans, payouts are all gated by human
actions elsewhere), and it never includes sensitive attributes as inputs.

## Score Model

A single 0–100 score with five weighted components. Weights live in `Settings` so they can be
tuned without code changes:

| Component | Weight | Rolls up |
| --- | --- | --- |
| Verification | 20 | identity / payment verification status |
| Transaction reliability | 25 | orders, deliveries, payments, cancellations |
| Quality | 20 | quality checks (PASS) + receipt confirmations |
| Rating | 20 | peer ratings vs target |
| Dispute | 15 | low dispute rates reward, high dispute rates penalize |

Farmers and buyers have **separate factor sets** under the transaction component:

- **Farmer**: successful orders, on-time delivery reliability, cancellation rate (attributed via
  `OrderStatusEvent.changed_by_role`), PASS quality checks, buyer ratings, dispute rate.
- **Buyer**: successful payments (fully-paid orders), payment reliability (charged vs attempts),
  cancellation rate (buyer-cancelled), order completion (foundational orders), farmer ratings,
  disputes opened.

Empty history is treated as truthful-alongside-caution, not proof of poor behavior; a fresh,
verified user scores 20 (verification only) plus any established factors.

## Bands

| Band | Range | Meaning |
| --- | --- | --- |
| `NEW` | score ≤ 0 | No trust evidence yet |
| `LOW` | < 40 | Trust concerns present |
| `MEDIUM` | 40–69 | Emerging trust |
| `HIGH` | ≥ 70 | Strong trust |

Factors also carry a kind (`positive` / `penalty` / `neutral`) that drives the human-readable
"why this score" line and the "concerns" list shown to users and admins.

## History

Every score write is recorded in the new `trust_score_history` table (`revision 20260906_0009`),
append-only, pruned to `trust_history_limit` (default 50) rows per user. A row records the
score, band, calculation version, reason (`INITIAL` / `RECALCULATED` / `ADMIN_RECALCULATED`),
the full factor breakdown, and who forced the change (`changed_by_id` + `changed_by_role`).

Scoring is idempotent: when a request would produce an unchanged score, no new history row is
written.

## API

New `app/modules/trust` module. Endpoints:

| Endpoint | Access | Description |
| --- | --- | --- |
| `GET /trust-score/me` | FARMER/BUYER | Your score, band, why + concerns, component/factor breakdown, recent history, limits note |
| `GET /admin/trust-scores?role=&recalculate=` | ADMIN | Score list for all farmers/buyers; `recalculate=true` re-runs the full engine and writes any changes |
| `GET /admin/trust-scores/{user_id}` | ADMIN | Full breakdown for one user |
| `POST /admin/trust-scores/{user_id}/recalculate` | ADMIN | Force a full recalculation (writes `ADMIN_RECALCULATED` history) |

Admins do not receive a trust score (`GET /trust-score/me` → 403 for ADMIN).

## Configuration

New `Settings` values:

- `trust_calculation_version` (`v1`) — stamped on every score and history row.
- `trust_*_weight` — the five component weights above.
- `trust_orders_for_full_credit` (`10`) — order-count cap for the "successful orders" factor.
- `trust_rating_target` (`5.0`) — rating scale reference point.
- `trust_history_limit` (`50`) — history rows retained per user.

## Guarantee

- No sensitive attributes (documents, exact finances, identity details) are factors or inputs.
- No irreversible decision is made automatically from the score; the modules that make
  reversible marketplace recommendations can consume it, while refunds, bans, and payouts stay
  human-driven.
- The engine is deterministic and versioned; changing the version makes prior snapshots
  comparable rather than silently rewriting them.