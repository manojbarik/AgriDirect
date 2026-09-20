# Trust Score

A **transparent, factor-based explainable trust score** for `FARMER` and `BUYER` accounts.
Each user sees exactly why they scored as they did — no black box. Sensitive attributes
(phone, email, identity documents) are never read or used.

## 1. Formula

```
score (0–100) = 0.20 · verification
              + 0.25 · transaction_reliability
              + 0.20 · quality
              + 0.20 · rating
              + 0.15 · (100 − dispute_penalty)
```

Default weights (configurable via the `TRUST_*` settings):

| Component | Weight | Signal |
| --- | --- | --- |
| `verification` | 20% | Farmer/buyer profile verified (identity/KYC, payment method) |
| `transaction` | 25% | Completed, on-time, satisfied transactions (credit saturates at `trust_orders_for_full_credit = 10`) |
| `quality` | 20% | Quality-check pass rate; high grades / on-spec quantity |
| `rating` | 20% | Average 1–5 rating vs `trust_rating_target = 5` |
| `dispute` | 15% | Open/resolved-against disputes reduce the score |

`calculation_version = v1`; each score stores `contributing_factors` (component values +
explanations) so the UI can render the why.

## 2. Score bands

Scores map to bands used on public profiles and in matching, e.g.
`EXCELLENT / GOOD / FAIR / LIMITED` (thresholds in `app/modules/trust/`).

## 3. Compute & store

- Computed on demand (`GET /trust-score/me`) and stored in `trust_scores` (current) with a
  `trust_score_history` journal (initial, recalculated, admin-recalculated reasons).
- Recalculated automatically when the inputs change; **ADMIN** can force
  `POST /admin/trust-scores/{id}/recalculate`.
- Never the sole basis for an irreversible decision — the API returns a `LIMITS_NOTE`
  explaining the informational nature of the score.

## 4. Where scores appear

- `GET /trust-score/me` — my score + factor breakdown + history.
- Public farmer profile + marketplace listing pages — score band as a trust signal.
- AI matching (`/ai/match/*`) may use the band as one ranking input
  (see [ai-matching.md](ai-matching.md)).
- Admin lists (`/admin/farmers`, `/admin/buyers`) include scores for moderation.

## 5. Endpoints

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /trust-score/me` | FARMER/BUYER | Score detail + factors + history |
| `GET /admin/trust-scores` | ADMIN | All scores |
| `GET /admin/trust-scores/{user_id}` | ADMIN | Detail for a user |
| `POST /admin/trust-scores/{user_id}/recalculate` | ADMIN | Force recompute |

## 6. Design principles

- **Only measurable transaction factors** — no demographic or sensitive inputs.
- **Explainable today** — component values and `LIMITS_NOTE` returned on every read.
- **Risk-minimal** — informational only; decisions require human admin review.
- **Configurable** — weights/thresholds live in `app/core/config.py` per deployment.

See also `docs/PHASE-15-TRUST-SCORE.md`.