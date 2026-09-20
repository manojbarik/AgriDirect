from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TrackingEventOut(BaseModel):
    id: UUID
    sequence: int
    event_type: str
    label: str
    description: str | None
    latitude: float | None
    longitude: float | None
    occurred_at: datetime
    updated_by: str | None = None


class ShipmentSummary(BaseModel):
    id: UUID
    order_id: UUID
    order_number: str
    status: str
    origin_label: str
    destination_label: str
    driver_name: str | None
    vehicle_label: str | None
    current_stop_index: int
    total_stops: int
    eta_minutes: int | None
    started_at: datetime | None
    delivered_at: datetime | None
    updated_at: datetime

    pickup_location: str | None = None
    pickup_latitude: float | None = None
    pickup_longitude: float | None = None
    destination_location: str | None = None
    destination_latitude: float | None = None
    destination_longitude: float | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None
    distance_remaining_km: float | None = None
    is_demo_gps: bool = False

    logistics_partner_name: str | None = None
    farmer_name: str | None = None
    farmer_contact: str | None = None
    buyer_name: str | None = None
    order_items_summary: str | None = None
    order_total: str | None = None
    waypoints: list[dict] = Field(default_factory=list)


class TripDetailResponse(ShipmentSummary):
    events: list[TrackingEventOut]
    current_location_label: str
    next_stop_label: str | None
    progress_percent: int


class AssignShipmentPayload(BaseModel):
    order_id: UUID = Field(description="Order that is ready to be transported")
    driver_name: str | None = Field(default=None, max_length=120)
    vehicle_label: str | None = Field(default=None, max_length=60)


class UpdateStatusPayload(BaseModel):
    status: str = Field(description="New shipment status")
    note: str | None = Field(default=None, description="Optional note or event description")
    location_label: str | None = Field(default=None, description="Optional location checkpoint label")
    latitude: float | None = None
    longitude: float | None = None


class UpdateLocationPayload(BaseModel):
    latitude: float
    longitude: float
    location_label: str | None = None
    is_demo_gps: bool = False


class LogisticsMetricsOut(BaseModel):
    active_shipments: int
    in_transit: int
    delivering_today: int
    delivered: int
    delayed: int


class AwaitingOrderOut(BaseModel):
    id: UUID
    order_number: str
    status: str
    farmer_name: str
    buyer_name: str
    origin_label: str
    destination_label: str
    total_amount: str