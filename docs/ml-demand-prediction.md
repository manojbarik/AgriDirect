# ML — Demand Forecasting

Regression model that forecasts crop **demand (kg / month)** for a location and context.
Served at `POST /api/v1/ai/demand-prediction`.

## 1. Task

- **Target:** `demand_kg` (kg/month), continuous forecasting.
- **Inputs:** `crop_name`, `variety`, `category`, `state`, `district`, `season`, `month`,
  `buyer_type`, `price`, `quantity_sold`, `historical_demand`, `is_holiday_event`.

## 2. Data

- Synthetic (seeded, reproducible): `ml/demand/data/synthetic_demand.csv` (4000 rows,
  buyer types, states/districts, seasons, holiday events).
- `is_synthetic: true` — demo/prototype model.

## 3. Preprocessing & pipeline

- `ml/demand/preprocessing.py`: `ColumnTransformer` — numerical → `StandardScaler`;
  categorical → `OneHotEncoder(handle_unknown="ignore")`.
- Pipeline: `preprocessor → regressor` (defaults `n_estimators=100`, `random_state=42`).

## 4. Evaluation (Phase 22)

70/15/15 split, `random_state=42`, test held out. Metrics: MAE, RMSE, **MAPE** (appropriate —
all demand targets are strictly positive, no zeros/negatives). The **historical-average
baseline** (predict `historical_demand`) competes alongside the ML candidates.

| model | val_mae | test_mae | val_rmse | test_rmse | val_mape | test_mape |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Historical Average Baseline | 499.66 | 496.35 | 694.21 | 703.86 | 43.67% | 43.52% |
| Random Forest | 134.56 | 146.52 | 203.64 | 238.90 | 9.10% | 9.51% |
| **LightGBM** | **114.44** | **117.73** | **173.71** | **190.28** | **7.55%** | **7.52%** |
| XGBoost | 122.63 | 122.79 | 179.13 | 186.22 | 8.46% | 8.33% |

Full tables + plots: `ml/reports/demand_model_comparison.*` and `ml/reports/plots/`.

### Selection rationale

- **Primary: validation RMSE**, with a documented bar: an ML model must beat the baseline by
  **≥ 2% relative RMSE** or the simple baseline is selected (an ML model is not deployed just
  for being ML).
- LightGBM beats the history baseline by **~75% relative RMSE** — demand is clearly driven by
  non-linear factors (price elasticity, buyer type, holiday events) that the baseline cannot
  see (baseline MAPE ≈ 44%).
- LightGBM wins among the ML candidates on both validation and test MAPE.
- **Selected: LightGBM.**

Feature importances (LightGBM): `historical_demand`, `price`, `quantity_sold`, `month`,
`is_holiday_event`, `buyer_type` dominate — confirming price elasticity and buyer-mix matter.

## 5. Serving

- Artifact: `ml/models/demand_model.joblib` (`v1.1.0-evaluated`) + `demand_model_metadata.json`.
- `ml.demand.predict.get_demand_model_and_metadata()` loads lazily and caches.
- Response: `{currency, unit, predicted_demand, range_low, range_high, model_version,
  is_synthetic}` with confidence band from `residual_std`.
- Live smoke (Tomato / Nashik / June): 2587 kg (range 2368–2806).

## 6. Reproduce

```bash
python -m ml.evaluation.compare          # trains, evaluates, selects, exports
python -m pytest ml/tests -q             # 25 ML tests against the artifact
```

## 7. Limitations

- Synthetic demand series; production needs real order/history data and re-selection.
- Month-level granularity; no intra-day or catchment-zone split.
- MAPE reported because targets are strictly positive; would need rework if demand can be 0.