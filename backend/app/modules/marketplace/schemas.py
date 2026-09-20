from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MarketplaceListingResponse(BaseModel):
    id: UUID
    farmer_id: UUID
    farm_id: UUID
    crop_id: UUID
    crop_name: str | None
    crop_variety: str | None
    category: str | None
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
    farmer_name: str | None
    farmer_verification_status: str | None
    farm_name: str | None


class MarketplaceListingsPage(BaseModel):
    items: list[MarketplaceListingResponse]
    total: int
    page: int
    page_size: int
    pages: int


class MarketplaceLocationItem(BaseModel):
    state: str | None
    district: str | None


class MarketplaceFarmSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    acreage: Decimal | None
    farming_type: str | None
    state: str | None
    district: str | None
    locality: str | None
    postal_code: str | None


class MarketplaceFarmerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    verification_status: str
    preferred_language: str | None
    farms: list[MarketplaceFarmSummary]
    active_listings_count: int
    trust_score: Decimal
    trust_band: str
    rating_avg: Decimal | None


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
