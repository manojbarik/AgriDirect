"""Pydantic schemas for livestock marketplace."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

LivestockCategory = Literal["CATTLE", "BUFFALO", "GOAT", "SHEEP", "POULTRY", "OTHER"]
HealthStatus = Literal["HEALTHY", "NEEDS_CHECK", "UNDER_TREATMENT"]
AvailabilityStatus = Literal["AVAILABLE", "SOLD", "RESERVED"]


class LivestockCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    category: LivestockCategory = "OTHER"
    breed: str = Field(..., min_length=2, max_length=100)
    age_months: int | None = Field(default=None, ge=0)
    health_status: HealthStatus = "HEALTHY"
    price: Decimal = Field(..., gt=0)
    location: str = Field(..., min_length=2, max_length=200)
    quantity: int = Field(default=1, ge=1)
    description: str | None = None
    contact_phone: str | None = Field(default=None, max_length=20)
    image_url: str | None = Field(default=None, max_length=500)


class LivestockUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    category: LivestockCategory | None = None
    breed: str | None = Field(default=None, min_length=2, max_length=100)
    age_months: int | None = Field(default=None, ge=0)
    health_status: HealthStatus | None = None
    price: Decimal | None = Field(default=None, gt=0)
    location: str | None = Field(default=None, min_length=2, max_length=200)
    quantity: int | None = Field(default=None, ge=1)
    description: str | None = None
    availability_status: AvailabilityStatus | None = None
    contact_phone: str | None = Field(default=None, max_length=20)
    image_url: str | None = Field(default=None, max_length=500)


class LivestockResponse(BaseModel):
    id: UUID
    seller_id: UUID
    title: str
    category: str
    breed: str
    age_months: int | None
    health_status: str
    price: Decimal
    location: str
    quantity: int
    description: str | None
    availability_status: str
    contact_phone: str | None
    image_url: str | None
    created_at: datetime
    updated_at: datetime

    seller_name: str | None = None
    seller_phone: str | None = None

    model_config = ConfigDict(from_attributes=True)
