"""VoiceCallService — Telephony abstraction (stub).

No telephony provider is currently configured.
This module provides a clean interface for future integration
(Twilio, Exotel, etc.).
"""

from __future__ import annotations

from app.core.config import get_settings


def is_configured() -> bool:
    """Return True if a telephony provider key is present."""
    return bool(get_settings().telephony_provider_key)


def get_status() -> dict:
    """Return the current telephony service status."""
    if is_configured():
        return {
            "status": "configured",
            "message": "Voice call service is available.",
        }
    return {
        "status": "not_configured",
        "message": "Voice call feature: Coming Soon. No telephony provider is currently configured. Browser-based voice assistant is available.",
    }


def initiate_call(phone_number: str, message: str) -> dict:
    """Initiate a voice call (stub).

    When a telephony provider is configured, this method will
    place an actual phone call via the provider API.
    """
    if not is_configured():
        return {
            "success": False,
            "error": "Telephony provider not configured. Use the browser-based voice assistant instead.",
        }

    # Future: implement actual call via Twilio/Exotel
    return {
        "success": False,
        "error": "Telephony integration not yet implemented.",
    }
