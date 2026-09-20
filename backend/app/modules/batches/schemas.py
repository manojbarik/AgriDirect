"""Phase 13 - Batch and Quality schemas."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BatchPrepareCreate(BaseModel):
    prepared_quantity: Decimal | None = Field(default=None, gt=0)
    harvest_date: date | None = None
    quality_grade: str | None = Field(default=None, max_length=30)
    preparation_notes: str | None = Field(default=None, max_length=2000)
    packaging_details: str | None = Field(default=None, max_length=2000)
    photo_references: list[str] = Field(default_factory=list)


class QualityCheckCreate(BaseModel):
    result: str = Field(pattern="^(PASS|PROBLEM)$")
    quality_grade: str | None = Field(default=None, max_length=30)
    quantity_received: Decimal | None = Field(default=None, ge=0)
    damaged_quantity: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)
    evidence_reference: str | None = Field(default=None, max_length=500)
    checked_at: datetime | None = None


class QualityCheckResponse(BaseModel):
    id: str
    batch_id: str
    inspector_id: str | None
    result: str
    quality_grade: str | None
    quantity_received: Decimal | None
    damaged_quantity: Decimal | None
    notes: str | None
    evidence_reference: str | None
    checked_at: datetime
    created_at: datetime


class BatchSummaryResponse(BaseModel):
    id: str
    order_id: str
    listing_id: str | None
    crop_id: str | None
    farmer_id: str | None
    crop_name: str | None
    crop_variety: str | None
    batch_code: str
    qr_identifier: str | None
    prepared_quantity: Decimal
    preparation_notes: str | None
    packaging_details: str | None
    harvest_date: date | None
    quality_grade: str | None
    photo_references: list[str]
    prepared_at: datetime | None
    status: str
    preparation_status: str
    pickup_status: str
    delivery_status: str
    created_at: datetime
    updated_at: datetime


class BatchDetailResponse(BatchSummaryResponse):
    quality_checks: list[QualityCheckResponse]
    next_allowed_actions: list[str]