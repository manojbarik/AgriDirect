"""Synthetic Crop Demand Dataset Generator.

NOTE: This dataset is synthetic and generated for demonstration, testing,
and development purposes because no real historical order/demand dataset
exists in the workspace.
"""

from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = DATA_DIR / "synthetic_demand.csv"

CROPS = [
    ("Tomato", "Hybrid", "Vegetable", 1500.0),
    ("Tomato", "Desi", "Vegetable", 1300.0),
    ("Potato", "Local", "Vegetable", 1800.0),
    ("Onion", "Red", "Vegetable", 1400.0),
    ("Green Chilli", "Local", "Spice", 600.0),
    ("Rice", "Basmati", "Cereal", 2500.0),
    ("Rice", "Common", "Cereal", 2600.0),
    ("Wheat", "Common", "Cereal", 2400.0),
    ("Maize", "Hybrid", "Cereal", 1100.0),
    ("Soybean", "Local", "Oilseed", 950.0),
    ("Groundnut", "Local", "Oilseed", 850.0),
    ("Mango", "Local", "Fruit", 800.0),
]

STATES_DISTRICTS = [
    ("Maharashtra", "Nashik"),
    ("Maharashtra", "Pune"),
    ("Maharashtra", "Mumbai"),
    ("Karnataka", "Bengaluru"),
    ("Punjab", "Ludhiana"),
    ("Uttar Pradesh", "Agra"),
    ("Madhya Pradesh", "Indore"),
    ("Gujarat", "Rajkot"),
    ("Tamil Nadu", "Chennai"),
]

SEASONS = ["Kharif", "Rabi", "Zaid", "Year-Round"]
BUYER_TYPES = ["RETAILER", "WHOLESALER", "RESTAURANT", "BUSINESS", "INDIVIDUAL"]

BUYER_MODIFIER = {
    "WHOLESALER": 1.45,
    "BUSINESS": 1.20,
    "RESTAURANT": 1.10,
    "RETAILER": 0.95,
    "INDIVIDUAL": 0.45,
}

MONTH_SEASONALITY = {
    1: 0.95, 2: 0.90, 3: 0.97, 4: 1.03,
    5: 1.10, 6: 1.15, 7: 1.12, 8: 1.06,
    9: 0.98, 10: 0.95, 11: 0.94, 12: 0.99,
}

EVENT_MONTHS = {4: 1.30, 10: 1.25, 11: 1.22}  # Festival/holiday demand uplift


def generate_demand_data(num_samples: int = 4000, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    records = []

    for _ in range(num_samples):
        crop_name, variety, category, base_demand = CROPS[np.random.randint(len(CROPS))]
        state, district = STATES_DISTRICTS[np.random.randint(len(STATES_DISTRICTS))]
        season = np.random.choice(SEASONS)
        month = int(np.random.randint(1, 13))
        buyer_type = np.random.choice(BUYER_TYPES)

        # Market price (inverse relationship with demand)
        price = float(np.round(np.random.uniform(12, 90), 2))

        # Historical demand (latest observed average)
        historical_demand = float(np.round(base_demand * np.random.normal(1.0, 0.10), 2))

        # Quantity sold recently (sales pace)
        quantity_sold = float(np.round(historical_demand * np.random.normal(1.0, 0.12), 2))

        is_holiday_event = 1 if month in EVENT_MONTHS else 0

        seasonal = MONTH_SEASONALITY[month]
        event_mod = EVENT_MONTHS.get(month, 1.0)
        buyer_mod = BUYER_MODIFIER[buyer_type]
        price_mod = (35.0 / price) ** 0.3  # price elasticity

        demand_kg = float(
            np.round(
                historical_demand * seasonal * event_mod * buyer_mod * price_mod
                * np.random.normal(1.0, 0.08),
                2,
            )
        )

        records.append({
            "crop_name": crop_name,
            "variety": variety,
            "category": category,
            "state": state,
            "district": district,
            "season": season,
            "month": month,
            "buyer_type": buyer_type,
            "price": price,
            "quantity_sold": quantity_sold,
            "historical_demand": historical_demand,
            "is_holiday_event": is_holiday_event,
            "demand_kg": demand_kg,
            "is_synthetic": True,
        })

    df = pd.DataFrame(records)
    return df


if __name__ == "__main__":
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df = generate_demand_data()
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Generated {len(df)} synthetic crop demand records at {OUTPUT_FILE}")