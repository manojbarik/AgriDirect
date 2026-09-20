"""ML Training Pipeline for Crop Price Prediction.

Trains baseline models, Random Forest, LightGBM, and XGBoost on synthetic dataset.
Evaluates MAE, RMSE, R2, compares models, selects best model, and exports with joblib.
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from ml.data.generate_dataset import OUTPUT_FILE as DATA_FILE
from ml.data.generate_dataset import generate_synthetic_data
from ml.evaluate import evaluate_model, format_evaluation_report
from ml.preprocessing import (
    build_preprocessor,
    get_feature_names,
    prepare_features_and_target,
)

MODELS_DIR = Path(__file__).parent / "models"
MODEL_FILE = MODELS_DIR / "price_prediction_model.joblib"
METADATA_FILE = MODELS_DIR / "model_metadata.json"


def train_and_select_best_model():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load Data
    if not DATA_FILE.exists():
        print(f"Dataset not found at {DATA_FILE}. Generating synthetic dataset...")
        df = generate_synthetic_data()
        df.to_csv(DATA_FILE, index=False)
    else:
        df = pd.read_csv(DATA_FILE)

    print(f"Loaded dataset with {len(df)} rows.")

    X, y = prepare_features_and_target(df)

    # 2. Train / Validation / Test Split (70% / 15% / 15%)
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.1765, random_state=42  # ~15% of total
    )

    print(f"Splits -> Train: {len(X_train)}, Validation: {len(X_val)}, Test: {len(X_test)}")

    # 3. Define candidate models
    models = {
        "Dummy (Mean Baseline)": DummyRegressor(strategy="mean"),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        "HistGradientBoosting": HistGradientBoostingRegressor(random_state=42),
    }

    try:
        from lightgbm import LGBMRegressor
        models["LightGBM"] = LGBMRegressor(n_estimators=100, random_state=42, verbose=-1)
    except Exception as e:  # noqa: BLE001
        print(f"Skipping LightGBM due to system dependency: {e}")

    try:
        from xgboost import XGBRegressor
        models["XGBoost"] = XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
    except Exception as e:  # noqa: BLE001
        print(f"Skipping XGBoost due to system dependency: {e}")

    model_results = {}
    best_model_name = None
    best_val_r2 = -float("inf")
    best_pipeline = None

    print("\n=================== Model Training & Comparison ===================")

    for name, regressor in models.items():
        preprocessor = build_preprocessor()
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor),
        ])

        pipeline.fit(X_train, y_train)

        y_val_pred = pipeline.predict(X_val)
        y_test_pred = pipeline.predict(X_test)

        val_metrics = evaluate_model(y_val.to_numpy(), y_val_pred)
        test_metrics = evaluate_model(y_test.to_numpy(), y_test_pred)

        print(format_evaluation_report(name, val_metrics, test_metrics))

        model_results[name] = {
            "val_metrics": val_metrics,
            "test_metrics": test_metrics,
        }

        # Select best model based on Validation R2 score
        if val_metrics["r2"] > best_val_r2:
            best_val_r2 = val_metrics["r2"]
            best_model_name = name
            best_pipeline = pipeline

    print("===================================================================\n")
    print(f"BEST MODEL SELECTED: {best_model_name} (Validation R² = {best_val_r2:.4f})")

    # Extract feature importances if available
    fitted_preprocessor = best_pipeline.named_steps["preprocessor"]
    fitted_regressor = best_pipeline.named_steps["regressor"]
    feature_names = get_feature_names(fitted_preprocessor)

    feature_importances = {}
    if hasattr(fitted_regressor, "feature_importances_"):
        raw_importances = fitted_regressor.feature_importances_
        if len(raw_importances) == len(feature_names):
            importance_pairs = list(zip(feature_names, [float(x) for x in raw_importances]))
            importance_pairs.sort(key=lambda x: x[1], reverse=True)
            feature_importances = {k: round(v, 4) for k, v in importance_pairs[:15]}

    print("\nTop Feature Importances (Selected Model):")
    for feat, imp in feature_importances.items():
        print(f"  - {feat}: {imp:.4f}")

    # Calculate residual std for confidence interval calculation
    y_test_pred_best = best_pipeline.predict(X_test)
    residuals = y_test.to_numpy() - y_test_pred_best
    residual_std = float(np.std(residuals))

    # Save Pipeline and Metadata
    joblib.dump(best_pipeline, MODEL_FILE)
    print(f"\nSaved best model pipeline to {MODEL_FILE}")

    metadata = {
        "model_version": "v1.0.0-synthetic",
        "is_synthetic": True,
        "best_model_name": best_model_name,
        "residual_std": round(residual_std, 4),
        "validation_metrics": model_results[best_model_name]["val_metrics"],
        "test_metrics": model_results[best_model_name]["test_metrics"],
        "all_models_comparison": model_results,
        "feature_importances": feature_importances,
        "data_disclaimer": "DEMO / SYNTHETIC MODEL: Trained on synthetic dataset for development and initial prototype demonstration.",
    }

    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved model metadata to {METADATA_FILE}")
    return best_pipeline, metadata


if __name__ == "__main__":
    train_and_select_best_model()
