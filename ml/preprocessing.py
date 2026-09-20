"""Feature Preprocessing for Crop Price Prediction ML Models."""

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

CATEGORICAL_FEATURES = [
    "crop_name",
    "variety",
    "category",
    "state",
    "district",
    "mandi_name",
    "season",
    "grade",
]

NUMERICAL_FEATURES = [
    "month",
    "quantity_kg",
    "demand_index",
    "historical_avg_price",
]

TARGET_COL = "unit_price"


def build_preprocessor() -> ColumnTransformer:
    """Build a ColumnTransformer for numerical and categorical features."""
    return ColumnTransformer(
        transformers=[
            (
                "num",
                StandardScaler(),
                NUMERICAL_FEATURES,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )


def prepare_features_and_target(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series]:
    """Extract feature DataFrame X and target Series y from input DataFrame."""
    X = df[CATEGORICAL_FEATURES + NUMERICAL_FEATURES].copy()
    y = df[TARGET_COL].copy() if TARGET_COL in df.columns else None
    return X, y


def get_feature_names(preprocessor: ColumnTransformer) -> list[str]:
    """Retrieve output feature names from fitted ColumnTransformer."""
    feature_names = []
    feature_names.extend(NUMERICAL_FEATURES)
    if "cat" in preprocessor.named_transformers_:
        cat_encoder = preprocessor.named_transformers_["cat"]
        encoded_cats = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES)
        feature_names.extend(encoded_cats)
    return feature_names
