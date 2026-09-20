"""Evaluation utilities for ML Price and Demand models."""

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def evaluate_model(
    y_true: np.ndarray, y_pred: np.ndarray
) -> dict[str, float]:
    """Calculate Mean Absolute Error, Root Mean Squared Error, and R² score."""
    mae = float(mean_absolute_error(y_true, y_pred))
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_true, y_pred))
    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
    }


def mean_absolute_percentage_error(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Percentage Error (%). y_true must not contain zeros."""
    safe = np.where(y_true == 0, np.nan, y_true)
    return float(np.nanmean(np.abs((y_true - y_pred) / safe)) * 100)


def evaluate_demand(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Evaluate demand forecasts with MAE, RMSE, R², and MAPE."""
    metrics = evaluate_model(y_true, y_pred)
    metrics["mape"] = round(mean_absolute_percentage_error(y_true, y_pred), 4)
    return metrics


def format_evaluation_report(
    model_name: str, val_metrics: dict[str, float], test_metrics: dict[str, float]
) -> str:
    """Format evaluation metrics into readable text report."""
    return (
        f"--- {model_name} Evaluation ---\n"
        f"Validation: MAE={val_metrics['mae']:.4f}, RMSE={val_metrics['rmse']:.4f}, R²={val_metrics['r2']:.4f}\n"
        f"Test:       MAE={test_metrics['mae']:.4f}, RMSE={test_metrics['rmse']:.4f}, R²={test_metrics['r2']:.4f}\n"
    )


def format_demand_report(model_name: str, val: dict[str, float], test: dict[str, float]) -> str:
    return (
        f"--- {model_name} Demand Forecast Evaluation ---\n"
        f"Validation: MAE={val['mae']:.4f}, RMSE={val['rmse']:.4f}, R²={val['r2']:.4f}, MAPE={val['mape']:.2f}%\n"
        f"Test:       MAE={test['mae']:.4f}, RMSE={test['rmse']:.4f}, R²={test['r2']:.4f}, MAPE={test['mape']:.2f}%\n"
    )
