"""Buyer identity/business and payment verification provider interfaces.

Photographic verification architecture with deterministic mock implementations
for development and tests. A real provider (e.g. DigiLocker/NSDL for identity,
a payment gateway for payment-method verification) must implement the same
interface; nothing real is stored here.

Mock rules:
- Identity/business verification returns PENDING when the buyer type, name, or
  business name (for business buyer types) is missing.
- Payment verification returns PENDING when the buyer identity is not verified
  or the buyer has no complete location (used as the payment address).
- REJECTED is never produced automatically; it is applied by an administrator
  through the admin verification queue.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

BUSINESS_BUYER_TYPES = (
    "RESTAURANT",
    "HOTEL_HOSTEL",
    "RETAILER",
    "WHOLESALER",
    "BUSINESS",
)


@dataclass(frozen=True)
class BuyerIdentityVerificationInput:
    full_name: str | None
    buyer_type: str | None
    business_name: str | None


@dataclass(frozen=True)
class BuyerPaymentVerificationInput:
    identity_verified: bool
    location_complete: bool


@dataclass(frozen=True)
class BuyerVerificationReceipt:
    provider_reference: str | None
    status: str
    reason: str | None = field(default=None)


class BuyerVerificationProvider(ABC):
    @abstractmethod
    def submit_identity(self, data: BuyerIdentityVerificationInput) -> BuyerVerificationReceipt:
        """Submit the buyer identity/business snapshot for verification."""

    @abstractmethod
    def submit_payment(self, data: BuyerPaymentVerificationInput) -> BuyerVerificationReceipt:
        """Submit the buyer payment-method snapshot for verification."""

    @abstractmethod
    def approve_identity(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        """Explicitly approve a buyer identity submission (mock: admin)."""

    @abstractmethod
    def reject_identity(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        """Explicitly reject a buyer identity submission (mock: admin)."""

    @abstractmethod
    def approve_payment(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        """Explicitly approve a buyer payment submission (mock: admin)."""

    @abstractmethod
    def reject_payment(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        """Explicitly reject a buyer payment submission (mock: admin)."""


class MockBuyerVerificationProvider(BuyerVerificationProvider):
    def submit_identity(self, data: BuyerIdentityVerificationInput) -> BuyerVerificationReceipt:
        missing: list[str] = []
        if not data.full_name:
            missing.append("basic information")
        if not data.buyer_type:
            missing.append("buyer type")
        if data.buyer_type in BUSINESS_BUYER_TYPES and not data.business_name:
            missing.append("business name")
        if missing:
            return BuyerVerificationReceipt(
                provider_reference=None,
                status="PENDING",
                reason=f"Missing required buyer data: {', '.join(missing)}",
            )
        logger.info(
            "[mock-buyer-verification] granted VERIFIED identity for complete buyer profile"
        )
        return BuyerVerificationReceipt(
            provider_reference="mock-verify-ok",
            status="VERIFIED",
            reason=None,
        )

    def submit_payment(self, data: BuyerPaymentVerificationInput) -> BuyerVerificationReceipt:
        if not data.identity_verified:
            return BuyerVerificationReceipt(
                provider_reference=None,
                status="PENDING",
                reason="Identity/business verification must be completed before payment verification",
            )
        if not data.location_complete:
            return BuyerVerificationReceipt(
                provider_reference=None,
                status="PENDING",
                reason="Missing payment address (state, district, locality, postal code)",
            )
        logger.info("[mock-buyer-verification] granted VERIFIED payment for located buyer")
        return BuyerVerificationReceipt(
            provider_reference="mock-payment-ok",
            status="VERIFIED",
            reason=None,
        )

    def approve_identity(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        return BuyerVerificationReceipt(
            provider_reference=reference or "mock-verify-admin",
            status="VERIFIED",
            reason=reason,
        )

    def reject_identity(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        return BuyerVerificationReceipt(
            provider_reference=reference or "mock-verify-admin",
            status="REJECTED",
            reason=reason or "Rejected by an administrator",
        )

    def approve_payment(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        return BuyerVerificationReceipt(
            provider_reference=reference or "mock-payment-admin",
            status="VERIFIED",
            reason=reason,
        )

    def reject_payment(
        self, reference: str | None, reason: str | None = None
    ) -> BuyerVerificationReceipt:
        return BuyerVerificationReceipt(
            provider_reference=reference or "mock-payment-admin",
            status="REJECTED",
            reason=reason or "Rejected by an administrator",
        )


def get_buyer_verification_provider() -> BuyerVerificationProvider:
    return MockBuyerVerificationProvider()
