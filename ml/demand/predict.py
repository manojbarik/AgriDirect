"""Prediction module for Crop Demand Forecast Model."""

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

ML_DIR = Path(__file__).resolve().parents[1]
MODEL_FILE = ML_DIR / "models" / "demand_model.joblib"
METADATA_FILE = ML_DIR / "models" / "demand_model_metadata.json"

_cached_pipeline = None
_cached_metadata = None

BASE_DEMAND_BY_CROP = {
    "Tomato": 1500.0,
    "Potato": 1800.0,
    "Onion": 1400.0,
    "Green Chilli": 600.0,
    "Rice": 2500.0,
    "Wheat": 2400.0,
    "Maize": 1100.0,
    "Soybean": 950.0,
    "Groundnut": 850.0,
    "Mango": 800.0,
}

DISTRICT_BY_STATE = {
    "Maharashtra": "Nashik",
    "Karnataka": "Bengaluru",
    "Punjab": "Ludhiana",
    "Uttar Pradesh": "Agra",
    "Madhya Pradesh": "Indore",
    "Gujarat": "Rajkot",
    "Tamil Nadu": "Chennai",
}


def get_demand_model_and_metadata():
    global _cached_pipeline, _cached_metadata
    if _cached_pipeline is None or _cached_metadata is None:
        if not MODEL_FILE.exists() or not METADATA_FILE.exists():
            import os as _os
            if _os.environ.get("APP_ENV", "").lower() == "production":
                raise RuntimeError(
                    f"ML model artifacts missing: {MODEL_FILE}. "
                    "Run 'python -m ml.demand.train' in a non-production environment to generate them."
                )
            from ml.demand.train import train_demand_model

            _cached_pipeline, _cached_metadata = train_demand_model()
        else:
            _cached_pipeline = joblib.load(MODEL_FILE)
            with open(METADATA_FILE, "r") as f:
                _cached_metadata = json.load(f)
    return _cached_pipeline, _cached_metadata


def predict_demand(
    crop_name: str,
    variety: str | None = None,
    category: str | None = None,
    state: str | None = None,
    district: str | None = None,
    season: str | None = None,
    month: int | None = None,
    buyer_type: str | None = None,
    price: float | None = None,
    quantity_sold: float | None = None,
    historical_demand: float | None = None,
) -> dict[str, Any]:
    pipeline, metadata = get_demand_model_and_metadata()

    variety_val = variety or "Local"
    category_val = category or "Vegetable"
    state_val = state or "Maharashtra"
    district_val = district or DISTRICT_BY_STATE.get(state_val, "Nashik")
    season_val = season or "Kharif"
    month_val = int(month) if month and 1 <= month <= 12 else 9
    buyer_val = buyer_type if buyer_type else "RETAILER"
    price_val = float(price) if price and price > 0 else 30.0

    if historical_demand is None or historical_demand <= 0:
        hist_val = BASE_DEMAND_BY_CROP.get(crop_name, 1500.0)
    else:
        hist_val = float(historical_demand)

    qty_sold_val = float(quantity_sold) if quantity_sold and quantity_sold > 0 else hist_val
    is_holiday = 1 if month_val in (4, 10, 11) else 0

    input_df = pd.DataFrame([{
        "crop_name": crop_name,
        "variety": variety_val,
        "category": category_val,
        "state": state_val,
        "district": district_val,
        "season": season_val,
        "month": month_val,
        "buyer_type": buyer_val,
        "price": price_val,
        "quantity_sold": qty_sold_val,
        "historical_demand": hist_val,
        "is_holiday_event": is_holiday,
    }])

    raw_pred = float(pipeline.predict(input_df)[0])
    predicted = round(max(0, raw_pred), 2)

    residual_std = metadata.get("residual_std", 200.0)
    margin = round(1.96 * residual_std, 2)
    lower = round(max(0, predicted - margin), 2)
    upper = round(predicted + margin, 2)

    # Use R² if available, else fall back to 0.9
    val_r2 = metadata.get("validation_metrics", {}).get("r2", 0.9)
    confidence_score = round(max(0.5, min(0.99, float(val_r2))), 2)

    recommended_quantity = round(predicted, 2)

    return {
        "crop_name": crop_name,
        "state": state_val,
        "month": month_val,
        "predicted_demand": predicted,
        "unit": "kg",
        "forecast_period": metadata.get("forecast_period", "month"),
        "predicted_demand_lower": lower,
        "predicted_demand_upper": upper,
        "confidence_score": confidence_score,
        "model_version": metadata.get("model_version", "v1.0.0-synthetic"),
        "best_model_name": metadata.get("best_model_name", "LightGBM"),
        "is_synthetic": metadata.get("is_synthetic", True),
        "recommended_quantity": recommended_quantity,
        "historical_demand": round(hist_val, 2),
        "disclaimer": metadata.get(
            "data_disclaimer",
            "DEMO / SYNTHETIC MODEL: Trained on synthetic demand data for development purposes.",
        ),
    }