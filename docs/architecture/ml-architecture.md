# ML Architecture

## ML Goals

The first ML capabilities are:

1. AI price prediction for a crop, region, season, quality, and quantity context.
2. AI farmer-buyer matching using supply, demand, geography, timing, quality, and historical outcomes.
3. AI demand prediction by crop, region, season, and time horizon.
4. Farmer and buyer recommendations based on relevant marketplace signals.

## Separation From Core API

Training code lives in `ml/`. The backend owns authorization, request validation, feature access policy, prediction persistence, and fallback behavior. The API should call an inference boundary rather than importing notebooks or training scripts.

```text
Transactional data -> sanitized feature extraction -> feature snapshot
                                                     |
                                      +--------------+--------------+
                                      |                             |
                              offline training                 online inference
                                      |                             |
                              versioned artifact -> ML client -> prediction record
```

## Initial Model Strategy

Do not fabricate model quality before data exists. Begin with transparent baselines:

- Price: seasonal/regional median or a regularized regression baseline.
- Demand: historical count/quantity baseline by crop and region.
- Matching: rules plus a weighted score, then supervised ranking after enough labeled outcomes.
- Recommendations: rules/content-based ranking before collaborative filtering is justified.

XGBoost or LightGBM can be evaluated after a representative, consented dataset is available. The choice must be based on validation results, explainability, latency, and operational constraints rather than assumed superiority.

## Feature Categories

- Crop and variety
- Quality/grade
- Quantity and unit
- Farm and buyer region at an appropriate precision
- Harvest and required-by windows
- Indicative or historical price context
- Season and market conditions where legally and operationally available
- Fulfillment distance and capacity
- Historical acceptance, delivery, quality, and dispute outcomes

Do not use protected or unnecessary personal attributes. Exact personal identity data must not become a model feature merely because it is available.

## Prediction Contract

Every prediction should include:

- `prediction_id`
- `prediction_type`
- `value` or ranked candidates
- `unit` and currency where applicable
- `confidence` or calibrated uncertainty where supported
- `model_version`
- `feature_snapshot_id`
- `generated_at` and `expires_at`
- explanation or top contributing factors
- fallback indicator when a baseline was used

The UI must communicate that predictions are estimates, not guaranteed prices, demand, or transaction outcomes.

## Model Lifecycle

1. Define the target and business decision before collecting features.
2. Validate data quality, leakage risk, missingness, and label availability.
3. Create time-aware train/validation/test splits.
4. Train a baseline and candidate models with reproducible configuration.
5. Evaluate accuracy plus calibration, fairness/proxy risks, coverage, and latency.
6. Package the artifact with feature schema and model version.
7. Register the artifact and promote it only after review.
8. Monitor drift, missing features, error rates, and user/business outcomes.
9. Roll back to the previous model or a baseline when the model is unavailable or unsafe.

## Matching Design

Matching should be explainable and constraint-aware:

- Hard filters: crop compatibility, quantity availability, time window, service area, account status, and policy requirements.
- Soft score: distance, quality fit, price fit, reliability, historical fulfillment, and preferences.
- Output: ranked candidates plus reasons and disqualifying constraints where appropriate.

The system must not expose confidential buyer demand or farmer information to an unauthorized counterparty.
