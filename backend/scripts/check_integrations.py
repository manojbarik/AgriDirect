#!/usr/bin/env python3
"""AgriDirect Integration Health Check.

Run:
    cd backend && source .venv/bin/activate
    python scripts/check_integrations.py

Verifies connectivity for each external service.
NEVER prints secret values.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402


def _status(label: str, ok: bool, detail: str = "") -> None:
    icon = "✓" if ok else "⚠"
    color = "\033[92m" if ok else "\033[93m"
    reset = "\033[0m"
    suffix = f" — {detail}" if detail else ""
    print(f"  {color}{icon}{reset} {label}{suffix}")


def check_database(settings) -> bool:
    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _status("Database", True, "connected")
        return True
    except Exception as e:
        _status("Database", False, str(e))
        return False


def check_smtp(settings) -> bool:
    if not settings.smtp_user or not settings.smtp_app_password:
        _status("SMTP", False, "SMTP_USER / SMTP_APP_PASSWORD not configured")
        return False
    try:
        import smtplib

        if settings.smtp_port == 465:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as srv:
                srv.login(settings.smtp_user, settings.smtp_app_password)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as srv:
                srv.ehlo()
                srv.starttls()
                srv.login(settings.smtp_user, settings.smtp_app_password)
        _status("SMTP", True, f"authenticated as {settings.smtp_user}")
        return True
    except Exception as e:
        _status("SMTP", False, str(e))
        return False


def check_gemini(settings) -> bool:
    if not settings.gemini_api_key:
        _status("Gemini", False, "GEMINI_API_KEY not configured")
        return False
    try:
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(api_key=settings.gemini_api_key)
        model_to_use = getattr(settings, "gemini_live_model", "gemini-2.5-flash") or "gemini-2.5-flash"
        response = client.models.generate_content(
            model=model_to_use,
            contents="Respond with exactly: OK",
            config=genai_types.GenerateContentConfig(max_output_tokens=10),
        )
        text = response.text.strip() if response.text else ""
        _status("Gemini", True, f"model responded: {text[:20]}")
        return True
    except Exception as e:
        _status("Gemini", False, str(e))
        return False


def check_openweather(settings) -> bool:
    if not settings.openweather_api_key:
        _status("OpenWeather", False, "OPENWEATHER_API_KEY not configured")
        return False
    try:
        import httpx

        resp = httpx.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": 20.2961,
                "lon": 85.8245,
                "appid": settings.openweather_api_key,
                "units": "metric",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        temp = data.get("main", {}).get("temp", "?")
        city = data.get("name", "?")
        _status("OpenWeather", True, f"{city}: {temp}°C")
        return True
    except Exception as e:
        _status("OpenWeather", False, str(e))
        return False


def check_tavily(settings) -> bool:
    if not settings.tavily_api_key:
        _status("Tavily", False, "TAVILY_API_KEY not configured")
        return False
    try:
        import httpx

        resp = httpx.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": "Indian agriculture",
                "search_depth": "basic",
                "max_results": 1,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        _status("Tavily", True, f"{len(results)} result(s) returned")
        return True
    except Exception as e:
        _status("Tavily", False, str(e))
        return False


def check_whatsapp(settings) -> bool:
    configured = bool(settings.whatsapp_api_key and settings.whatsapp_phone_id)
    _status("WhatsApp", configured, "configured" if configured else "not configured")
    return configured


def check_telephony(settings) -> bool:
    configured = bool(settings.telephony_provider_key)
    _status("Telephony", configured, "configured" if configured else "not configured")
    return configured


def main() -> None:
    print("\n╔══════════════════════════════════════════════╗")
    print("║   AgriDirect Integration Health Check        ║")
    print("╚══════════════════════════════════════════════╝\n")

    settings = get_settings()

    checks = [
        ("Database", check_database),
        ("SMTP", check_smtp),
        ("Gemini", check_gemini),
        ("OpenWeather", check_openweather),
        ("Tavily", check_tavily),
        ("WhatsApp", check_whatsapp),
        ("Telephony", check_telephony),
    ]

    passed = 0
    total = len(checks)

    for name, fn in checks:
        if fn(settings):
            passed += 1

    print(f"\n  Result: {passed}/{total} integrations verified\n")


if __name__ == "__main__":
    main()
