from __future__ import annotations

from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Float, Index, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    pass


class WeatherForecast(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "weather_forecasts"
    __table_args__ = (
        Index("ix_weather_forecasts_location_date", "state", "district", "forecast_date"),
    )

    state: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    condition: Mapped[str] = mapped_column(String(80), nullable=False)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=False)
    temp_high_c: Mapped[float] = mapped_column(Float, nullable=False)
    temp_low_c: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False)
    precipitation_mm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    wind_speed_kmh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    pressure_hpa: Mapped[float] = mapped_column(Float, nullable=False, default=1013.0)
    rain_probability: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sunrise: Mapped[time | None] = mapped_column(Time)
    sunset: Mapped[time | None] = mapped_column(Time)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    farming_tip: Mapped[str | None] = mapped_column(Text)
