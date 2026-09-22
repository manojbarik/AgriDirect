from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.weather import service
from app.modules.weather.schemas import WeatherForecastResponse, WeatherTodayResponse

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get(
    "/forecast",
    response_model=list[WeatherForecastResponse],
    summary="Get weather forecast for a location (public)",
)
def forecast(
    state: str = Query(min_length=2, max_length=100),
    district: str = Query(min_length=2, max_length=100),
    days: int = Query(default=5, ge=1, le=7),
    db: Session = Depends(get_db),
) -> list[WeatherForecastResponse]:
    rows = service.get_forecast(db, state.strip(), district.strip(), days)
    return [WeatherForecastResponse.model_validate(r) for r in rows]


@router.get(
    "/today",
    response_model=WeatherTodayResponse | None,
    summary="Get today's weather summary for a location (public)",
)
def today(
    state: str = Query(min_length=2, max_length=100),
    district: str = Query(min_length=2, max_length=100),
    db: Session = Depends(get_db),
) -> WeatherTodayResponse | None:
    row = service.get_today(db, state.strip(), district.strip())
    if row is None:
        return None
    return WeatherTodayResponse.model_validate(row)


@router.get(
    "/live",
    summary="Get live weather from OpenWeather API (public)",
)
def live_weather(
    state: str = Query(min_length=2, max_length=100),
    district: str = Query(min_length=2, max_length=100),
):
    from app.modules.weather import openweather_service

    return openweather_service.get_current(state.strip(), district.strip())


@router.get(
    "/live/forecast",
    summary="Get live weather forecast from OpenWeather API (public)",
)
def live_forecast(
    state: str = Query(min_length=2, max_length=100),
    district: str = Query(min_length=2, max_length=100),
    days: int = Query(default=5, ge=1, le=7),
):
    from app.modules.weather import openweather_service

    return openweather_service.get_forecast(state.strip(), district.strip(), days)

