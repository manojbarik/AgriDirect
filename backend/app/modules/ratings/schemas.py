"""Pydantic schemas for the two-way ratings and reviews module."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class RatingCreate(BaseModel):
    order_id: UUID
    rating: int = Field(ge=1, le=5, examples=[5])
    comment: str | None = Field(default=None, max_length=2000)


class RatingOut(BaseModel):
    id: UUID
    order_id: UUID
    rating: int
    comment: str | None
    reviewer_id: UUID
    reviewer_name: str
    reviewer_role: str
    reviewee_id: UUID
    reviewee_name: str
    created_at: datetime


class OrderRatingResponse(BaseModel):
    order_id: UUID
    status: str
    can_rate: bool
    my_rating: RatingOut | None
    counterpart_rating: RatingOut | None


class UserRatingSummary(BaseModel):
    user_id: UUID
    average_rating: Decimal | None
    rating_count: int
    history: list[RatingOut] = Field(default_factory=list)