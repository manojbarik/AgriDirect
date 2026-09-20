"""Phase 12 - Payment schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

ADVANCE_OPERATION = "ADVANCE"
BALANCE_OPERATION = "BALANCE"
PAYMENT_OPERATIONS = (ADVANCE_OPERATION, BALANCE_OPERATION)


class PaymentIntentCreate(BaseModel):
    order_id: UUID
    operation: str = Field(ADVANCE_OPERATION, pattern="^(ADVANCE|BALANCE)$")
    idempotency_key: str | None = Field(default=None, max_length=255)


class PaymentResponse(BaseModel):
    id: str
    order_id: str
    payer_id: str
    operation: str
    amount: Decimal
    currency: str
    status: str
    provider: str | None
    provider_reference: str | None
    provider_event_id: str | None
    idempotency_key: str
    failure_code: str | None
    checkout_url: str | None
    refunded_amount: Decimal
    processed_at: datetime | None
    created_at: datetime


class RefundCreate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0)
    reason: str | None = Field(default=None, max_length=255)
    dispute_id: UUID | None = None


class RefundResponse(BaseModel):
    id: str
    payment_id: str
    amount: Decimal
    currency: str
    status: str
    provider_reference: str | None
    reason: str | None
    created_at: datetime


class PayoutResponse(BaseModel):
    id: str
    amount: Decimal
    currency: str
    status: str
    provider_reference: str | None
    created_at: datetime


class SettlementResponse(BaseModel):
    id: str
    order_id: str
    gross_amount: Decimal
    fee_amount: Decimal
    net_amount: Decimal
    currency: str
    status: str
    eligible_at: datetime | None
    released_at: datetime | None
    payouts: list[PayoutResponse]


class WebhookEvent(BaseModel):
    event: str = Field(pattern=r"^[a-z_.]+$", max_length=80)
    reference: str = Field(max_length=255)
    event_id: str = Field(max_length=255)
    status: str = Field(default="SETTLED", max_length=30)
    amount: Decimal | None = None


class WebhookResponse(BaseModel):
    ok: bool
    event_id: str
    duplicate: bool = False