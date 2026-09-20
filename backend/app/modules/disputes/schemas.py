from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class DisputeCreate(BaseModel):
    order_id: UUID
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=4000)
    requested_resolution: str | None = Field(default=None, max_length=80)


class DisputeEventResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str | None
    from_status: str | None
    to_status: str
    changed_by_id: str | None
    changed_by_role: str
    reason: str | None
    created_at: datetime


class DisputeResponse(BaseModel):
    id: str
    order_id: str
    order_public_number: str
    opened_by_id: str
    opened_by_name: str
    farmer_name: str
    crop_name: str
    total_amount: str
    currency: str
    category: str
    description: str
    requested_resolution: str | None
    resolution: str | None
    status: str
    deadline: datetime | None
    resolved_at: datetime | None
    replacement_status: str | None
    replacement_id: str | None
    events: list[DisputeEventResponse]
    created_at: datetime
    updated_at: datetime


Decision = Literal["REFUND", "REPLACEMENT", "REJECT"]


class DisputeReviewCreate(BaseModel):
    decision: Decision
    reason: str = Field(min_length=5, max_length=2000)


class DisputeCompleteCreate(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)