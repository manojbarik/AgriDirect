from __future__ import annotations

from datetime import date, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class WeatherForecastResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    state: str
    district: str
    forecast_date: date
    condition: str
    temperature_c: float
    temp_high_c: float
    temp_low_c: float
    humidity: float
    precipitation_mm: float
    wind_speed_kmh: float
    pressure_hpa: float
    rain_probability: float
    sunrise: time | None
    sunset: time | None
    is_demo: bool
    farming_tip: str | None


class WeatherTodayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    state: str
    district: str
    forecast_date: date
    condition: str
    temperature_c: float
    humidity: float
    rain_probability: float
    farming_tip: str | None
