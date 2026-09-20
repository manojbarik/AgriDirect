from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FarmerProfileCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    preferred_language: str | None = Field(default=None, max_length=20)


class FarmerProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    preferred_language: str | None = Field(default=None, max_length=20)


class FarmerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    verification_status: str
    preferred_language: str | None
    created_at: datetime
    updated_at: datetime


class FarmCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    acreage: Decimal | None = Field(default=None, ge=0)
    farming_type: str | None = Field(default=None, max_length=80)


class FarmUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    acreage: Decimal | None = Field(default=None, ge=0)
    farming_type: str | None = Field(default=None, max_length=80)


class FarmLocationUpdate(BaseModel):
    address_summary: str | None = Field(default=None, max_length=5000)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    locality: str | None = Field(default=None, max_length=120)
    postal_code: str | None = Field(default=None, max_length=20)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)


class FarmResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farmer_id: UUID
    name: str
    acreage: Decimal | None
    farming_type: str | None
    address_summary: str | None
    state: str | None
    district: str | None
    locality: str | None
    postal_code: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    created_at: datetime
    updated_at: datetime


class CropPlanCreate(BaseModel):
    crop_id: UUID
    season: str | None = Field(default=None, max_length=80)
    expected_harvest_start: date | None = None
    expected_harvest_end: date | None = None
    estimated_quantity: Decimal | None = Field(default=None, ge=0)
    cultivation_method: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def harvest_window_valid(self) -> "CropPlanCreate":
        if (
            self.expected_harvest_start is not None
            and self.expected_harvest_end is not None
            and self.expected_harvest_end < self.expected_harvest_start
        ):
            raise ValueError("expected_harvest_end must not be before expected_harvest_start")
        return self


class CropPlanUpdate(BaseModel):
    crop_id: UUID | None = None
    season: str | None = Field(default=None, max_length=80)
    expected_harvest_start: date | None = None
    expected_harvest_end: date | None = None
    estimated_quantity: Decimal | None = Field(default=None, ge=0)
    cultivation_method: str | None = Field(default=None, max_length=100)


class CropPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    crop_id: UUID
    crop_name: str | None
    crop_variety: str | None
    season: str | None
    expected_harvest_start: date | None
    expected_harvest_end: date | None
    estimated_quantity: Decimal | None
    cultivation_method: str | None
    status: str
    created_at: datetime


class CropCatalogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    variety: str | None
    category: str | None
    default_unit: str


class CropListingCreate(BaseModel):
    farm_id: UUID
    crop_id: UUID
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    grade: str | None = Field(default=None, max_length=80)
    unit: str = Field(min_length=1, max_length=30)
    available_quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    currency: str = Field(default="INR", pattern=r"^[A-Z]{3}$")
    available_from: date | None = None
    available_until: date | None = None

    @model_validator(mode="after")
    def availability_window_valid(self) -> "CropListingCreate":
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_until < self.available_from
        ):
            raise ValueError("available_until must not be before available_from")
        return self


class CropListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    grade: str | None = Field(default=None, max_length=80)
    unit: str | None = Field(default=None, min_length=1, max_length=30)
    available_quantity: Decimal | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    available_from: date | None = None
    available_until: date | None = None


class CropListingResponse(BaseModel):
    id: UUID
    farmer_id: UUID
    farm_id: UUID
    crop_id: UUID
    crop_name: str | None
    crop_variety: str | None
    title: str
    description: str | None
    grade: str | None
    unit: str
    available_quantity: Decimal
    unit_price: Decimal
    currency: str
    available_from: date | None
    available_until: date | None
    state: str | None
    district: str | None
    status: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class OnboardingStep(BaseModel):
    key: str
    label: str
    done: bool


class FarmerStatusResponse(BaseModel):
    verification_status: str
    completion_percent: int
    steps: list[OnboardingStep]
    can_submit: bool


class VerificationSubmitResponse(BaseModel):
    verification_status: str
    provider_reference: str | None
    reason: str | None


class FarmerDashboardResponse(BaseModel):
    profile_completion_percent: int
    verification_status: str
    farms_count: int
    crops_count: int
    active_listings_count: int
    orders_count: int
    batches_count: int
    earnings: Decimal
    trust_score: Decimal
    trust_band: str
