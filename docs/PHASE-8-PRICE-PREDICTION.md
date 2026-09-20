# Phase 8 — AI Price Prediction Model

This phase adds the first real ML component: agricultural crop price prediction. Since no real mandi price history dataset was found in the workspace, the model is trained on a **clearly labeled synthetic/demo dataset** and predictions are marked as demo until real historical price data is connected.

## Dataset

`ml/data/synthetic_crop_prices.csv` (3,000 rows) is **synthetic and generated** by `ml/data/generate_dataset.py` with a fixed random seed (42). Each row has an `is_synthetic = True` flag and covers:

- **Crop**: crop name, variety, category
- **Location**: state, district, mandi name
- **Seasonality**: season, month
- **Volume**: quantity (kg)
- **Quality**: grade (Grade A / B / C)
- **Market signals**: demand index, historical average price
- **Target**: unit price (INR/kg)

Price targets are generated from realistic relationships (crop base price, grade multiplier, seasonality, volume discount, demand index) plus Gaussian noise.

> **No real dataset was manufactured.** The synthetic dataset is explicitly labeled and only used for development/prototype purposes.

## ML Package Structure

```
ml/
├── data/
│   ├── generate_dataset.py          # Synthetic dataset generator
│   └── synthetic_crop_prices.csv    # Generated demo dataset (is_synthetic=True)
├── preprocessing.py                 # ColumnTransformer (numeric scaling + one-hot encoding)
├── train.py                         # Train/val/test split, model comparison, selection, export
├── evaluate.py                      # MAE / RMSE / R² metrics and reports
├── predict.py                       # Model loading + prediction with price range/confidence
└── models/
    ├── price_prediction_model.joblib  # Best pipeline (joblib)
    └── model_metadata.json            # Metrics, version, disclaimer
```

## Preprocessing

`preprocessing.py` builds a scikit-learn `ColumnTransformer`:
- **Numerical** (`month`, `quantity_kg`, `demand_index`, `historical_avg_price`) — standardized with `StandardScaler`.
- **Categorical** (`crop_name`, `variety`, `category`, `state`, `district`, `mandi_name`, `season`, `grade`) — one-hot encoded with unknown-category handling.

## Train / Validation / Test Split

70% train / 15% validation / 15% test (stratified random, seed 42).

## Models Compared

| Model | Validation MAE | Validation RMSE | Validation R² | Test MAE | Test RMSE | Test R² |
| --- | --- | --- | --- | --- | --- | --- |
| Dummy (Mean Baseline) | — | — | ~0.00 | — | — | ~0.00 |
| Random Forest | 3.1505 | 4.3875 | 0.9716 | 3.3656 | 4.6382 | 0.9660 |
| HistGradientBoosting | 2.2756 | 3.2354 | 0.9846 | 2.1914 | 3.1657 | 0.9842 |
| **LightGBM** | **2.2199** | **3.1800** | **0.9851** | **2.1685** | **3.1457** | **0.9844** |
| XGBoost | 2.4537 | 3.4856 | 0.9821 | 2.6329 | 3.7914 | 0.9773 |

**Selected best model on validation performance: LightGBM** (`Validation R² = 0.9851`). Exported via `joblib` to `ml/models/price_prediction_model.joblib` and metadata to `model_metadata.json`.

## Feature Importance (LightGBM)

Top features: `historical_avg_price`, `demand_index`, `month`, `quantity_kg`, `grade` (A/C), then location/category/variety/season encodings — sensible given the synthetic data relationships.

## API Endpoint

`POST /api/v1/ai/price-prediction`

Request:
```json
{
  "crop_name": "Tomato",
  "variety": "Hybrid",
  "category": "Vegetable",
  "state": "Maharashtra",
  "district": "Nashik",
  "month": 9,
  "quantity_kg": "500.00",
  "grade": "Grade A"
}
```

Response:
```json
{
  "crop_name": "Tomato",
  "predicted_price": 27.23,
  "currency": "INR",
  "unit": "kg",
  "price_range_min": 21.07,
  "price_range_max": 33.39,
  "confidence_score": 0.99,
  "model_version": "v1.0.0-synthetic",
  "best_model_name": "LightGBM",
  "is_synthetic": true,
  "disclaimer": "DEMO / SYNTHETIC MODEL: ..."
}
```

Uncertainty uses the model's residual standard deviation to produce a ±1.96σ price range, plus a confidence score from validation R².

## Farmer UI Integration

The **"🤖 AI Price"** button in the farmer listing create and edit forms (`/farmer/listings`):
- Calls the endpoint with the selected crop, farm location, quantity, and grade.
- Shows a demo prediction card: predicted price, range, confidence %, model version, and a **SYNTHETIC DEMO DATA** badge.
- **"Apply ₹xx.xx"** auto-fills the expected price field.

## How to Re-run

```bash
cd "/Users/manojbarik/Desktop/SIH PROJECT 2026"
backend/.venv/bin/python ml/data/generate_dataset.py   # regenerate demo data
backend/.venv/bin/python -m ml.train                   # retrain, compare, select, export
backend/.venv/bin/python -c "from ml.predict import predict_price; print(predict_price('Tomato', variety='Hybrid'))"
```

> `LightGBM`/`XGBoost` require OpenMP on macOS. If a fresh machine lacks it: `brew install libomp` (the training script auto-skips them otherwise).

## Checks Run

- **Backend tests**: `68 passed` (3 new AI tests: success payload, minimal payload, invalid month 422).
- **Lint/static**: `ruff check` clean, `compileall` OK, `alembic upgrade head --sql` OK.
- **Frontend**: `npm run lint` clean, `npm run build` clean (103 modules).

## Deferred

- Real historical mandi price feed (connect → retrain; `is_synthetic` becomes `false`).
- Additional models, hyperparameter tuning, and live model version registry.
- Matching/recommendations and demand baseline services (later phase, per user roadmap).