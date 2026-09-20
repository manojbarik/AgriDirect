# Phase 9 — AI Farmer-Buyer Matching

This phase adds a fully explainable farmer-buyer matching engine. Instead of a black-box neural network (which is inappropriate without sufficient training data), we use a **transparent weighted compatibility algorithm** where every match score decomposes into six documented factors.

## Approach

**match_score = Σ(weight × factor_score); weights sum to 1.0, scores are 0-100.**

| Factor | Weight | What it measures |
| --- | --- | --- |
| Crop compatibility | 0.25 | Crop/variety matches the request |
| Price compatibility | 0.20 | Listing/demand price vs. the counterpart's target range |
| Quantity compatibility | 0.15 | Available quantity vs. required quantity |
| Location compatibility | 0.15 | Haversine distance (km), fallback to same state/district |
| Timing compatibility | 0.15 | Delivery by a date fits the harvest window |
| Trust compatibility | 0.10 | Live trust score of the counterparty |

Each factor also carries a `passed` flag (thresholds documented in the service) and a short human-readable `detail`, so the UI can show **why** any match was recommended, for example:

```
92% match
✓ Crop matches     ✓ Quantity matches
✓ Location nearby  ✓ Price compatible  ✓ Delivery date compatible
```

## Endpoints

- `POST /api/v1/ai/match/farmers`
  - Input: buyer crop requirements (`crop_name`, `quantity_required`, `target_price`/`target_min/max`, location, `required_by`, `quality_requirements`).
  - Output: ranked published listings with per-factor breakdowns, reasons, and match score.
- `POST /api/v1/ai/match/buyers`
  - Input: farmer produce (`crop_name`, `available_quantity`, `expected_price`, location, `available_from/until`, `grade`).
  - Output: ranked open buyer demands with the same explanation structure.

Both return `model_version` (`matching-v1`), an algorithm summary, the query, ranked matches, and a demo disclaimer. No ML model or trained weights are used — scoring is deterministic and recomputed live against marketplace data.

## Data Sources

- Farmer side: published `crop_listings`, their `farms` (state/district/lat-lng), `crop` metadata, and the farmer's `trust_scores`.
- Buyer side: open `buyer_demands` (non-cancelled), the buyer's location, and the buyer's `trust_scores`.

## Frontend

- **Buyer page `/buyer/recommendations`:** form (crop, quantity, price range, location, date, quality) → ranked farmer cards with a big match "92%" badge, per-factor chips (✓/✗ with score), and a checklist of why the match was recommended.
- **Farmer page `/farmer/recommendations`:** form (crop, quantity, price, location, availability window, grade) → ranked buyer cards with the same explanations.
- Dashboard entry points updated: buyer dashboard "AI farmer matches →" and farmer dashboard "AI buyer recommendations".

## Tests

`backend/tests/test_ai_matching.py` (6 tests):
- Match farmers returns a ranked match with all six factors and expected reasons.
- Matches are sorted by score descending.
- Unknown crop returns an empty list (not an error).
- Invalid payload (negative quantity) returns 422.
- Match buyers finds an open demand created for a matching crop.
- Match buyers with unknown crop returns empty.

## Files Changed

- `backend/app/modules/ai/schemas.py` — matching request/response schemas.
- `backend/app/modules/ai/matching.py` — algorithm and queries (new).
- `backend/app/modules/ai/router.py` — two new endpoints.
- `frontend/src/lib/ai.ts` — client types + `matchFarmers`/`matchBuyers`.
- `frontend/src/pages/buyer/BuyerRecommendationsPage.tsx` (new).
- `frontend/src/pages/farmer/FarmerRecommendationsPage.tsx` (new).
- Dashboard links and routes added.

## Deferred

- Costed logistics/delivery distance providers, real-time distance APIs (geocoding strike).
- Matching across offers/negotiations once orders exist (Phase 11+).
- Live versioned match model registry.