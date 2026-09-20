"""Demand Forecasting Training Pipeline.

Trains a historical-average baseline, Random Forest, XGBoost, and LightGBM on
synthetic demand data. Evaluates MAE, RMSE, MAPE, compares models, selects the
best performer on validation RMSE, and exports with joblib.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from ml.demand.data import OUTPUT_FILE as DATA_FILE
from ml.demand.data import generate_demand_data
from ml.demand.preprocessing import build_preprocessor, prepare_features_and_target
from ml.evaluate import evaluate_demand, format_demand_report

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
MODEL_FILE = MODELS_DIR / "demand_model.joblib"
METADATA_FILE = MODELS_DIR / "demand_model_metadata.json"


def _historical_average_baseline(y_train, y_val, y_test, X_val_raw, X_test_raw):
    """Predict each sample's demand as its recorded historical average."""
    val_pred = np.asarray(X_val_raw["historical_demand"].values, dtype=float)
    test_pred = np.asarray(X_test_raw["historical_demand"].values, dtype=float)
    val_metrics = evaluate_demand(np.asarray(y_val, dtype=float), val_pred)
    test_metrics = evaluate_demand(np.asarray(y_test, dtype=float), test_pred)
    return val_metrics, test_metrics


def train_demand_model():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if not DATA_FILE.exists():
        print(f"Dataset not found at {DATA_FILE}. Generating synthetic demand data...")
        Path(DATA_FILE).parent.mkdir(parents=True, exist_ok=True)
        df = generate_demand_data()
        df.to_csv(DATA_FILE, index=False)
    else:
        df = pd.read_csv(DATA_FILE)

    print(f"Loaded demand dataset with {len(df)} rows.")

    X, y = prepare_features_and_target(df)
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.1765, random_state=42
    )

    print(f"Splits -> Train: {len(X_train)}, Validation: {len(X_val)}, Test: {len(X_test)}")

    # 1. Historical average baseline (predict the most recent average demand)
    val_metrics, test_metrics = _historical_average_baseline(
        y_train, y_val, y_test, X_val, X_test
    )
    baseline = {"name": "Historical Average Baseline", "val": val_metrics, "test": test_metrics}
    print(format_demand_report("Historical Average Baseline", val_metrics, test_metrics))

    # 2. ML models
    models: dict[str, object] = {
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    }
    try:
        from lightgbm import LGBMRegressor

        models["LightGBM"] = LGBMRegressor(n_estimators=100, random_state=42, verbose=-1)
    except Exception as e:  # noqa: BLE001 - pragma: no cover - env dependent
        print(f"Skipping LightGBM due to system dependency: {e}")
    try:
        from xgboost import XGBRegressor

        models["XGBoost"] = XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
    except Exception as e:  # noqa: BLE001 - pragma: no cover - env dependent
        print(f"Skipping XGBoost due to system dependency: {e}")

    results = {"Historical Average Baseline": baseline}
    best_name = None
    best_val_rmse = float("inf")
    best_pipeline = None

    for name, regressor in models.items():
        preprocessor = build_preprocessor()
        pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("regressor", regressor)])
        pipeline.fit(X_train, y_train)

        val_metrics = evaluate_demand(np.asarray(y_val, dtype=float), pipeline.predict(X_val))
        test_metrics = evaluate_demand(np.asarray(y_test, dtype=float), pipeline.predict(X_test))
        print(format_demand_report(name, val_metrics, test_metrics))

        results[name] = {"name": name, "val": val_metrics, "test": test_metrics}

        if val_metrics["rmse"] < best_val_rmse:
            best_val_rmse = val_metrics["rmse"]
            best_name = name
            best_pipeline = pipeline

    print("=" * 70)
    print(f"BEST DEMAND MODEL: {best_name} (Validation RMSE={best_val_rmse:.4f})")

    # Feature importances
    from ml.demand.preprocessing import get_feature_names

    fitted_preprocessor = best_pipeline.named_steps["preprocessor"]
    fitted_regressor = best_pipeline.named_steps["regressor"]
    feature_names = get_feature_names(fitted_preprocessor)
    feature_importances = {}
    if hasattr(fitted_regressor, "feature_importances_"):
        raw = fitted_regressor.feature_importances_
        if len(raw) == len(feature_names):
            pairs = sorted(
                zip(feature_names, [float(x) for x in raw]), key=lambda x: x[1], reverse=True
            )
            feature_importances = {k: round(v, 4) for k, v in pairs[:12]}

    print("\nTop Demand Feature Importances:")
    for feat, imp in feature_importances.items():
        print(f"  - {feat}: {imp:.4f}")

    # Residual std for uncertainty interval
    residuals = np.asarray(y_test, dtype=float) - best_pipeline.predict(X_test)
    residual_std = float(np.std(residuals))

    joblib.dump(best_pipeline, MODEL_FILE)
    print(f"\nSaved demand model pipeline to {MODEL_FILE}")

    metadata = {
        "model_version": "v1.0.0-synthetic",
        "is_synthetic": True,
        "best_model_name": best_name,
        "residual_std": round(residual_std, 4),
        "validation_metrics": results[best_name]["val"],
        "test_metrics": results[best_name]["test"],
        "all_models_comparison": results,
        "feature_importances": feature_importances,
        "forecast_period": "month",
        "data_disclaimer": (
            "DEMO / SYNTHETIC MODEL: Trained on synthetic demand data for development "
            "and initial prototype demonstration. Replace with real order history "
            "before production use."
        ),
    }
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved demand model metadata to {METADATA_FILE}")
    return best_pipeline, metadata


if __name__ == "__main__":
    train_demand_model()