from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    listing_id: UUID
    quantity: Decimal = Field(gt=0, examples=["100"])
    unit: str = "kg"
    price: Decimal = Field(ge=0, examples=["25.00"])
    currency: str = "INR"
    delivery_date: date = Field(examples=["2026-10-05"])
    note: str | None = Field(default=None, max_length=1000)
    delivery_address_summary: str | None = Field(default=None, max_length=1000)


class CounterOfferCreate(BaseModel):
    quantity: Decimal = Field(gt=0, examples=["120"])
    unit: str = "kg"
    price: Decimal = Field(ge=0, examples=["22.00"])
    delivery_date: date = Field(examples=["2026-10-08"])
    note: str | None = Field(default=None, max_length=1000)


class OrderStatusUpdate(BaseModel):
    status: str = Field(min_length=3, max_length=30, examples=["CONFIRMED"])


class OrderNegotiationMessageResponse(BaseModel):
    id: str
    from_role: str
    action: str
    quantity: Decimal
    unit: str
    price: Decimal
    delivery_date: date | None
    note: str | None
    created_at: datetime


class OrderStatusEventResponse(BaseModel):
    id: str
    from_status: str | None
    to_status: str
    changed_by_role: str
    note: str | None
    created_at: datetime


class OrderSummaryResponse(BaseModel):
    id: str
    public_order_number: str
    status: str
    order_type: str = "B2B"
    my_role: str
    next_allowed_actions: list[str]
    crop_name: str | None
    crop_variety: str | None
    listing_title: str | None
    farmer_name: str
    buyer_name: str
    unit: str
    requested_quantity: Decimal
    requested_price: Decimal
    pending_offer_action: str | None
    pending_offer_by_role: str | None
    agreed_quantity: Decimal | None
    agreed_price: Decimal | None
    total_amount: Decimal
    created_at: datetime


class OrderDetailResponse(OrderSummaryResponse):
    listing_id: str | None
    crop_id: str | None
    buyer_id: str | None
    consumer_id: str | None
    farmer_id: str
    currency: str
    requested_delivery_date: date | None
    pending_offer_quantity: Decimal | None
    pending_offer_unit: str | None
    pending_offer_price: Decimal | None
    pending_offer_delivery_date: date | None
    agreed_unit: str | None
    agreed_delivery_date: date | None
    delivery_address_summary: str | None
    negotiation_messages: list[OrderNegotiationMessageResponse]
    status_events: list[OrderStatusEventResponse]
    delivered_at: datetime | None
    quality_confirmation_deadline: datetime | None
    receipt_confirmed_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    disputed_at: datetime | None
    refunded_at: datetime | None
    replaced_at: datetime | None
    pre_dispute_status: str | None
    updated_at: datetime