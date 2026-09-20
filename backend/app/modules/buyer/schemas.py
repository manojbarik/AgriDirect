from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BuyerType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    RESTAURANT = "RESTAURANT"
    HOTEL_HOSTEL = "HOTEL_HOSTEL"
    RETAILER = "RETAILER"
    WHOLESALER = "WHOLESALER"
    BUSINESS = "BUSINESS"


BUSINESS_BUYER_TYPES = {
    BuyerType.RESTAURANT,
    BuyerType.HOTEL_HOSTEL,
    BuyerType.RETAILER,
    BuyerType.WHOLESALER,
    BuyerType.BUSINESS,
}


class BuyerProfileCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    buyer_type: BuyerType
    business_name: str | None = Field(default=None, max_length=200)


class BuyerProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    buyer_type: BuyerType | None = None
    business_name: str | None = Field(default=None, max_length=200)


class BuyerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    buyer_type: str
    business_name: str | None
    verification_status: str
    payment_verification_status: str
    address_summary: str | None
    state: str | None
    district: str | None
    locality: str | None
    postal_code: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    payment_profile_reference: str | None
    created_at: datetime
    updated_at: datetime


class BuyerLocationUpdate(BaseModel):
    address_summary: str | None = Field(default=None, max_length=5000)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    locality: str | None = Field(default=None, max_length=120)
    postal_code: str | None = Field(default=None, max_length=20)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)


class OnboardingStep(BaseModel):
    key: str
    label: str
    done: bool


class BuyerStatusResponse(BaseModel):
    verification_status: str
    payment_verification_status: str
    completion_percent: int
    steps: list[OnboardingStep]
    identity_can_submit: bool
    payment_can_submit: bool


class BuyerVerificationSubmitResponse(BaseModel):
    verification_status: str
    provider_reference: str | None
    reason: str | None


class BuyerDemandCreate(BaseModel):
    crop_id: UUID
    requested_quantity: Decimal = Field(gt=0)
    unit: str = Field(default="kg", min_length=1, max_length=30)
    target_min_price: Decimal | None = Field(default=None, ge=0)
    target_max_price: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="INR", pattern=r"^[A-Z]{3}$")
    quality_requirements: str | None = Field(default=None, max_length=5000)
    delivery_address_summary: str | None = Field(default=None, max_length=5000)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    required_by: date

    @model_validator(mode="after")
    def price_range_valid(self) -> "BuyerDemandCreate":
        if (
            self.target_min_price is not None
            and self.target_max_price is not None
            and self.target_max_price < self.target_min_price
        ):
            raise ValueError("target_max_price must not be below target_min_price")
        return self


class BuyerDemandUpdate(BaseModel):
    requested_quantity: Decimal | None = Field(default=None, gt=0)
    unit: str | None = Field(default=None, min_length=1, max_length=30)
    target_min_price: Decimal | None = Field(default=None, ge=0)
    target_max_price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    quality_requirements: str | None = Field(default=None, max_length=5000)
    delivery_address_summary: str | None = Field(default=None, max_length=5000)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    required_by: date | None = None


class BuyerDemandResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    buyer_id: UUID
    crop_id: UUID
    crop_name: str | None
    crop_variety: str | None
    requested_quantity: Decimal
    unit: str
    target_min_price: Decimal | None
    target_max_price: Decimal | None
    currency: str
    quality_requirements: str | None
    delivery_address_summary: str | None
    state: str | None
    district: str | None
    required_by: date
    status: str
    created_at: datetime


class BuyerDashboardResponse(BaseModel):
    verification_status: str
    payment_verification_status: str
    profile_completion_percent: int
    marketplace_listings_count: int
    demands_count: int
    recommendations_count: int
    orders_count: int
    payments_count: int
    deliveries_count: int
    disputes_count: int
    reviews_count: int
    trust_score: Decimal
    trust_band: str
