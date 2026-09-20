from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ContractCreate(BaseModel):
    listing_id: UUID
    quantity_kg: Decimal = Field(gt=0, examples=["500"])
    agreed_price_per_kg: Decimal = Field(ge=0, examples=["22.00"])
    currency: str = "INR"
    payment_terms: str = "20% advance, balance on delivery confirmation"
    delivery_deadline: datetime | None = None
    terms_text: str | None = Field(default=None, max_length=5000)


class ContractCounter(BaseModel):
    quantity_kg: Decimal = Field(gt=0, examples=["450"])
    agreed_price_per_kg: Decimal = Field(ge=0, examples=["21.00"])
    payment_terms: str | None = Field(default=None, max_length=1000)
    delivery_deadline: datetime | None = None
    terms_text: str | None = Field(default=None, max_length=5000)
    expires_at: datetime


class ContractResponse(BaseModel):
    id: UUID
    contract_number: str
    listing_id: UUID | None
    farmer_id: UUID
    buyer_id: UUID
    crop_id: UUID | None
    quantity_kg: Decimal
    agreed_price_per_kg: Decimal
    total_amount: Decimal
    currency: str
    payment_terms: str
    delivery_deadline: datetime | None
    status: str
    expires_at: datetime | None
    terms_text: str | None
    accepted_at: datetime | None
    completed_at: datetime | None
    order_id: UUID | None
    created_at: datetime
    updated_at: datetime