# AI — Farmer-Buyer Matching

A **transparent hybrid-scoring ranking engine** (not a trained ML model) that matches farmers
and buyers on live marketplace data. Every returned score is explainable back to its inputs,
with per-factor reasons and thresholds.

## 1. Endpoints

| Endpoint | Direction | Semantics |
| --- | --- | --- |
| `POST /api/v1/ai/match/farmers` | buyer → farmer | Rank farms/listings for a buyer's crop requirements |
| `POST /api/v1/ai/match/buyers` | farmer → buyer | Rank buyers/demands for a farmer's listing |

Both return `MatchResponse` items: `match_score` (0–100), a ranking, and an explanation list
`factors` (`{factor, score, weight, reason}`).

## 2. Algorithm

`matching-v1` — deterministic, explainable weighted compatibility scoring
(`backend/app/modules/ai/matching.py`). No neural network; scores decompose into six factors:

| Factor | Weight | What it measures | Pass threshold |
| --- | --- | --- | --- |
| crop | 0.25 | crop + variety compatibility | 50 |
| price | 0.20 | listed/demand price bands overlap | 60 |
| quantity | 0.15 | requested vs available quantities | 60 |
| location | 0.15 | Haversine distance proximity | 55 |
| timing | 0.15 | availability window vs required-by date | 60 |
| trust | 0.10 | counterparty trust band | 60 |

Final rating: `match_score = Σ wᵢ · factor_scoreᵢ`, threshold-gated per factor so a hard
mismatch (e.g., wrong crop or unavailable delivery window) legitimately drops the match.

Each result item carries `reason` strings built from the factor labels so users see **why**
a match scored as it did (e.g., "Crop matches", "Location nearby", "Trusted counterparty").

## 3. Inputs / response example

```jsonc
// POST /ai/match/farmers
{ "crop_name": "Tomato", "category": "Vegetable", "quantity_kg": 500,
  "state": "Maharashtra", "district": "Nashik", "month": 6 }
// → { "results": [ { "match_score": 87.4, "party_id": "...",
//      "factors": [ {"factor":"crop","score":100,"weight":0.25,"reason":"Crop matches"}, ... ] } ],
//      "model_version": "matching-v1", "disclaimer": "DEMO MATCHING: ..." }
```

## 4. Trust integration

The trust component reads the counterpart's current trust score band so the rank reflects
verification/reliability without revealing raw sensitive data.

## 5. Decision & audit

- Deterministic and versioned (`matching-v1`); weights are explicit in the response
  `ALGORITHM` string.
- Used for discovery/preview only; users can still negotiate directly with any listing.
- No training data, no `ai_predictions` rows for listing matching (matching is not a
  prediction); price/demand predictions are audited.

## 6. Relationship with ML

Price and demand predictions feed farmer/buyer pricing and quantity decisions before they
match; the match itself is the transparent ranker above.

See `docs/PHASE-9-MATCHING.md` and `docs/PHASE-8-PRICE-PREDICTION.md` for the phase history.