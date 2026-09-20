import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture(autouse=True)
def _guard_ml_imports():
    """Ensure numpy/pandas/sklearn are importable before ML tests run."""
    try:
        import numpy  # noqa: F401
        import pandas  # noqa: F401
    except ImportError as exc:  # pragma: no cover
        pytest.skip(f"ML dependencies unavailable: {exc}")