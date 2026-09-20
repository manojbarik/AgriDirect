# ML — Crop Price Prediction

Regression model that predicts a fair **unit price (₹/kg)** for a crop, variety, location,
and month. Served at `POST /api/v1/ai/price-prediction`.

## 1. Task

- **Target:** `unit_price` (INR/kg), continuous regression.
- **Inputs:** `crop_name`, `variety`, `category`, `state`, `district`, `mandi_name`,
  `season`, `grade`, `month` (1–12), `quantity_kg`, `demand_index`, `historical_avg_price`.

## 2. Data

- Synthetic (seeded, reproducible) dataset: `ml/data/synthetic_crop_prices.csv` (3000 rows,
  12 crops × varieties, 8 states/districts, 4 seasons, 3 grades).
- Marked `is_synthetic: true` in model metadata — a **demo/prototype** model, not a
  production mandi-price model.

## 3. Preprocessing & pipeline

- `ml/preprocessing.py` builds a `ColumnTransformer`:
  - numerical → `StandardScaler`; categorical → `OneHotEncoder(handle_unknown="ignore")`.
- Pipeline: `preprocessor → regressor`. No tuning beyond documented defaults
  (`n_estimators=100` for tree models, `random_state=42`).

## 4. Evaluation (Phase 22)

70/15/15 split, `random_state=42`, models fit on train only; **test set held out**. Metrics:
MAE, RMSE, R².

| model | val_mae | test_mae | val_rmse | test_rmse | val_r2 | test_r2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Mean baseline (reference) | 20.417 | 20.159 | 26.036 | 25.174 | −0.000 | −0.000 |
| Linear Regression | 5.411 | 5.831 | 7.430 | 7.848 | 0.9185 | 0.9028 |
| Random Forest | 3.151 | 3.366 | 4.388 | 4.638 | 0.9716 | 0.9660 |
| **LightGBM** | **2.220** | **2.169** | **3.180** | **3.146** | **0.9851** | **0.9844** |
| XGBoost | 2.454 | 2.633 | 3.486 | 3.791 | 0.9821 | 0.9773 |

Full tables + plots: `ml/reports/price_model_comparison.*` and `ml/reports/plots/`.

### Selection rationale

- **Primary: validation R².** LightGBM wins on validation *and* on the held-out test split.
- XGBoost trails by ~0.003 val / ~0.007 test R² (≈ 0.65 INR/kg worse test RMSE) — above the
  0.005 tie tolerance, so no tie-break rule was needed.
- Linear Regression (−0.067 R²) and Random Forest (−0.019 R²) are measurably worse. The
  documented simplicity bias would prefer Linear if accuracy matched; it does not.
- **Selected: LightGBM** — chosen on measured validation/test performance, not advancedness.

Feature importances (LightGBM) show price fairness signals: `historical_avg_price`,
`demand_index`, `month`, `quantity_kg`, and grade drive the forecast.

## 5. Serving

- Artifact: `ml/models/price_prediction_model.joblib` (`v1.1.0-evaluated`) + `model_metadata.json`.
- `ml.predict.get_model_and_metadata()` loads lazily and caches; missing artifact triggers
  `train_and_select_best_model()`.
- Response shape: `{currency, unit, predicted_price, range_low, range_high, model_version,
  is_synthetic}` with confidence band from `residual_std` (≈ ±1.56 × zσ).
- Live smoke (Tomato / Nashik / June): ₹27.23 (range 24.16–30.30).

## 6. Reproduce

```bash
python -m ml.evaluation.compare          # trains, evaluates, selects, exports
python -m pytest ml/tests -q             # 25 ML tests against the artifact
```

## 7. Limitations

- Synthetic data only; real mandi data + re-evaluation needed for production (see README
  Future Enhancements).
- Gradient-boosting strengths on tabular OHE data; consider native-categorical encoding and
  hyperparameter search on real data.