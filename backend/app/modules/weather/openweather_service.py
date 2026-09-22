"""OpenWeatherService — Live weather data from OpenWeather API.

Falls back to the existing demo weather data when the API key
is not configured.  The API key is read from backend/.env and
NEVER exposed to the frontend.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_OWM_BASE = "https://api.openweathermap.org/data/2.5"

# Indian state capitals / major cities — lat/lon lookup for district names
_DISTRICT_COORDS: dict[str, tuple[float, float]] = {
    "bhubaneswar": (20.2961, 85.8245),
    "cuttack": (20.4625, 85.8830),
    "puri": (19.8135, 85.8312),
    "kolkata": (22.5726, 88.3639),
    "ranchi": (23.3441, 85.3096),
    "hyderabad": (17.3850, 78.4867),
    "delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "chennai": (13.0827, 80.2707),
    "bengaluru": (12.9716, 77.5946),
    "lucknow": (26.8467, 80.9462),
    "jaipur": (26.9124, 75.7873),
    "patna": (25.6093, 85.1376),
    "chandigarh": (30.7333, 76.7794),
    "ludhiana": (30.9010, 75.8573),
    "amritsar": (31.6340, 74.8723),
    "nagpur": (21.1458, 79.0882),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "varanasi": (25.3176, 82.9739),
    "guwahati": (26.1445, 91.7362),
    "thiruvananthapuram": (8.5241, 76.9366),
    "kochi": (9.9312, 76.2673),
    "visakhapatnam": (17.6868, 83.2185),
    "coimbatore": (11.0168, 76.9558),
    "sambalpur": (21.4669, 83.9812),
    "berhampur": (19.3150, 84.7941),
    "rourkela": (22.2604, 84.8536),
    "balasore": (21.4934, 86.9337),
}

_FARMING_TIPS: dict[str, str] = {
    "clear": "Good day for field work, spraying, and harvesting.",
    "clouds": "Moderate weather; ideal for transplanting seedlings.",
    "rain": "Avoid spraying pesticides. Ensure drainage is clear.",
    "drizzle": "Light rain — monitor crops for fungal activity.",
    "thunderstorm": "Stay indoors; secure livestock and equipment.",
    "mist": "Reduce outdoor exposure. Watch for fungal spread in high humidity.",
    "haze": "Reduce outdoor exposure for farm workers.",
    "snow": "Protect crops with mulch. Avoid irrigation.",
}


def is_configured() -> bool:
    """Return True if the OpenWeather API key is present."""
    return bool(get_settings().openweather_api_key)


def _get_coords(district: str) -> tuple[float, float] | None:
    """Resolve a district name to (lat, lon)."""
    key = district.lower().strip()
    return _DISTRICT_COORDS.get(key)


def get_current(state: str, district: str) -> dict[str, Any]:
    """Get current weather for a location via OpenWeather API.

    Returns a dict with temperature, humidity, wind, condition, farming_tip.
    Falls back to a graceful error dict if the API key is missing.
    """
    settings = get_settings()
    if not settings.openweather_api_key:
        return {
            "source": "unavailable",
            "message": "OpenWeather API key not configured. Using demo weather data.",
        }

    coords = _get_coords(district)
    if not coords:
        # Try geocoding via OpenWeather
        coords = _geocode(district, state, settings.openweather_api_key)
        if not coords:
            return {
                "source": "error",
                "message": f"Could not find coordinates for {district}, {state}.",
            }

    lat, lon = coords
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{_OWM_BASE}/weather",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweather_api_key,
                    "units": "metric",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        main = data.get("main", {})
        wind = data.get("wind", {})
        weather = data.get("weather", [{}])[0]
        condition_key = weather.get("main", "clear").lower()

        return {
            "source": "openweather_live",
            "location": f"{district}, {state}",
            "condition": weather.get("description", "").title(),
            "temperature_c": main.get("temp"),
            "feels_like_c": main.get("feels_like"),
            "temp_min_c": main.get("temp_min"),
            "temp_max_c": main.get("temp_max"),
            "humidity": main.get("humidity"),
            "pressure_hpa": main.get("pressure"),
            "wind_speed_kmh": round((wind.get("speed", 0) * 3.6), 1),
            "wind_direction_deg": wind.get("deg"),
            "visibility_m": data.get("visibility"),
            "farming_tip": _FARMING_TIPS.get(condition_key, "Monitor weather conditions before field operations."),
        }
    except httpx.HTTPStatusError as e:
        logger.error("OpenWeather API error: %s", e.response.status_code)
        return {"source": "error", "message": f"Weather API error (HTTP {e.response.status_code})."}
    except Exception as e:
        logger.exception("OpenWeather request failed")
        return {"source": "error", "message": f"Weather service temporarily unavailable: {e}"}


def get_forecast(state: str, district: str, days: int = 5) -> dict[str, Any]:
    """Get weather forecast for a location via OpenWeather API.

    Returns a dict with daily forecasts including agricultural tips.
    """
    settings = get_settings()
    if not settings.openweather_api_key:
        return {
            "source": "unavailable",
            "message": "OpenWeather API key not configured. Using demo weather data.",
        }

    coords = _get_coords(district)
    if not coords:
        coords = _geocode(district, state, settings.openweather_api_key)
        if not coords:
            return {"source": "error", "message": f"Could not find coordinates for {district}, {state}."}

    lat, lon = coords
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{_OWM_BASE}/forecast",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweather_api_key,
                    "units": "metric",
                    "cnt": min(days * 8, 40),  # 3-hour intervals
                },
            )
            resp.raise_for_status()
            data = resp.json()

        # Aggregate into daily summaries
        daily: dict[str, dict] = {}
        for item in data.get("list", []):
            date_str = item.get("dt_txt", "")[:10]
            if date_str not in daily:
                main = item.get("main", {})
                weather = item.get("weather", [{}])[0]
                condition_key = weather.get("main", "clear").lower()
                daily[date_str] = {
                    "date": date_str,
                    "condition": weather.get("description", "").title(),
                    "temp_high_c": main.get("temp_max"),
                    "temp_low_c": main.get("temp_min"),
                    "humidity": main.get("humidity"),
                    "wind_speed_kmh": round((item.get("wind", {}).get("speed", 0) * 3.6), 1),
                    "rain_probability": item.get("pop", 0) * 100,
                    "farming_tip": _FARMING_TIPS.get(condition_key, "Monitor conditions."),
                }

        forecasts = list(daily.values())[:days]
        return {
            "source": "openweather_live",
            "location": f"{district}, {state}",
            "forecasts": forecasts,
        }
    except Exception as e:
        logger.exception("OpenWeather forecast failed")
        return {"source": "error", "message": f"Forecast unavailable: {e}"}


def _geocode(district: str, state: str, api_key: str) -> tuple[float, float] | None:
    """Use OpenWeather geocoding to resolve a location name."""
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={
                    "q": f"{district},{state},IN",
                    "limit": 1,
                    "appid": api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            if data:
                return (data[0]["lat"], data[0]["lon"])
    except Exception:
        logger.exception("OpenWeather geocoding failed for %s, %s", district, state)
    return None
