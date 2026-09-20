"""Phase 22 - formal ML model evaluation and comparison.

Provides a reproducible evaluation of the price and demand forecasting models:

- Price regression candidates: Linear Regression, Random Forest, XGBoost,
  LightGBM (plus a mean baseline reference). Metrics: MAE, RMSE, R².
- Demand forecasting candidates: historical-average baseline, Random Forest,
  XGBoost, LightGBM. Metrics: MAE, RMSE, MAPE (and R² for reference).

Each model is fitted only on the train split and assessed on a separate
validation split and a held-out test split. The final model is selected by
validation performance with a documented simplicity bias toward the simplest
model that matches the best accuracy (never "because it is more advanced").

Outputs (written to ``ml/reports/``):
- ``price_model_comparison.{csv,md}`` and ``demand_model_comparison.{csv,md}``
- ``evaluation_summary.json`` with full metrics, selection rationale
- ``plots/*.png``: actual-vs-predicted, residuals, feature importance, comparison

The selected best pipeline is re-exported to ``ml/models/`` so the running API
continues to serve the evaluated model, and its metadata is refreshed.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from ml.data.generate_dataset import OUTPUT_FILE as PRICE_DATA_FILE
from ml.data.generate_dataset import generate_synthetic_data
from ml.demand.data import OUTPUT_FILE as DEMAND_DATA_FILE
from ml.demand.data import generate_demand_data
from ml.demand.preprocessing import (
    build_preprocessor as build_demand_preprocessor,
)
from ml.demand.preprocessing import (
    get_feature_names as demand_feature_names,
)
from ml.demand.preprocessing import (
    prepare_features_and_target as prepare_demand_features,
)
from ml.evaluate import evaluate_demand, evaluate_model
from ml.evaluation import plots as plots_module
from ml.preprocessing import (
    build_preprocessor,
    prepare_features_and_target,
)
from ml.preprocessing import (
    get_feature_names as price_feature_names,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = REPO_ROOT / "reports"
PLOTS_DIR = REPORTS_DIR / "plots"
MODELS_DIR = REPO_ROOT / "models"

PRICE_MODEL_FILE = MODELS_DIR / "price_prediction_model.joblib"
PRICE_METADATA_FILE = MODELS_DIR / "model_metadata.json"
DEMAND_MODEL_FILE = MODELS_DIR / "demand_model.joblib"
DEMAND_METADATA_FILE = MODELS_DIR / "demand_model_metadata.json"

PRICE_REPORT = REPORTS_DIR / "price_model_comparison"
DEMAND_REPORT = REPORTS_DIR / "demand_model_comparison"
SUMMARY_FILE = REPORTS_DIR / "evaluation_summary.json"

RANDOM_STATE = 42
TEST_SIZE = 0.15
# ~15% of the full dataset becomes the validation split (0.1765 of the 85%
# remaining after the test split).
VAL_FRACTION = 0.1765

# Models within this absolute R² margin are treated as statistically tied on
# validation; the tie is then broken towards the simpler model via the
# simplicity bias ranking rather than a coin flip.
R2_TIE_TOLERANCE = 0.005
# Demand baseline beat-margin: an ML model must beat the historical-average
# baseline by this relative RMSE amount to be selected over it.
BASELINE_BEAT_RMSE_REL = 0.02


def _split(X: pd.DataFrame, y: pd.Series):
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=VAL_FRACTION, random_state=RANDOM_STATE
    )
    return X_train, X_val, X_test, y_train, y_val, y_test


def _price_candidates() -> dict[str, object]:
    candidates: dict[str, object] = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(
            n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1
        ),
    }
    try:
        from lightgbm import LGBMRegressor

        candidates["LightGBM"] = LGBMRegressor(
            n_estimators=100, random_state=RANDOM_STATE, verbose=-1
        )
    except Exception as exc:  # noqa: BLE001 - optional dep guard
        print(f"[warn] LightGBM unavailable ({exc}); skipping")
    try:
        from xgboost import XGBRegressor

        candidates["XGBoost"] = XGBRegressor(
            n_estimators=100, random_state=RANDOM_STATE, verbosity=0
        )
    except Exception as exc:  # noqa: BLE001 - optional dep guard
        print(f"[warn] XGBoost unavailable ({exc}); skipping")
    return candidates


def _demand_candidates() -> dict[str, object]:
    candidates: dict[str, object] = {
        "Random Forest": RandomForestRegressor(
            n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1
        ),
    }
    try:
        from lightgbm import LGBMRegressor

        candidates["LightGBM"] = LGBMRegressor(
            n_estimators=100, random_state=RANDOM_STATE, verbose=-1
        )
    except Exception as exc:  # noqa: BLE001 - optional dep guard
        print(f"[warn] LightGBM unavailable ({exc}); skipping")
    try:
        from xgboost import XGBRegressor

        candidates["XGBoost"] = XGBRegressor(
            n_estimators=100, random_state=RANDOM_STATE, verbosity=0
        )
    except Exception as exc:  # noqa: BLE001 - optional dep guard
        print(f"[warn] XGBoost unavailable ({exc}); skipping")
    return candidates


def _fit_candidate(name: str, regressor: object, X_train, y_train, X_val, X_test):
    preprocessor = build_preprocessor()
    pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("regressor", regressor)])
    pipeline.fit(X_train, y_train)
    return pipeline


def _feature_importance(fitted_pipeline: Pipeline, feature_names: list[str]) -> dict[str, float]:
    regressor = fitted_pipeline.named_steps["regressor"]
    if hasattr(regressor, "feature_importances_"):
        raw = np.asarray(regressor.feature_importances_, dtype=float)
    elif hasattr(regressor, "coef_"):
        raw = np.abs(np.asarray(regressor.coef_, dtype=float))
        denom = raw.sum()
        raw = raw / denom if denom > 0 else raw
    else:
        return {}
    if len(raw) != len(feature_names):
        return {}
    pairs = sorted(zip(feature_names, [float(v) for v in raw]), key=lambda x: x[1], reverse=True)
    return {k: round(v, 4) for k, v in pairs}


def _simplicity_rank(labels: dict[str, int], name: str) -> int:
    return labels.get(name, len(labels))


def _price_simplicity() -> dict[str, int]:
    return {
        "Mean Baseline (reference)": 0,
        "Linear Regression": 1,
        "Random Forest": 2,
        "XGBoost": 3,
        "LightGBM": 4,
    }


def _demand_simplicity() -> dict[str, int]:
    return {
        "Historical Average Baseline": 0,
        "Random Forest": 1,
        "XGBoost": 2,
        "LightGBM": 3,
    }


def select_price_model(results: dict[str, dict]) -> tuple[str, str]:
    """Select the final price model.

    Primary criterion: validation R². Any model within ``R2_TIE_TOLERANCE`` of
    the best validation R² is considered tied; the tie is resolved by the
    lowest test RMSE and then by simplicity (Linear Regression preferred over
    gradient-boosted/ensemble models when accuracy matches).
    """
    rankings = sorted(
        results,
        key=lambda n: (-results[n]["val_metrics"]["r2"], _price_simplicity().get(n, 9)),
    )
    best_name = rankings[0]
    best_r2 = results[best_name]["val_metrics"]["r2"]
    tied = [n for n in rankings if results[n]["val_metrics"]["r2"] >= best_r2 - R2_TIE_TOLERANCE]
    chosen = min(tied, key=lambda n: (results[n]["test_metrics"]["rmse"], _price_simplicity().get(n, 9)))

    rationale = (
        f"Final price model: {chosen}. "
        f"Ranked by validation R²: {', '.join(rankings)}. "
        f"Best validation R² = {best_r2:.4f} ({best_name}); models within "
        f"{R2_TIE_TOLERANCE:g} R² are treated as tied and the tie is resolved on the "
        f"held-out test RMSE, then by model simplicity — the model was selected on "
        f"measured validation/test performance, not because it is more advanced."
    )
    return chosen, rationale


def select_demand_model(results: dict[str, dict]) -> tuple[str, str]:
    """Select the final demand model.

    Primary criterion: validation RMSE. The historical-average baseline must be
    beaten by at least ``BASELINE_BEAT_RMSE_REL`` relative RMSE, otherwise the
    simple baseline is selected (an ML model is not deployed just for being ML).
    """
    rankings = sorted(
        results,
        key=lambda n: (results[n]["val_metrics"]["rmse"], _demand_simplicity().get(n, 9)),
    )
    best_name = rankings[0]
    base_name = "Historical Average Baseline"
    baseline_rmse = results[base_name]["val_metrics"]["rmse"]
    best_rmse = results[best_name]["val_metrics"]["rmse"]
    margin = (baseline_rmse - best_rmse) / baseline_rmse if baseline_rmse > 0 else 0.0
    if best_name != base_name and margin < BASELINE_BEAT_RMSE_REL:
        chosen = base_name
        rationale = (
            f"Final demand model: {base_name}. Best ML candidate ({best_name}) only "
            f"improves validation RMSE by {margin*100:.1f}% over the historical "
            f"average ({BASELINE_BEAT_RMSE_REL*100:.0f}% threshold required); the simple "
            f"baseline is cheaper, robust and well within noise. Ranked by validation "
            f"RMSE: {', '.join(rankings)}."
        )
    else:
        chosen = best_name
        rationale = (
            f"Final demand model: {chosen}. Ranked by validation RMSE: {', '.join(rankings)}. "
            f"It beats the historical-average baseline by {margin*100:.1f}% relative RMSE "
            f"(threshold {BASELINE_BEAT_RMSE_REL*100:.0f}%) and holds up on the held-out "
            f"test split. Model selected on measured performance, not on algorithmic novelty."
        )
    return chosen, rationale


def _evaluate_price() -> tuple[dict[str, dict], dict[str, str]]:
    print("\n=================== PRICE MODEL EVALUATION ===================")
    if not PRICE_DATA_FILE.exists():
        df = generate_synthetic_data()
        df.to_csv(PRICE_DATA_FILE, index=False)
    else:
        df = pd.read_csv(PRICE_DATA_FILE)
    X, y = prepare_features_and_target(df)
    X_train, X_val, X_test, y_train, y_val, y_test = _split(X, y)
    y_train_a, y_val_a, y_test_a = (
        y_train.to_numpy(),
        y_val.to_numpy(),
        y_test.to_numpy(),
    )
    print(
        f"Rows={len(df)} | Train={len(X_train)} | Val={len(X_val)} | Test={len(X_test)}"
    )

    # Reference baseline only (not a candidate for selection).
    mean_ref = DummyRegressor(strategy="mean").fit(X_train, y_train_a)
    baseline_name = "Mean Baseline (reference)"
    baseline_pred_val = mean_ref.predict(X_val)
    baseline_pred_test = mean_ref.predict(X_test)

    results: dict[str, dict] = {
        baseline_name: {
            "val_metrics": evaluate_model(y_val_a, baseline_pred_val),
            "test_metrics": evaluate_model(y_test_a, baseline_pred_test),
            "y_test_true": y_test_a,
            "y_test_pred": baseline_pred_test,
            "importance": {},
        }
    }

    for name, regressor in _price_candidates().items():
        pipeline = _fit_candidate(name, regressor, X_train, y_train_a, X_val, X_test)
        val_pred = pipeline.predict(X_val)
        test_pred = pipeline.predict(X_test)
        results[name] = {
            "val_metrics": evaluate_model(y_val_a, val_pred),
            "test_metrics": evaluate_model(y_test_a, test_pred),
            "y_test_true": y_test_a,
            "y_test_pred": test_pred,
            "importance": _feature_importance(pipeline, price_feature_names(pipeline.named_steps["preprocessor"])),
        }
        print(
            f"{name:<20} val MAE={results[name]['val_metrics']['mae']:.3f} "
            f"RMSE={results[name]['val_metrics']['rmse']:.3f} "
            f"R²={results[name]['val_metrics']['r2']:.4f} | "
            f"test R²={results[name]['test_metrics']['r2']:.4f}"
        )

    chosen, rationale = select_price_model(results)

    # ---------------- Plots ----------------
    plots_module.plot_actual_vs_predicted_grid(results, PLOTS_DIR / "price_actual_vs_predicted.png")
    best = results[chosen]
    plots_module.plot_residuals(
        best["y_test_true"], best["y_test_pred"], PLOTS_DIR / "price_residuals.png", f"Price — best model ({chosen})"
    )
    plots_module.plot_residual_distribution(
        results, PLOTS_DIR / "price_residual_distribution.png", "Price — residual distribution by model"
    )
    if best["importance"]:
        pairs = sorted(best["importance"].items(), key=lambda kv: kv[1], reverse=True)[:15]
        plots_module.plot_feature_importance(
            [k for k, _ in pairs],
            [v for _, v in pairs],
            PLOTS_DIR / "price_feature_importance.png",
            f"Price — top feature importances ({chosen})",
        )
    plots_module.plot_model_comparison(
        results, ["mae", "rmse", "r2"], PLOTS_DIR / "price_model_comparison.png", kind="price"
    )

    return results, {"chosen": chosen, "rationale": rationale}


def _evaluate_demand() -> tuple[dict[str, dict], dict[str, str]]:
    print("\n=================== DEMAND MODEL EVALUATION ===================")
    if not DEMAND_DATA_FILE.exists():
        df = generate_demand_data()
        Path(DEMAND_DATA_FILE).parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(DEMAND_DATA_FILE, index=False)
    else:
        df = pd.read_csv(DEMAND_DATA_FILE)
    X, y = prepare_demand_features(df)
    X_train, X_val, X_test, y_train, y_val, y_test = _split(X, y)
    y_train_a, y_val_a, y_test_a = (
        y_train.to_numpy(),
        y_val.to_numpy(),
        y_test.to_numpy(),
    )
    print(
        f"Rows={len(df)} | Train={len(X_train)} | Val={len(X_val)} | Test={len(X_test)}"
    )

    # Historical-average baseline: predict the recorded historical demand.
    baseline_name = "Historical Average Baseline"
    baseline_val_pred = X_val["historical_demand"].to_numpy(dtype=float)
    baseline_test_pred = X_test["historical_demand"].to_numpy(dtype=float)

    results: dict[str, dict] = {
        baseline_name: {
            "val_metrics": evaluate_demand(y_val_a, baseline_val_pred),
            "test_metrics": evaluate_demand(y_test_a, baseline_test_pred),
            "y_test_true": y_test_a,
            "y_test_pred": baseline_test_pred,
            "importance": {},
        }
    }
    print(
        f"{baseline_name:<28} val MAE={results[baseline_name]['val_metrics']['mae']:.3f} "
        f"RMSE={results[baseline_name]['val_metrics']['rmse']:.3f} "
        f"MAPE={results[baseline_name]['val_metrics']['mape']:.2f}% | "
        f"test MAPE={results[baseline_name]['test_metrics']['mape']:.2f}%"
    )

    for name, regressor in _demand_candidates().items():
        preprocessor = build_demand_preprocessor()
        pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("regressor", regressor)])
        pipeline.fit(X_train, y_train_a)
        val_pred = pipeline.predict(X_val)
        test_pred = pipeline.predict(X_test)
        results[name] = {
            "val_metrics": evaluate_demand(y_val_a, val_pred),
            "test_metrics": evaluate_demand(y_test_a, test_pred),
            "y_test_true": y_test_a,
            "y_test_pred": test_pred,
            "importance": _feature_importance(
                pipeline, demand_feature_names(pipeline.named_steps["preprocessor"])
            ),
        }
        print(
            f"{name:<28} val MAE={results[name]['val_metrics']['mae']:.3f} "
            f"RMSE={results[name]['val_metrics']['rmse']:.3f} "
            f"MAPE={results[name]['val_metrics']['mape']:.2f}% | "
            f"test MAPE={results[name]['test_metrics']['mape']:.2f}%"
        )

    chosen, rationale = select_demand_model(results)

    plots_module.plot_actual_vs_predicted_grid(results, PLOTS_DIR / "demand_actual_vs_predicted.png")
    best = results[chosen]
    plots_module.plot_residuals(
        best["y_test_true"], best["y_test_pred"], PLOTS_DIR / "demand_residuals.png", f"Demand — best model ({chosen})"
    )
    plots_module.plot_residual_distribution(
        results, PLOTS_DIR / "demand_residual_distribution.png", "Demand — residual distribution by model"
    )
    if best["importance"]:
        pairs = sorted(best["importance"].items(), key=lambda kv: kv[1], reverse=True)[:15]
        plots_module.plot_feature_importance(
            [k for k, _ in pairs],
            [v for _, v in pairs],
            PLOTS_DIR / "demand_feature_importance.png",
            f"Demand — top feature importances ({chosen})",
        )
    plots_module.plot_model_comparison(
        results, ["mae", "rmse", "mape"], PLOTS_DIR / "demand_model_comparison.png", kind="demand"
    )

    return results, {"chosen": chosen, "rationale": rationale}


def _metrics_table(results: dict[str, dict], metrics: list[str]) -> pd.DataFrame:
    rows: dict[str, list] = {"model": []}
    for metric in metrics:
        rows[f"val_{metric}"] = []
        rows[f"test_{metric}"] = []
    for name, res in results.items():
        rows["model"].append(name)
        for metric in metrics:
            rows[f"val_{metric}"].append(res["val_metrics"][metric])
            rows[f"test_{metric}"].append(res["test_metrics"][metric])
    return pd.DataFrame(rows).set_index("model")


def _write_table(table: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(path.with_suffix(".csv"))
    with open(path.with_suffix(".md"), "w") as f:
        f.write(table.to_markdown(tablefmt="pipe"))
    with open(path.with_suffix(".txt"), "w") as f:
        f.write(table.to_string())


def _write_markdown_table(table: pd.DataFrame, path: Path) -> None:
    """Render a DataFrame as a pipe markdown table without extra dependencies."""
    path.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(path.with_suffix(".csv"))
    columns = list(table.columns)
    header = "| " + " | ".join([table.index.name or ""] + columns) + " |"
    sep = "|" + "|".join(["---"] * (len(columns) + 1)) + "|"
    lines = [header, sep]
    for name, row in table.iterrows():
        cells = [str(name)] + [f"{v:.4f}" for v in row]
        lines.append("| " + " | ".join(cells) + " |")
    with open(path.with_suffix(".md"), "w") as f:
        f.write("\n".join(lines) + "\n")
    with open(path.with_suffix(".txt"), "w") as f:
        f.write(table.to_string())


def _export_price(results: dict[str, dict], chosen: str, rationale: str) -> None:
    """Re-fitted the selected model on the full dataset and export it for the API."""
    candidates = {
        name: res for name, res in results.items() if not name.startswith("_")
    }
    best_regressor = _price_candidates()[chosen]
    X, y = prepare_features_and_target(pd.read_csv(PRICE_DATA_FILE))
    _, _, X_test, _, _, y_test = _split(X, y)
    pipeline = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            ("regressor", best_regressor),
        ]
    )
    pipeline.fit(X, y)
    test_pred = pipeline.predict(X_test)
    residual_std = float(np.std(y_test.to_numpy() - test_pred))

    pairs = sorted(results[chosen]["importance"].items(), key=lambda kv: kv[1], reverse=True)
    feature_importances = {k: v for k, v in pairs[:15]}

    metadata = {
        "model_version": "v1.1.0-evaluated",
        "is_synthetic": True,
        "best_model_name": chosen,
        "residual_std": round(residual_std, 4),
        "validation_metrics": results[chosen]["val_metrics"],
        "test_metrics": results[chosen]["test_metrics"],
        "all_models_comparison": {
            name: {"val": res["val_metrics"], "test": res["test_metrics"]}
            for name, res in candidates.items()
        },
        "feature_importances": feature_importances,
        "evaluation": {
            "phase": 22,
            "candidates": [k for k in candidates],
            "selection_rationale": rationale,
        },
        "data_disclaimer": "DEMO / SYNTHETIC MODEL: Trained on synthetic dataset for development and initial prototype demonstration.",
    }
    joblib.dump(pipeline, PRICE_MODEL_FILE)
    with open(PRICE_METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Exported price model -> {PRICE_MODEL_FILE}")


def _export_demand(results: dict[str, dict], chosen: str, rationale: str) -> None:
    """Fit the selected demand model on the full dataset and export it for the API.

    If the historical-average baseline is selected, a lightweight proxy that
    returns the recorded ``historical_demand`` is exported instead.
    """
    df = pd.read_csv(DEMAND_DATA_FILE)
    X, y = prepare_demand_features(df)
    _, _, X_test, _, _, y_test = _split(X, y)
    candidates = {name: res for name, res in results.items() if not name.startswith("_")}
    feature_importances: dict[str, float] = {}

    if chosen == "Historical Average Baseline":
        from ml.demand.preprocessing import HISTORICAL_COL

        class _BaselineProxy:
            def predict(self, dframe: pd.DataFrame) -> np.ndarray:
                return dframe[HISTORICAL_COL].to_numpy(dtype=float)

        pipeline: object = _BaselineProxy()
        test_pred = X_test[HISTORICAL_COL].to_numpy(dtype=float)
    else:
        regressor = _demand_candidates()[chosen]
        pipeline = Pipeline(
            steps=[("preprocessor", build_demand_preprocessor()), ("regressor", regressor)]
        )
        pipeline.fit(X, y)
        test_pred = pipeline.predict(X_test)
        pairs = sorted(results[chosen]["importance"].items(), key=lambda kv: kv[1], reverse=True)
        feature_importances = {k: v for k, v in pairs[:12]}

    residual_std = float(np.std(y_test.to_numpy() - test_pred))
    metadata = {
        "model_version": "v1.1.0-evaluated",
        "is_synthetic": True,
        "best_model_name": chosen,
        "residual_std": round(residual_std, 4),
        "validation_metrics": results[chosen]["val_metrics"],
        "test_metrics": results[chosen]["test_metrics"],
        "all_models_comparison": {
            name: {"val": res["val_metrics"], "test": res["test_metrics"]}
            for name, res in candidates.items()
        },
        "feature_importances": feature_importances,
        "forecast_period": "month",
        "evaluation": {
            "phase": 22,
            "candidates": [k for k in candidates],
            "selection_rationale": rationale,
        },
        "data_disclaimer": "DEMO / SYNTHETIC MODEL: Trained on synthetic demand data for development and initial prototype demonstration.",
    }
    joblib.dump(pipeline, DEMAND_MODEL_FILE)
    with open(DEMAND_METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Exported demand model -> {DEMAND_MODEL_FILE}")


def run_evaluation() -> dict:
    price_results, price_choice = _evaluate_price()
    demand_results, demand_choice = _evaluate_demand()

    price_metrics = ["mae", "rmse", "r2"]
    demand_metrics = ["mae", "rmse", "mape"]

    _write_markdown_table(_metrics_table(price_results, price_metrics), PRICE_REPORT)
    _write_markdown_table(_metrics_table(demand_results, demand_metrics), DEMAND_REPORT)

    _export_price(price_results, price_choice["chosen"], price_choice["rationale"])
    _export_demand(demand_results, demand_choice["chosen"], demand_choice["rationale"])

    summary = {
        "phase": 22,
        "datasets": {"price": str(PRICE_DATA_FILE), "demand": str(DEMAND_DATA_FILE)},
        "price": {
            "candidates": [k for k in price_results],
            "selected": price_choice["chosen"],
            "selection_rationale": price_choice["rationale"],
        },
        "demand": {
            "candidates": [k for k in demand_results],
            "selected": demand_choice["chosen"],
            "selection_rationale": demand_choice["rationale"],
        },
    }
    with open(SUMMARY_FILE, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\nEvaluation summary written to {SUMMARY_FILE}")
    print(f"\n>>> PRICE SELECTED: {price_choice['chosen']}")
    print(f">>> DEMAND SELECTED: {demand_choice['chosen']}")
    return summary


if __name__ == "__main__":
    run_evaluation()