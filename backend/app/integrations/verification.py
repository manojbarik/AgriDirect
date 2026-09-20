"""Farmer verification provider interface and deterministic mock implementation.

The mock provider mirrors the OTP provider: it is safe and repeatable for
development and tests, and it never exposes a real identity or KYC document.
A real provider (DigiLocker, NSDL, etc.) must implement the same interface.

Mock rules:
- PENDING when any required onboarding input is missing.
- VERIFIED only when the profile has a name, at least one farm, a located
  farm (state + district + locality + postal code), and at least one crop plan.
- REJECTED is never produced automatically by the mock; it is applied by an
  administrator through the admin verification queue.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FarmerVerificationInput:
    full_name: str | None
    farm_count: int
    located_farm_count: int
    crop_plan_count: int


@dataclass(frozen=True)
class VerificationReceipt:
    provider_reference: str | None
    status: str
    reason: str | None = field(default=None)


class VerificationProvider(ABC):
    @abstractmethod
    def submit(self, data: FarmerVerificationInput) -> VerificationReceipt:
        """Submit the farmer onboarding snapshot for verification."""

    @abstractmethod
    def approve(self, reference: str | None, reason: str | None = None) -> VerificationReceipt:
        """Explicitly approve a submission (mock: local development/admin)."""

    @abstractmethod
    def reject(self, reference: str | None, reason: str | None = None) -> VerificationReceipt:
        """Explicitly reject a submission (mock: local development/admin)."""


class MockVerificationProvider(VerificationProvider):
    def submit(self, data: FarmerVerificationInput) -> VerificationReceipt:
        missing: list[str] = []
        if not data.full_name:
            missing.append("profile")
        if data.farm_count == 0:
            missing.append("farm")
        if data.farm_count > 0 and data.located_farm_count == 0:
            missing.append("location")
        if data.crop_plan_count == 0:
            missing.append("crops")
        if missing:
            return VerificationReceipt(
                provider_reference=None,
                status="PENDING",
                reason=f"Missing required onboarding data: {', '.join(missing)}",
            )
        logger.info("[mock-verification] granted VERIFIED for complete farmer profile")
        return VerificationReceipt(
            provider_reference="mock-verify-ok",
            status="VERIFIED",
            reason=None,
        )

    def approve(self, reference: str | None, reason: str | None = None) -> VerificationReceipt:
        return VerificationReceipt(
            provider_reference=reference or "mock-verify-admin",
            status="VERIFIED",
            reason=reason,
        )

    def reject(self, reference: str | None, reason: str | None = None) -> VerificationReceipt:
        return VerificationReceipt(
            provider_reference=reference or "mock-verify-admin",
            status="REJECTED",
            reason=reason or "Rejected by an administrator",
        )


def get_verification_provider() -> VerificationProvider:
    return MockVerificationProvider()
