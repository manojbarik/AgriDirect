"""Plotting utilities for Phase 22 model evaluation reports.

All figures are written as PNG files under ``ml/reports/plots/`` using a
headless (Agg) backend so evaluation can run in any environment.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np


def _save(fig, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def plot_actual_vs_predicted(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    path: Path,
    title: str,
    metric: float | None = None,
) -> None:
    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    ax.scatter(y_true, y_pred, s=9, alpha=0.4)
    lo = min(float(y_true.min()), float(y_pred.min()))
    hi = max(float(y_true.max()), float(y_pred.max()))
    ax.plot([lo, hi], [lo, hi], "r--", lw=1.2, label="perfect prediction")
    ax.set_xlabel("Actual")
    ax.set_ylabel("Predicted")
    suffix = f" (test R² = {metric:.4f})" if metric is not None else ""
    ax.set_title(f"{title} — actual vs predicted{suffix}")
    ax.legend()
    _save(fig, path)


def plot_actual_vs_predicted_grid(
    results: dict[str, dict],
    path: Path,
    y_true_key: str = "y_test_true",
    y_pred_key: str = "y_test_pred",
    metric_key: str = "r2",
) -> None:
    names = list(results.keys())
    n = len(names)
    cols = 2
    rows = int(np.ceil(n / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(10, 4.6 * rows), squeeze=False)
    for idx, name in enumerate(names):
        ax = axes[idx // cols][idx % cols]
        y_true = np.asarray(results[name][y_true_key])
        y_pred = np.asarray(results[name][y_pred_key])
        ax.scatter(y_true, y_pred, s=9, alpha=0.4)
        lo = min(float(y_true.min()), float(y_pred.min()))
        hi = max(float(y_true.max()), float(y_pred.max()))
        ax.plot([lo, hi], [lo, hi], "r--", lw=1.2)
        ax.set_title(
            f"{name}\n(test R² = {results[name]['test_metrics'][metric_key]:.4f})"
        )
        ax.set_xlabel("Actual")
        ax.set_ylabel("Predicted")
    for idx in range(n, rows * cols):
        axes[idx // cols][idx % cols].axis("off")
    fig.suptitle("Actual vs predicted on the held-out test set")
    _save(fig, path)


def plot_residuals(y_true: np.ndarray, y_pred: np.ndarray, path: Path, title: str) -> None:
    residuals = np.asarray(y_true) - np.asarray(y_pred)
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.4))
    axes[0].scatter(y_pred, residuals, s=9, alpha=0.4)
    axes[0].axhline(0, color="r", lw=1)
    axes[0].set_xlabel("Predicted")
    axes[0].set_ylabel("Residual (actual − predicted)")
    axes[0].set_title(f"{title} — residuals vs predicted")
    axes[1].hist(residuals, bins=40, alpha=0.7)
    axes[1].axvline(0, color="r", lw=1)
    axes[1].set_xlabel("Residual")
    axes[1].set_ylabel("Count")
    axes[1].set_title(
        f"Residual histogram\nmean={np.mean(residuals):.3f}, std={np.std(residuals):.3f}"
    )
    _save(fig, path)


def plot_residual_distribution(results: dict[str, dict], path: Path, title: str) -> None:
    names = list(results.keys())
    data = [
        np.asarray(results[name]["y_test_true"]) - np.asarray(results[name]["y_test_pred"])
        for name in names
    ]
    fig, ax = plt.subplots(figsize=(9, 4.6))
    ax.boxplot(data, showmeans=True)
    ax.set_xticks(range(1, len(names) + 1), names)
    ax.axhline(0, color="r", lw=1)
    ax.set_ylabel("Residual (actual − predicted)")
    ax.set_title(title)
    _save(fig, path)


def plot_feature_importance(
    feature_names: list[str],
    importances: list[float],
    path: Path,
    title: str,
    top_n: int = 15,
) -> None:
    pairs = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)[:top_n]
    names = [p[0] for p in pairs][::-1]
    values = [p[1] for p in pairs][::-1]
    fig, ax = plt.subplots(figsize=(9, max(4, 0.42 * len(names))))
    ax.barh(names, values, color="#2a6f97")
    ax.set_xlabel("Importance")
    ax.set_title(title)
    _save(fig, path)


def plot_model_comparison(
    results: dict[str, dict],
    metric_names: list[str],
    path: Path,
    kind: str = "regression",
) -> None:
    names = list(results.keys())
    metric_labels = {
        "mae": "MAE (lower is better)",
        "rmse": "RMSE (lower is better)",
        "r2": "R² (higher is better)",
        "mape": "MAPE % (lower is better)",
    }
    fig, axes = plt.subplots(1, len(metric_names), figsize=(5.1 * len(metric_names), 4.4))
    if len(metric_names) == 1:
        axes = [axes]
    x = np.arange(len(names))
    width = 0.38
    for ax_idx, metric in enumerate(metric_names):
        ax = axes[ax_idx]
        val = [results[n]["val_metrics"][metric] for n in names]
        test = [results[n]["test_metrics"][metric] for n in names]
        ax.bar(x - width / 2, val, width, label="validation", color="#2a6f97")
        ax.bar(x + width / 2, test, width, label="test", color="#e76f51")
        ax.set_xticks(x, names, rotation=20, ha="right")
        ax.set_ylabel(metric_labels.get(metric, metric))
        ax.legend()
        ax.set_title(metric.upper())
    fig.suptitle(f"Model comparison — {kind} prediction")
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    _save(fig, path)