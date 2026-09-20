from __future__ import annotations

from datetime import date, time
from random import Random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.environment import WeatherForecast

_CONDITIONS = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain", "Thunderstorm", "Haze"]

_FARMING_TIPS = {
    "Sunny": "Good day for field work and harvesting.",
    "Partly Cloudy": "Moderate weather; ideal for transplanting seedlings.",
    "Cloudy": "Monitor crops for pest activity in humid conditions.",
    "Light Rain": "Avoid spraying; ensure drainage is clear.",
    "Heavy Rain": "Delay field operations; check for waterlogging.",
    "Thunderstorm": "Stay indoors; secure livestock and equipment.",
    "Haze": "Reduce outdoor exposure for farm workers.",
}

_SEED_DATA: list[dict] = [
    {"state": "Odisha", "district": "Bhubaneswar", "base_temp": 32, "humidity": 70},
    {"state": "Odisha", "district": "Cuttack", "base_temp": 31, "humidity": 72},
    {"state": "Odisha", "district": "Puri", "base_temp": 30, "humidity": 75},
    {"state": "West Bengal", "district": "Kolkata", "base_temp": 33, "humidity": 78},
    {"state": "Jharkhand", "district": "Ranchi", "base_temp": 28, "humidity": 65},
    {"state": "Telangana", "district": "Hyderabad", "base_temp": 34, "humidity": 60},
]


def _generate_demo_forecast(
    state: str, district: str, forecast_date: date, seed_val: int
) -> WeatherForecast:
    rng = Random(seed_val)
    base = next(
        (s for s in _SEED_DATA if s["state"] == state and s["district"] == district),
        {"base_temp": 30, "humidity": 65},
    )
    condition = rng.choice(_CONDITIONS)
    temp_high = base["base_temp"] + rng.uniform(-2, 3)
    temp_low = temp_high - rng.uniform(6, 12)
    return WeatherForecast(
        state=state,
        district=district,
        forecast_date=forecast_date,
        condition=condition,
        temperature_c=round((temp_high + temp_low) / 2, 1),
        temp_high_c=round(temp_high, 1),
        temp_low_c=round(temp_low, 1),
        humidity=round(base["humidity"] + rng.uniform(-10, 10), 1),
        precipitation_mm=round(rng.uniform(0, 15) if "Rain" in condition else 0, 1),
        wind_speed_kmh=round(rng.uniform(5, 25), 1),
        pressure_hpa=round(1013 + rng.uniform(-10, 10), 1),
        rain_probability=round(rng.uniform(60, 95) if "Rain" in condition else rng.uniform(0, 30), 1),
        sunrise=time(6, rng.randint(0, 30)),
        sunset=time(18, rng.randint(0, 30)),
        is_demo=True,
        farming_tip=_FARMING_TIPS.get(condition),
    )


def _ensure_seeded(db: Session, state: str, district: str, today: date) -> None:
    existing = db.scalar(
        select(WeatherForecast).where(
            WeatherForecast.state == state,
            WeatherForecast.district == district,
            WeatherForecast.forecast_date >= today,
        )
    )
    if existing is not None:
        return
    for i in range(7):
        d = date.fromordinal(today.toordinal() + i)
        seed_val = hash((state, district, d.toordinal())) % (2**31)
        db.add(_generate_demo_forecast(state, district, d, seed_val))
    db.flush()


def get_forecast(db: Session, state: str, district: str, days: int = 5) -> list[WeatherForecast]:
    today = date.today()
    _ensure_seeded(db, state, district, today)
    rows = db.scalars(
        select(WeatherForecast)
        .where(
            WeatherForecast.state == state,
            WeatherForecast.district == district,
            WeatherForecast.forecast_date >= today,
        )
        .order_by(WeatherForecast.forecast_date.asc())
        .limit(min(days, 7))
    ).all()
    return list(rows)


def get_today(db: Session, state: str, district: str) -> WeatherForecast | None:
    today = date.today()
    _ensure_seeded(db, state, district, today)
    return db.scalar(
        select(WeatherForecast).where(
            WeatherForecast.state == state,
            WeatherForecast.district == district,
            WeatherForecast.forecast_date == today,
        )
    )
