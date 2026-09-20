# Phase 22 - ML Model Evaluation and Comparison

Phase 22 formally evaluates every ML forecasting model in the workspace on
held-out validation and test splits, produces comparison tables, generates the
analysis plots, and selects the final model purely on measured performance.

## AI / ML Engine Architecture

The marketplace exposes three AI services through `/api/v1/ai/*`; Phase 22
evaluates and hardens the two trained forecasting components (Price, Demand).
Matching is a transparent hybrid-scoring engine (not a trained model) and is
therefore covered by the matching phase, not regression/forecasting evaluation.

```
                         AI/ML ENGINE
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      PRICE AI       MATCHING AI     DEMAND AI
          │              │              │
          ▼              ▼              ▼
     Regression       Ranking        Forecasting
          │              │              │
     LightGBM*        Hybrid        LightGBM*
                      Scoring
     (* Phase 22 winner; see tables below)
```

## Methodology

- **Data** (synthetic, seeded rng=42 so results are reproducible):
  `ml/data/synthetic_crop_prices.csv` (3000 rows), `ml/demand/data/synthetic_demand.csv` (4000 rows).
- **Split:** 70% train / 15% validation / 15% test (`random_state=42`). Models are
  fitted on the train split only; validation split drives selection; the test split
  is held out and reported as the honest generalization estimate.
- **Price metrics:** MAE, RMSE, R² (INR/kg).
- **Demand metrics:** MAE, RMSE, MAPE (kg per month; MAPE is appropriate here
  because demand targets are strictly positive with no zero/negative values).
- **Selection rule (documented, not "pick the fancy model"):**
  - Price: candidate with the highest **validation R²**. Any model within `0.005`
    R² of the best is treated as statistically tied; ties resolve on the lowest
    **test RMSE**, then toward the simplest model (linear < RF < XGBoost < LightGBM).
  - Demand: candidate with the lowest **validation RMSE**. A trained model is only
    selected if it beats the historical-average baseline by **≥ 2% relative RMSE**;
    otherwise the simple baseline wins.

## Price Model Comparison (target: unit_price, INR/kg)

| model | val_mae | test_mae | val_rmse | test_rmse | val_r2 | test_r2 |
|---|---|---|---|---|---|---|
| Mean Baseline (reference) | 20.4170 | 20.1590 | 26.0362 | 25.1735 | -0.0003 | -0.0003 |
| Linear Regression | 5.4110 | 5.8306 | 7.4301 | 7.8482 | 0.9185 | 0.9028 |
| Random Forest | 3.1505 | 3.3656 | 4.3875 | 4.6382 | 0.9716 | 0.9660 |
| LightGBM | 2.2199 | 2.1685 | 3.1800 | 3.1457 | **0.9851** | **0.9844** |
| XGBoost | 2.4537 | 2.6329 | 3.4856 | 3.7914 | 0.9821 | 0.9773 |

Full table: `ml/reports/price_model_comparison.csv` / `.md`.

## Demand Model Comparison (target: demand_kg / month)

| model | val_mae | test_mae | val_rmse | test_rmse | val_mape | test_mape |
|---|---|---|---|---|---|---|
| Historical Average Baseline | 499.6630 | 496.3516 | 694.2123 | 703.8649 | 43.6702 | 43.5198 |
| Random Forest | 134.5554 | 146.5201 | 203.6408 | 238.8957 | 9.0956 | 9.5148 |
| LightGBM | 114.4394 | 117.7270 | 173.7072 | 190.2765 | **7.5465** | **7.5156** |
| XGBoost | 122.6283 | 122.7872 | 179.1279 | 186.2216 | 8.4586 | 8.3250 |

Full table: `ml/reports/demand_model_comparison.csv` / `.md`. The historical baseline
tracks only `historical_demand`, which is far too coarse for a demand series driven by
buyer type, price elasticity, and festival/seasonal uplift (MAPE ≈ 44%). MAPE is reported
because all demand targets are strictly positive.

## Generated Plots (`ml/reports/plots/`)

- **Actual vs predicted** (held-out test): `price_actual_vs_predicted.png`,
  `demand_actual_vs_predicted.png`
- **Residual / error analysis**: `price_residuals.png`, `demand_residuals.png`
  (residuals-vs-predicted + histogram for the selected model),
  `price_residual_distribution.png`, `demand_residual_distribution.png` (per-model box plots)
- **Feature importance** (selected model): `price_feature_importance.png`,
  `demand_feature_importance.png`
- **Model comparison bars**: `price_model_comparison.png`, `demand_model_comparison.png`

## Final Model Selection and Rationale

### Price → LightGBM
- Best validation R² (0.9851) **and** best held-out test R² (0.9844), test MAE
  2.17 INR/kg, test RMSE 3.15 — the winner on every reported metric.
- The closest rival, XGBoost, trails by ~0.003 R² on validation and ~0.007 on
  test (≈ 0.6 INR/kg worse test RMSE), which exceeds the 0.005 tie tolerance on
  test. Random Forest (−0.019 validation R²) and especially Linear Regression
  (−0.067 validation R²) are measurably worse.
- LightGBM was **not** chosen because it is more advanced; the selection is based
  entirely on measured validation/test performance under the documented rule.
  The simplicity bias would have preferred Linear Regression only if its accuracy
  matched, which it does not.

### Demand → LightGBM
- Best validation RMSE (173.7 kg) and best MAPE (7.55% val / 7.52% test).
- Beats the historical-average baseline by **75.0% relative RMSE** — far beyond
  the 2% bar — so the deployed model is justified over the trivial baseline.
- XGBoost and Random Forest also vastly outperform the baseline, confirming the
  demand signal genuinely requires non-linear features; LightGBM wins among them
  on both validation and test MAPE.

## Verification

- `ml/tests` (25 tests) green against the exported artifacts; model-loading
  contract metadata (`model_version`, `best_model_name`, `residual_std`,
  `data_disclaimer`, metrics) intact.
- Backend `/api/v1/ai` price + demand tests (3 tests) pass end-to-end through
  `ml.predict` / `ml.demand.predict`.
- Live smoke prediction (Tomato / Nashik / June): price ₹27.23 (range 24.16–30.30),
  demand 2587 kg (range 2368–2806) — `model_version=v1.1.0-evaluated`,
  `best_model_name=LightGBM`.

## Artifacts Updated

- `ml/models/price_prediction_model.joblib` + `model_metadata.json`
- `ml/models/demand_model.joblib` + `demand_model_metadata.json`
- `ml/reports/{price,demand}_model_comparison.{csv,md,txt}` and `evaluation_summary.json`

Re-run everything with:

```bash
cd . && backend/.venv/bin/python -m ml.evaluation.compare
backend/.venv/bin/python -m pytest ml/tests -q
cd backend && .venv/bin/python -m pytest tests/test_ai.py -q
```