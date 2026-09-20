"""Phase 10 - Storage intelligence schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from pydantic import BaseModel, Field


class StorageOption(BaseModel):
    id: str
    name: str
    storage_type: str = Field(examples=["COLD_STORAGE"])
    capacity_tonnes: Decimal
    location: str
    state: str | None = None
    district: str | None = None
    price_per_kg_per_day: Decimal
    min_duration_days: int
    max_duration_days: int
    services: list[str] = Field(default_factory=list)
    is_demo: bool = True


class StorageOptionsResponse(BaseModel):
    options: list[StorageOption]
    region: str | None = None
    is_demo: bool = True
    disclaimer: str


class StorageRecommendationRequest(BaseModel):
    crop_name: str = Field(min_length=2, max_length=120, examples=["Tomato"])
    variety: str | None = Field(default=None, max_length=120, examples=["Hybrid"])
    state: str | None = Field(default=None, max_length=100, examples=["Odisha"])
    district: str | None = Field(default=None, max_length=100, examples=["Bhubaneswar"])
    quantity_kg: Decimal = Field(gt=0, examples=["1000"])
    current_price_per_kg: Decimal = Field(gt=0, examples=["21"])
    predicted_price_per_kg: Decimal | None = Field(default=None, ge=0, examples=["26"])
    storage_days: int = Field(default=15, ge=1, le=365, examples=[15])
    storage_cost_per_kg_per_day: Decimal | None = Field(default=None, ge=0, examples=["0.04"])
    expected_loss_rate_pct: Decimal = Field(default=Decimal("2.5"), ge=0, le=100, examples=["2.5"])
    transaction_cost_pct: Decimal = Field(default=Decimal("1.5"), ge=0, le=100, examples=["1.5"])


class SellNowOutcome(BaseModel):
    estimated_revenue: Decimal
    transaction_cost: Decimal
    net_income: Decimal


class StoreThenSellOutcome(BaseModel):
    estimated_revenue: Decimal
    storage_cost: Decimal
    expected_loss_kg: Decimal
    lost_value: Decimal
    transaction_cost: Decimal
    net_income: Decimal


class StorageRecommendationResponse(BaseModel):
    crop_name: str
    quantity_kg: Decimal
    current_price_per_kg: Decimal
    predicted_price_per_kg: Decimal
    storage_days: int
    sell_now: SellNowOutcome
    store_then_sell: StoreThenSellOutcome
    recommendation_rank: str = Field(examples=["STORE_THEN_SELL"])
    recommendation_label: str
    net_benefit_of_storing: Decimal
    breakeven_storage_days: int | None
    confidence_score: float
    reasoning: list[str]
    model_version: str = "storage-v1"
    is_synthetic: bool = True
    estimated_at: datetime
    disclaimer: str