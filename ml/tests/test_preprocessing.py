"""Phase 20 - ML preprocessing tests for price prediction and demand forecast."""

import numpy as np
import pandas as pd

from ml.demand.preprocessing import build_preprocessor as build_demand_preprocessor
from ml.preprocessing import (
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    TARGET_COL,
    build_preprocessor,
    get_feature_names,
    prepare_features_and_target,
)


def _sample_price_frame() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "crop_name": "Tomato",
                "variety": "Hybrid",
                "category": "Vegetable",
                "state": "Maharashtra",
                "district": "Nashik",
                "mandi_name": "Nashik APMC",
                "season": "Kharif",
                "grade": "Grade A",
                "month": 9,
                "quantity_kg": 100.0,
                "demand_index": 1.2,
                "historical_avg_price": 25.0,
                "unit_price": 28.0,
            }
        ]
        * 5
    )


def test_price_preprocessor_columns_are_expected():
    transformer = build_preprocessor()
    assert len(transformer.transformers) == 2
    names = {(name): columns for name, _, columns in transformer.transformers}
    assert names["num"] == NUMERICAL_FEATURES
    assert names["cat"] == CATEGORICAL_FEATURES


def test_price_prepare_features_and_target():
    df = _sample_price_frame()
    X, y = prepare_features_and_target(df)
    assert list(X.columns) == CATEGORICAL_FEATURES + NUMERICAL_FEATURES
    assert y is not None and len(y) == len(df)


def test_price_prepare_without_target():
    df = _sample_price_frame().drop(columns=[TARGET_COL])
    X, y = prepare_features_and_target(df)
    assert y is None
    assert len(X) == 5


def test_price_preprocessor_fits_and_transforms():
    df = _sample_price_frame()
    X, _ = prepare_features_and_target(df)
    pipe = build_preprocessor().fit_transform(X, df[TARGET_COL])
    assert isinstance(pipe, np.ndarray)
    assert pipe.shape[0] == len(df)
    assert pipe.shape[1] > 0


def test_demand_preprocessor_roundtrip():
    row = {
        "crop_name": "Tomato",
        "variety": "Local",
        "category": "Vegetable",
        "state": "Maharashtra",
        "district": "Nashik",
        "season": "Kharif",
        "buyer_type": "RETAILER",
        "month": 10,
        "price": 30.0,
        "quantity_sold": 1500.0,
        "historical_demand": 1500.0,
        "is_holiday_event": 1,
    }
    matrix = build_demand_preprocessor().fit_transform(pd.DataFrame([row] * 3))
    assert matrix.shape[0] == 3


def test_get_feature_names_returns_categories():
    df = _sample_price_frame()
    X, y = prepare_features_and_target(df)
    preprocessor = build_preprocessor().fit(X, y)
    names = get_feature_names(preprocessor)
    assert isinstance(names, list) and len(names) > 0
    assert any("crop_name" in name for name in names)


def test_get_feature_names_matches_transformed_shape():
    df = _sample_price_frame()
    X, y = prepare_features_and_target(df)
    preprocessor = build_preprocessor().fit(X, y)
    encoded = preprocessor.transform(X)
    assert encoded.shape[1] == len(get_feature_names(preprocessor))