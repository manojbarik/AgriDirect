"""Notification provider abstraction.

In-app notifications are the first (and currently only real) channel. Email, SMS, and
push providers are declared here so they can be implemented later without touching the
dispatch logic — the service only talks to this registry.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class NotificationProvider(ABC):
    """Abstract transport for out-of-band notification channels."""

    channel: str = "UNKNOWN"

    @abstractmethod
    def deliver(
        self,
        *,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
    ) -> str | None:
        """Push the notification; return a provider reference or None if skipped."""


class NoOpProvider(NotificationProvider):
    """Placeholder transport that will be replaced by real integrations later."""

    def __init__(self, channel: str) -> None:
        self.channel = channel

    def deliver(
        self,
        *,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
    ) -> str | None:
        logger.info(
            "[%s] would notify user %s about %s: %s", self.channel, user_id, notification_type, title
        )
        return f"stub:{self.channel}:{notification_type}"


_REGISTRY: tuple[NotificationProvider, ...] = (
    NoOpProvider("EMAIL"),
    NoOpProvider("SMS"),
    NoOpProvider("PUSH"),
)


def get_out_of_band_providers() -> tuple[NotificationProvider, ...]:
    """Providers used when a dispatch happens outside the in-app channel."""
    return _REGISTRY


def dispatch_out_of_band(
    *,
    user_id: str,
    notification_type: str,
    title: str,
    body: str,
) -> list[str]:
    references: list[str] = []
    for provider in get_out_of_band_providers():
        reference = provider.deliver(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            body=body,
        )
        if reference:
            references.append(reference)
    return references