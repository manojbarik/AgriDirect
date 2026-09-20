"""Synthetic Agricultural Crop Price Dataset Generator.

NOTE: This dataset is synthetic and generated for demonstration, testing,
and development purposes because no real historical mandi price dataset
was found in the workspace.
"""

from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent
OUTPUT_FILE = DATA_DIR / "synthetic_crop_prices.csv"

CROPS = [
    ("Tomato", "Hybrid", "Vegetable", 25.0),
    ("Tomato", "Desi", "Vegetable", 20.0),
    ("Potato", "Local", "Vegetable", 18.0),
    ("Onion", "Red", "Vegetable", 22.0),
    ("Green Chilli", "Local", "Spice", 40.0),
    ("Rice", "Basmati", "Cereal", 75.0),
    ("Rice", "Common", "Cereal", 35.0),
    ("Wheat", "Common", "Cereal", 28.0),
    ("Maize", "Hybrid", "Cereal", 22.0),
    ("Soybean", "Local", "Oilseed", 45.0),
    ("Groundnut", "Local", "Oilseed", 55.0),
    ("Mango", "Local", "Fruit", 65.0),
]

STATES_DISTRICTS = [
    ("Maharashtra", "Nashik", "Nashik APMC"),
    ("Maharashtra", "Pune", "Pune APMC"),
    ("Maharashtra", "Mumbai", "Vashi APMC"),
    ("Karnataka", "Bengaluru", "Bengaluru APMC"),
    ("Punjab", "Ludhiana", "Ludhiana Mandi"),
    ("Uttar Pradesh", "Agra", "Agra Mandi"),
    ("Madhya Pradesh", "Indore", "Indore Mandi"),
    ("Gujarat", "Rajkot", "Rajkot APMC"),
]

SEASONS = ["Kharif", "Rabi", "Zaid", "Year-Round"]
GRADES = ["Grade A", "Grade B", "Grade C"]

GRADE_MULTIPLIER = {"Grade A": 1.15, "Grade B": 1.00, "Grade C": 0.85}

MONTH_SEASONALITY = {
    1: 0.95, 2: 0.92, 3: 0.96, 4: 1.02,
    5: 1.08, 6: 1.12, 7: 1.10, 8: 1.05,
    9: 0.98, 10: 0.94, 11: 0.96, 12: 0.98
}


def generate_synthetic_data(num_samples: int = 3000, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    records = []

    for _ in range(num_samples):
        crop_name, variety, category, base_price = CROPS[np.random.randint(len(CROPS))]
        state, district, mandi_name = STATES_DISTRICTS[np.random.randint(len(STATES_DISTRICTS))]
        season = np.random.choice(SEASONS)
        grade = np.random.choice(GRADES, p=[0.4, 0.4, 0.2])
        month = int(np.random.randint(1, 13))
        quantity_kg = float(np.round(np.random.uniform(50, 5000), 2))
        demand_index = float(np.round(np.random.uniform(0.6, 1.8), 2))

        # Base noise for historical price
        historical_avg_price = float(np.round(base_price * np.random.normal(1.0, 0.08), 2))

        # Calculate synthetic target price based on realistic relations:
        season_mod = MONTH_SEASONALITY[month]
        grade_mod = GRADE_MULTIPLIER[grade]

        # Volume discount (-1% to -8% for large volume > 1000kg)
        volume_discount = max(0.92, 1.0 - (quantity_kg / 50000.0))

        # Target unit price
        expected_price = (
            historical_avg_price
            * grade_mod
            * season_mod
            * demand_index
            * volume_discount
            + np.random.normal(0, base_price * 0.05)
        )
        unit_price = float(np.round(max(5.0, expected_price), 2))

        records.append({
            "crop_name": crop_name,
            "variety": variety,
            "category": category,
            "state": state,
            "district": district,
            "mandi_name": mandi_name,
            "season": season,
            "month": month,
            "quantity_kg": quantity_kg,
            "grade": grade,
            "demand_index": demand_index,
            "historical_avg_price": historical_avg_price,
            "unit_price": unit_price,
            "is_synthetic": True,
        })

    df = pd.DataFrame(records)
    return df


if __name__ == "__main__":
    df = generate_synthetic_data()
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Generated {len(df)} synthetic crop price records at {OUTPUT_FILE}")
