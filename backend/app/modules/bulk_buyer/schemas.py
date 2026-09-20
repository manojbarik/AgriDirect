from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrgType(str, Enum):
    FPO = "FPO"
    CO_OPERATIVE = "CO_OPERATIVE"
    PROCESSOR = "PROCESSOR"
    WHOLESALER = "WHOLESALER"
    EXPORTER = "EXPORTER"
    RETAIL_CHAIN = "RETAIL_CHAIN"
    OTHER = "OTHER"


class BulkBuyerProfileCreate(BaseModel):
    organization_name: str = Field(min_length=2, max_length=200)
    org_type: OrgType
    gstin: str | None = Field(default=None, max_length=20)
    contact_person: str | None = Field(default=None, max_length=160)


class BulkBuyerProfileUpdate(BaseModel):
    organization_name: str | None = Field(default=None, min_length=2, max_length=200)
    org_type: OrgType | None = None
    gstin: str | None = Field(default=None, max_length=20)
    contact_person: str | None = Field(default=None, max_length=160)


class BulkBuyerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    organization_name: str
    org_type: str
    gstin: str | None
    contact_person: str | None
    verification_status: str
    created_at: datetime
    updated_at: datetime


class RecommendedListing(BaseModel):
    listing_id: UUID
    title: str
    crop_name: str
    grade: str | None
    unit: str
    available_quantity: Decimal
    unit_price: Decimal
    currency: str
    state: str | None
    district: str | None
    supplier_name: str


class BulkBuyerDashboardResponse(BaseModel):
    verification_status: str
    profile_completion_percent: int
    buyer_profile_exists: bool
    pending_orders_count: int
    active_contracts_count: int
    completed_orders_count: int
    total_spend: Decimal
    demands_count: int
    in_transit_shipments: int
    marketplace_listings_count: int
    sourcing_spotlight: list[RecommendedListing]
    trust_score: Decimal
    trust_band: str