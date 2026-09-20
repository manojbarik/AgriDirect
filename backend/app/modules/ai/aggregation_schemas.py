from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class AggregationRequest(BaseModel):
    crop_name: str = Field(min_length=1, max_length=120)
    quantity_required: Decimal = Field(gt=0)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    max_price: Decimal | None = Field(default=None, gt=0)


class AggregationGroup(BaseModel):
    listing_id: str
    farmer_name: str | None
    state: str | None
    district: str | None
    quantity_kg: Decimal
    price_per_kg: Decimal
    value: Decimal


class AggregationResponse(BaseModel):
    groups: list[AggregationGroup]
    total_quantity: Decimal
    total_value: Decimal
    quantity_shortfall: Decimal
    transportation_savings_estimate: str
    aggregated_share_split: dict[str, dict[str, Any]]
    estimated_logistics_cost: Decimal
    estimated_savings: Decimal


class WastageRiskRequest(BaseModel):
    crop: str = Field(min_length=1, max_length=120)
    harvest_date: date
    storage_condition: str = Field(default="ambient", max_length=80)
    transport_duration_hours: float = Field(default=0, ge=0, le=168)
    delivery_eta_hours: float = Field(default=0, ge=0, le=168)
    temperature_c: float = Field(default=30, ge=-20, le=60)
    humidity: float = Field(default=60, ge=0, le=100)


class WastageRiskResponse(BaseModel):
    risk: str
    perishability_score: int
    reasons: list[str]
    recommendation: str


class RouteStop(BaseModel):
    name: str
    state: str | None = None
    district: str | None = None


class RouteOptimizeRequest(BaseModel):
    pickups: list[RouteStop] = Field(min_length=1)
    destination: RouteStop
    vehicle_capacity_kg: Decimal = Field(gt=0)
    order_quantities_kg: list[Decimal] | None = None


class OptimizedSequenceStep(BaseModel):
    name: str
    distance_km: Decimal
    eta_hours: Decimal


class RouteOptimizeResponse(BaseModel):
    optimized_sequence: list[OptimizedSequenceStep]
    total_distance_km: Decimal
    total_cost_inr: Decimal
    eta_hours: Decimal
    vehicle_utilization: Decimal
    pickups_sequence: list[str]
    delivery_order: list[str]
    rationale: str
