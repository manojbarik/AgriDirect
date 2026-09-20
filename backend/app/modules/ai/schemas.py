from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PricePredictionRequest(BaseModel):
    crop_name: str = Field(min_length=2, max_length=120, examples=["Tomato"])
    variety: str | None = Field(default=None, max_length=120, examples=["Hybrid"])
    category: str | None = Field(default=None, max_length=100, examples=["Vegetable"])
    state: str | None = Field(default=None, max_length=100, examples=["Maharashtra"])
    district: str | None = Field(default=None, max_length=100, examples=["Nashik"])
    mandi_name: str | None = Field(default=None, max_length=120, examples=["Nashik APMC"])
    season: str | None = Field(default=None, max_length=80, examples=["Kharif"])
    month: int | None = Field(default=None, ge=1, le=12, examples=[9])
    quantity_kg: Decimal | None = Field(default=Decimal("100.00"), gt=0)
    grade: str | None = Field(default=None, max_length=80, examples=["Grade A"])
    demand_index: Decimal | None = Field(default=Decimal("1.00"), ge=0.1, le=5.0)
    historical_avg_price: Decimal | None = Field(default=None, ge=0)


class PricePredictionResponse(BaseModel):
    crop_name: str
    predicted_price: Decimal
    currency: str = "INR"
    unit: str = "kg"
    price_range_min: Decimal
    price_range_max: Decimal
    confidence_score: float
    model_version: str
    best_model_name: str
    is_synthetic: bool
    disclaimer: str


class PublicPricePreview(PricePredictionResponse):
    estimated_at: datetime


class MatchFarmersRequest(BaseModel):
    """Buyer's crop requirements used to find matching farmers / listings."""

    crop_name: str = Field(min_length=2, max_length=120, examples=["Tomato"])
    variety: str | None = Field(default=None, max_length=120, examples=["Hybrid"])
    category: str | None = Field(default=None, max_length=100, examples=["Vegetable"])
    quantity_required: Decimal = Field(gt=0, examples=["100"])
    unit: str = "kg"
    target_price: Decimal | None = Field(default=None, ge=0, examples=["25"])
    target_min_price: Decimal | None = Field(default=None, ge=0, examples=["20"])
    target_max_price: Decimal | None = Field(default=None, ge=0, examples=["30"])
    state: str | None = Field(default=None, max_length=100, examples=["Maharashtra"])
    district: str | None = Field(default=None, max_length=100, examples=["Pune"])
    latitude: Decimal | None = Field(default=None, examples=["18.520"])
    longitude: Decimal | None = Field(default=None, examples=["73.856"])
    required_by: date = Field(examples=["2026-10-05"])
    quality_requirements: str | None = Field(
        default=None, examples=["Fresh produce, Grade A, good size"]
    )


class MatchBuyersRequest(BaseModel):
    """Farmer's produce used to find matching buyers / open demands."""

    crop_name: str = Field(min_length=2, max_length=120, examples=["Tomato"])
    variety: str | None = Field(default=None, max_length=120, examples=["Hybrid"])
    category: str | None = Field(default=None, max_length=100, examples=["Vegetable"])
    available_quantity: Decimal = Field(gt=0, examples=["500"])
    unit: str = "kg"
    expected_price: Decimal | None = Field(default=None, ge=0, examples=["25"])
    state: str | None = Field(default=None, max_length=100, examples=["Maharashtra"])
    district: str | None = Field(default=None, max_length=100, examples=["Nashik"])
    latitude: Decimal | None = Field(default=None, examples=["19.998"])
    longitude: Decimal | None = Field(default=None, examples=["73.789"])
    available_from: date | None = Field(default=None, examples=["2026-09-20"])
    available_until: date | None = Field(default=None, examples=["2026-10-10"])
    grade: str | None = Field(default=None, max_length=80, examples=["Grade A"])


class MatchFactorOutput(BaseModel):
    key: str
    label: str
    score: Decimal
    passed: bool
    detail: str


class MatchResultItem(BaseModel):
    entity_id: str
    counterparty_id: str
    name: str
    crop_name: str
    variety: str | None
    grade: str | None
    title: str | None
    unit: str
    quantity: Decimal
    price: Decimal | None
    location: str | None
    availability_text: str | None
    trust_score: Decimal | None
    trust_band: str | None
    match_score: Decimal
    reasons: list[str]
    factors: list[MatchFactorOutput]


class MatchResponse(BaseModel):
    model_version: str
    algorithm: str
    query_summary: str
    matches: list[MatchResultItem]
    disclaimer: str


class DemandPredictionRequest(BaseModel):
    crop_name: str = Field(min_length=2, max_length=120, examples=["Tomato"])
    variety: str | None = Field(default=None, max_length=120, examples=["Hybrid"])
    category: str | None = Field(default=None, max_length=100, examples=["Vegetable"])
    state: str | None = Field(default=None, max_length=100, examples=["Maharashtra"])
    district: str | None = Field(default=None, max_length=100, examples=["Nashik"])
    season: str | None = Field(default=None, max_length=80, examples=["Kharif"])
    month: int = Field(default=9, ge=1, le=12, examples=[9])
    buyer_type: str | None = Field(default=None, max_length=60, examples=["RETAILER"])
    price: Decimal | None = Field(default=None, ge=0, examples=["25"])
    quantity_sold: Decimal | None = Field(default=None, ge=0, examples=["1200"])
    historical_demand: Decimal | None = Field(default=None, ge=0, examples=["1500"])


class DemandPredictionResponse(BaseModel):
    crop_name: str
    state: str | None
    month: int
    predicted_demand: Decimal
    unit: str = "kg"
    forecast_period: str = "month"
    predicted_demand_lower: Decimal
    predicted_demand_upper: Decimal
    confidence_score: float
    model_version: str
    best_model_name: str
    is_synthetic: bool
    recommended_quantity: Decimal
    historical_demand: Decimal | None
    disclaimer: str
