"""Payment provider interface and deterministic mock implementation.

The abstraction keeps the marketplace decoupled from any specific payment
provider (Razorpay, PayU, Stripe, etc.). No real money is ever moved: the
mock provider simulates the provider lifecycle in development and tests and
returns sandbox-style references. A real provider must implement the same
interface and is selected through ``PAYMENT_PROVIDER_MODE``.

Security invariants enforced by design:
- Raw card or bank details are never stored or passed to this layer.
- Provider credentials come from environment variables only
  (see ``Settings.payment_*``), never from the database.
- Every provider event is matched by an idempotent ``provider_event_id``.
"""

from __future__ import annotations

import logging
import secrets
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PaymentIntentReceipt:
    provider_reference: str
    checkout_url: str | None
    status: str = "PENDING"


@dataclass(frozen=True)
class ProviderConfirmation:
    status: str
    provider_event_id: str
    failure_code: str | None = field(default=None)


@dataclass(frozen=True)
class ProviderRefund:
    status: str
    provider_reference: str
    provider_event_id: str


@dataclass(frozen=True)
class PayoutReceipt:
    status: str
    provider_reference: str
    provider_event_id: str


class PaymentProvider(ABC):
    """Interface every payment provider (mock or real) must implement."""

    def __init__(self, mode: str = "success") -> None:
        self.mode = mode

    provider_name: str = "provider"

    @abstractmethod
    def create_intent(
        self, *, amount: Decimal, currency: str, reference: str
    ) -> PaymentIntentReceipt:
        """Create a provider-side payment intent for ``reference`` (no money moved)."""

    @abstractmethod
    def confirm_capture(
        self, *, provider_reference: str, amount: Decimal, currency: str
    ) -> ProviderConfirmation:
        """Simulate/perform capture of an authorized payment."""

    @abstractmethod
    def refund(
        self, *, provider_reference: str, amount: Decimal, currency: str
    ) -> ProviderRefund:
        """Refund (part of) a captured payment."""

    @abstractmethod
    def transfer(
        self, *, amount: Decimal, currency: str, destination_ref: str
    ) -> PayoutReceipt:
        """Transfer money to the farmer (settlement payout). No real transfer in mock."""


class MockPaymentProvider(PaymentProvider):
    """Deterministic mock provider for development and tests.

    mode="success": every intent/capture/refund/payout succeeds with a
    sandbox reference. mode="fail": captures fail with ``PAYMENT_DECLINED``.
    """

    provider_name = "mock"

    def create_intent(
        self, *, amount: Decimal, currency: str, reference: str
    ) -> PaymentIntentReceipt:
        return PaymentIntentReceipt(
            provider_reference=f"mock-int-{reference}",
            checkout_url=f"https://sandbox-pay.example/checkout/{reference}",
            status="PENDING",
        )

    def confirm_capture(
        self, *, provider_reference: str, amount: Decimal, currency: str
    ) -> ProviderConfirmation:
        if self.mode == "fail":
            logger.info("[mock-payment] capture failed for %s", provider_reference)
            return ProviderConfirmation(
                status="FAILED",
                provider_event_id=f"evt-mock-fail-{secrets.token_hex(4)}",
                failure_code="PAYMENT_DECLINED",
            )
        logger.info("[mock-payment] captured %s reference=%s", amount, provider_reference)
        return ProviderConfirmation(
            status="PAID",
            provider_event_id=f"evt-mock-{secrets.token_hex(4)}",
            failure_code=None,
        )

    def refund(
        self, *, provider_reference: str, amount: Decimal, currency: str
    ) -> ProviderRefund:
        logger.info("[mock-payment] refunded %s reference=%s", amount, provider_reference)
        return ProviderRefund(
            status="SETTLED",
            provider_reference=f"mock-ref-{secrets.token_hex(4)}",
            provider_event_id=f"evt-mock-refund-{secrets.token_hex(4)}",
        )

    def transfer(
        self, *, amount: Decimal, currency: str, destination_ref: str
    ) -> PayoutReceipt:
        logger.info("[mock-payment] payout %s to %s", amount, destination_ref)
        return PayoutReceipt(
            status="SETTLED",
            provider_reference=f"mock-pay-{secrets.token_hex(4)}",
            provider_event_id=f"evt-mock-payout-{secrets.token_hex(4)}",
        )


def get_payment_provider() -> PaymentProvider:
    """Return the active payment provider based on environment configuration.

    ``PAYMENT_PROVIDER_MODE=mock`` (default) returns the sandbox provider.
    A real provider slot is reserved here; credentials are read from env by a
    future provider class and never from the database.
    """
    settings = get_settings()
    if settings.payment_provider_mode == "mock":
        return MockPaymentProvider(mode=settings.payment_mock_mode)
    if settings.payment_provider_mode == "razorpay":
        raise NotImplementedError(
            "A Razorpay adapter is not implemented in this phase; "
            "implement PaymentProvider and read credentials from PAYMENT_PROVIDER_KEY_ID/SECRET."
        )
    raise ValueError(f"Unknown payment provider mode: {settings.payment_provider_mode}")