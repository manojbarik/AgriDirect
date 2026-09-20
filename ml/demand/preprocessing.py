"""Feature Preprocessing for Crop Demand Forecast Models."""

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

CATEGORICAL_FEATURES = [
    "crop_name",
    "variety",
    "category",
    "state",
    "district",
    "season",
    "buyer_type",
]

NUMERICAL_FEATURES = [
    "month",
    "price",
    "quantity_sold",
    "historical_demand",
    "is_holiday_event",
]

TARGET_COL = "demand_kg"
HISTORICAL_COL = "historical_demand"


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


def prepare_features_and_target(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    X = df[CATEGORICAL_FEATURES + NUMERICAL_FEATURES].copy()
    y = df[TARGET_COL].copy()
    return X, y


def get_feature_names(preprocessor: ColumnTransformer) -> list[str]:
    feature_names = list(NUMERICAL_FEATURES)
    cat_encoder = preprocessor.named_transformers_["cat"]
    feature_names.extend(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
    return feature_names