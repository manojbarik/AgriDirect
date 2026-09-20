"""Notification templates. Each event maps event_type -> (title, body).

Body templates support {key} substitution from the emit context. Unknown keys are
left as-is so a missing value never raises while building a notification.
"""

from __future__ import annotations

NOTIFICATION_EVENTS = (
    "registration",
    "verification",
    "new_buyer_demand",
    "new_farmer_match",
    "order_request",
    "order_accepted",
    "payment_received",
    "batch_ready",
    "delivery_update",
    "quality_confirmation",
    "dispute",
    "refund",
    "settlement",
    "new_review",
    "password_reset_requested",
    "password_changed",
)

_TEMPLATES: dict[str, tuple[str, str]] = {
    "registration": (
        "Welcome to the marketplace",
        "Your account is ready. Verify your phone to become ACTIVE and start trading.",
    ),
    "verification": (
        "Identity verified",
        "Your {role} verification was approved by an administrator.",
    ),
    "new_buyer_demand": (
        "New buyer demand",
        "{buyer_name} posted a demand for {quantity} {unit} of {crop} in {location}.",
    ),
    "new_farmer_match": (
        "New farmer match",
        "{farmer_name} listed {crop} at ₹{price}/{unit} in {location} that matches your demand.",
    ),
    "order_request": (
        "New order request",
        "{buyer_name} requested {quantity} {unit} of {crop} (order {order}). Review and respond.",
    ),
    "order_accepted": (
        "Order accepted",
        "{farmer_name} accepted your order {order} for {quantity} {unit} of {crop}.",
    ),
    "payment_received": (
        "Payment received",
        "Payment of ₹{amount} for order {order} was received.",
    ),
    "batch_ready": (
        "Batch ready",
        "The batch for order {order} is prepared and ready for pickup.",
    ),
    "delivery_update": (
        "Delivery update",
        "Order {order}: status is now {status}.",
    ),
    "quality_confirmation": (
        "Quality confirmed",
        "Quality for order {order} was confirmed. Thank you for reviewing the produce.",
    ),
    "dispute": (
        "Dispute update",
        "Order {order} was placed under dispute and paused. An administrator will review it.",
    ),
    "refund": (
        "Refund processed",
        "A refund of ₹{amount} was processed for order {order}.",
    ),
    "settlement": (
        "Settlement released",
        "Your settlement of ₹{amount} for order {order} was released to your account.",
    ),
    "new_review": (
        "New review",
        "{reviewer_name} rated you {rating}/5 on order {order}.",
    ),
    "password_reset_requested": (
        "Password reset requested",
        "A password reset was requested for your account. The link expires in {ttl_minutes} minutes. If you did not request this, you can safely ignore this message.",
    ),
    "password_changed": (
        "Password changed",
        "Your password was updated successfully. Sessions on other devices have been signed out.",
    ),
}


def get_template(event_type: str) -> tuple[str, str] | None:
    return _TEMPLATES.get(event_type)


def render(title: str, body: str, context: dict[str, object]) -> tuple[str, str]:
    def _fill(template: str) -> str:
        for key, value in context.items():
            template = template.replace(f"{{{key}}}", str(value))
        return template

    return _fill(title), _fill(body)