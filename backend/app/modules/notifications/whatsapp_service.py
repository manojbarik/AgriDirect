"""WhatsAppService — WhatsApp messaging abstraction (stub).

No WhatsApp Business API credentials are currently configured.
This module provides a clean interface for future integration.
"""

from __future__ import annotations

from app.core.config import get_settings


def is_configured() -> bool:
    """Return True if WhatsApp API credentials are present."""
    settings = get_settings()
    return bool(settings.whatsapp_api_key and settings.whatsapp_phone_id)


def get_status() -> dict:
    """Return the current WhatsApp service status."""
    if is_configured():
        return {
            "status": "configured",
            "message": "WhatsApp messaging is available.",
        }
    return {
        "status": "not_configured",
        "message": "WhatsApp: Coming Soon. No WhatsApp Business API credentials are configured.",
    }


def send_message(phone_number: str, message: str) -> dict:
    """Send a WhatsApp message (stub).

    When WhatsApp Business API credentials are configured, this
    will send messages for: order notifications, shipment updates,
    buyer/farmer communication, and assistant messages.
    """
    if not is_configured():
        return {
            "success": False,
            "error": "WhatsApp not configured. Messages are sent via in-app notifications.",
        }

    # Future: implement via Meta WhatsApp Business API
    return {
        "success": False,
        "error": "WhatsApp integration not yet implemented.",
    }


def send_order_notification(phone_number: str, order_id: str, status: str) -> dict:
    """Send order status notification via WhatsApp (stub)."""
    return send_message(
        phone_number,
        f"AgriDirect: Your order #{order_id} status updated to: {status}",
    )


def send_shipment_notification(phone_number: str, tracking_id: str, status: str) -> dict:
    """Send shipment tracking notification via WhatsApp (stub)."""
    return send_message(
        phone_number,
        f"AgriDirect: Shipment {tracking_id} — {status}",
    )
