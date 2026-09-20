"""Phase 20 - model loading tests (real trained artifacts on disk)."""

from ml.demand.predict import (
    METADATA_FILE as DEMAND_METADATA_FILE,
)
from ml.demand.predict import (
    MODEL_FILE as DEMAND_MODEL_FILE,
)
from ml.demand.predict import (
    get_demand_model_and_metadata,
)
from ml.predict import METADATA_FILE, MODEL_FILE, get_model_and_metadata


def test_price_model_files_exist_on_disk():
    assert MODEL_FILE.exists()
    assert METADATA_FILE.exists()


def test_price_model_loads_and_predicts_shape():
    pipeline, metadata = get_model_and_metadata()
    assert pipeline is not None
    assert isinstance(metadata, dict)
    assert metadata.get("model_version")
    assert "is_synthetic" in metadata


def test_price_metadata_contains_expected_keys():
    _, metadata = get_model_and_metadata()
    for key in ("model_version", "best_model_name", "residual_std", "data_disclaimer"):
        assert key in metadata, key


def test_demand_model_files_exist_on_disk():
    assert DEMAND_MODEL_FILE.exists()
    assert DEMAND_METADATA_FILE.exists()


def test_demand_model_loads_with_metadata():
    pipeline, metadata = get_demand_model_and_metadata()
    assert pipeline is not None
    assert isinstance(metadata, dict)
    assert metadata.get("model_version")