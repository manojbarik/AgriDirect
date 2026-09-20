"""FastAPI Marketplace Application Core Package."""

import sys
from pathlib import Path

# Ensure workspace root is in sys.path for top-level ml module
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
