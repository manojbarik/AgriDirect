"""Prediction module for Crop Price Model."""

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

ML_DIR = Path(__file__).parent
MODEL_FILE = ML_DIR / "models" / "price_prediction_model.joblib"
METADATA_FILE = ML_DIR / "models" / "model_metadata.json"

_cached_pipeline = None
_cached_metadata = None


def get_model_and_metadata():
    global _cached_pipeline, _cached_metadata
    if _cached_pipeline is None or _cached_metadata is None:
        if not MODEL_FILE.exists() or not METADATA_FILE.exists():
            import os as _os
            if _os.environ.get("APP_ENV", "").lower() == "production":
                raise RuntimeError(
                    f"ML model artifacts missing: {MODEL_FILE}. "
                    "Run 'python -m ml.train' in a non-production environment to generate them."
                )
            from ml.train import train_and_select_best_model
            _cached_pipeline, _cached_metadata = train_and_select_best_model()
        else:
            _cached_pipeline = joblib.load(MODEL_FILE)
            with open(METADATA_FILE, "r") as f:
                _cached_metadata = json.load(f)
    return _cached_pipeline, _cached_metadata


def predict_price(
    crop_name: str,
    variety: str | None = None,
    category: str | None = None,
    state: str | None = None,
    district: str | None = None,
    mandi_name: str | None = None,
    season: str | None = None,
    month: int | None = None,
    quantity_kg: float | None = 100.0,
    grade: str | None = None,
    demand_index: float | None = 1.0,
    historical_avg_price: float | None = None,
) -> dict[str, Any]:
    pipeline, metadata = get_model_and_metadata()

    # Defaults & fallback mappings
    variety_val = variety or "Local"
    category_val = category or "Vegetable"
    state_val = state or "Maharashtra"
    district_val = district or "Nashik"
    mandi_val = mandi_name or f"{district_val} APMC"
    season_val = season or "Kharif"
    month_val = int(month) if month and 1 <= month <= 12 else 9
    qty_val = float(quantity_kg) if quantity_kg and quantity_kg > 0 else 100.0
    grade_val = grade if grade in ("Grade A", "Grade B", "Grade C") else "Grade B"
    demand_val = float(demand_index) if demand_index and demand_index > 0 else 1.0

    # Default historical price fallback based on common crops if missing
    if historical_avg_price is None or historical_avg_price <= 0:
        crop_base_map = {
            "Tomato": 25.0,
            "Potato": 18.0,
            "Onion": 22.0,
            "Green Chilli": 40.0,
            "Rice": 50.0,
            "Wheat": 28.0,
            "Maize": 22.0,
            "Soybean": 45.0,
            "Groundnut": 55.0,
            "Mango": 65.0,
        }
        hist_val = crop_base_map.get(crop_name, 30.0)
    else:
        hist_val = float(historical_avg_price)

    input_df = pd.DataFrame([{
        "crop_name": crop_name,
        "variety": variety_val,
        "category": category_val,
        "state": state_val,
        "district": district_val,
        "mandi_name": mandi_val,
        "season": season_val,
        "month": month_val,
        "quantity_kg": qty_val,
        "grade": grade_val,
        "demand_index": demand_val,
        "historical_avg_price": hist_val,
    }])

    predicted_price_raw = float(pipeline.predict(input_df)[0])
    predicted_price = round(max(1.0, predicted_price_raw), 2)

    residual_std = metadata.get("residual_std", 3.0)
    margin = round(1.96 * residual_std, 2)

    price_min = round(max(1.0, predicted_price - margin), 2)
    price_max = round(predicted_price + margin, 2)

    val_r2 = metadata.get("validation_metrics", {}).get("r2", 0.95)
    confidence_score = round(max(0.5, min(0.99, float(val_r2))), 2)

    return {
        "crop_name": crop_name,
        "predicted_price": predicted_price,
        "currency": "INR",
        "unit": "kg",
        "price_range_min": price_min,
        "price_range_max": price_max,
        "confidence_score": confidence_score,
        "model_version": metadata.get("model_version", "v1.0.0-synthetic"),
        "best_model_name": metadata.get("best_model_name", "HistGradientBoosting"),
        "is_synthetic": metadata.get("is_synthetic", True),
        "disclaimer": metadata.get(
            "data_disclaimer",
            "DEMO / SYNTHETIC MODEL: Trained on synthetic dataset for development and initial prototype demonstration.",
        ),
    }
