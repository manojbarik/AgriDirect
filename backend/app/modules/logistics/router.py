import asyncio
import json
from typing import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.models.logistics import Shipment
from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles
from app.modules.logistics import service
from app.modules.logistics.schemas import (
    AssignShipmentPayload,
    AwaitingOrderOut,
    LogisticsMetricsOut,
    ShipmentSummary,
    TrackingEventOut,
    TripDetailResponse,
    UpdateLocationPayload,
    UpdateStatusPayload,
)

router = APIRouter(prefix="/logistics", tags=["logistics"])

LogisticsDependency = require_roles("LOGISTICS")
AnyAuthenticated = require_roles("LOGISTICS", "BUYER", "CONSUMER", "FARMER", "BULK_BUYER", "ADMIN")
OperatorDependency = require_roles("LOGISTICS", "ADMIN")
LogisticsOnly = require_roles("LOGISTICS", "ADMIN")
PartyDependency = require_roles("BUYER", "CONSUMER", "FARMER", "BULK_BUYER", "ADMIN")

LIVE_LEG_STEPS = 20
LIVE_STEP_DELAY_SECONDS = 0.4


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _build_ticks(positions: list[dict]) -> list[dict]:
    if len(positions) < 2:
        return []
    ticks: list[dict] = []
    for i in range(len(positions) - 1):
        a, b = positions[i], positions[i + 1]
        for step in range(1, LIVE_LEG_STEPS + 1):
            frac = step / LIVE_LEG_STEPS
            ticks.append(
                {
                    "latitude": a["latitude"] + (b["latitude"] - a["latitude"]) * frac,
                    "longitude": a["longitude"] + (b["longitude"] - a["longitude"]) * frac,
                    "from_label": a["label"],
                    "to_label": b["label"],
                    "next_label": positions[i + 2]["label"]
                    if i + 2 < len(positions)
                    else b["label"],
                }
            )
    return ticks


async def _live_generator(
    shipment: Shipment, positions: list[dict], detail: TripDetailResponse
) -> AsyncIterator[str]:
    if shipment.status not in ("IN_TRANSIT", "OUT_FOR_DELIVERY", "NEAR_DESTINATION"):
        yield _sse({"type": "snapshot", **detail.model_dump(mode="json")})
        yield _sse({"type": "end"})
        return
    ticks = _build_ticks(positions)
    total = len(ticks)
    if total == 0:
        yield _sse({"type": "snapshot", **detail.model_dump(mode="json")})
        yield _sse({"type": "end"})
        return
    base_eta = detail.eta_minutes or 90
    for index, tick in enumerate(ticks):
        progress = int(round(((index + 1) / total) * 100))
        yield _sse(
            {
                "type": "position",
                "shipment_id": str(detail.id),
                "order_number": detail.order_number,
                "status": detail.status,
                "origin_label": detail.origin_label,
                "destination_label": detail.destination_label,
                "latitude": tick["latitude"],
                "longitude": tick["longitude"],
                "progress_percent": progress,
                "current_label": tick["to_label"],
                "next_label": tick["next_label"],
                "eta_minutes": max(1, round(base_eta * (1 - (index + 1) / total))),
                "driver_name": detail.driver_name,
                "vehicle_label": detail.vehicle_label,
                "started_at": detail.started_at.isoformat() if detail.started_at else None,
            }
        )
        await asyncio.sleep(LIVE_STEP_DELAY_SECONDS)
    yield _sse({"type": "end"})


@router.get(
    "/metrics",
    response_model=LogisticsMetricsOut,
    summary="Get aggregated logistics dashboard KPI metrics",
)
def get_logistics_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(AnyAuthenticated),
) -> LogisticsMetricsOut:
    return service.get_logistics_metrics(db, user)


@router.get(
    "/shipments",
    response_model=list[ShipmentSummary],
    summary="List shipments assigned to the current logistics partner",
)
def list_shipments(
    status: str | None = Query(default=None, description="Filter by shipment status"),
    search: str | None = Query(default=None, description="Search by order number, driver, or route"),
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> list[ShipmentSummary]:
    return service.list_shipments(db, user, status_filter=status, search=search)


@router.post(
    "/shipments",
    response_model=TripDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a delivery shipment to an eligible order",
)
def assign_shipment(
    payload: AssignShipmentPayload,
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> TripDetailResponse:
    return service.assign_shipment(db, user, payload)


@router.get(
    "/shipments/{shipment_id}",
    response_model=TripDetailResponse,
    summary="Get full trip detail for a shipment (logistics role)",
)
def get_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> TripDetailResponse:
    return service.get_shipment(db, user, shipment_id)


@router.get(
    "/shipments/{shipment_id}/location",
    summary="Get current GPS coordinates and remaining distance",
)
def get_shipment_location(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(AnyAuthenticated),
) -> dict:
    detail = service.get_shipment(db, user, shipment_id)
    return {
        "shipment_id": detail.id,
        "order_number": detail.order_number,
        "status": detail.status,
        "current_latitude": detail.current_latitude,
        "current_longitude": detail.current_longitude,
        "distance_remaining_km": detail.distance_remaining_km,
        "eta_minutes": detail.eta_minutes,
        "is_demo_gps": detail.is_demo_gps,
        "current_location_label": detail.current_location_label,
        "next_stop_label": detail.next_stop_label,
        "last_updated": detail.updated_at,
    }


@router.get(
    "/shipments/{shipment_id}/timeline",
    response_model=list[TrackingEventOut],
    summary="Get full chronological timeline of tracking events",
)
def get_shipment_timeline(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(AnyAuthenticated),
) -> list[TrackingEventOut]:
    detail = service.get_shipment(db, user, shipment_id)
    return detail.events


@router.patch(
    "/shipments/{shipment_id}/status",
    response_model=TripDetailResponse,
    summary="Update shipment status pipeline",
)
def update_shipment_status(
    shipment_id: UUID,
    payload: UpdateStatusPayload,
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> TripDetailResponse:
    return service.update_shipment_status(
        db,
        user,
        shipment_id,
        new_status=payload.status,
        note=payload.note,
        location_label=payload.location_label,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )


@router.patch(
    "/shipments/{shipment_id}/location",
    response_model=TripDetailResponse,
    summary="Update live GPS coordinates",
)
def update_shipment_location(
    shipment_id: UUID,
    payload: UpdateLocationPayload,
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> TripDetailResponse:
    return service.update_shipment_location(
        db,
        user,
        shipment_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_label=payload.location_label,
        is_demo_gps=payload.is_demo_gps,
    )


@router.post(
    "/shipments/{shipment_id}/advance-demo",
    response_model=TripDetailResponse,
    summary="Advance simulated Demo GPS coordinates along the route",
)
def advance_demo_gps(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(AnyAuthenticated),
) -> TripDetailResponse:
    return service.advance_demo_gps(db, user, shipment_id)


@router.post(
    "/shipments/{shipment_id}/start",
    response_model=TripDetailResponse,
    summary="Start the trip: ASSIGNED -> IN_TRANSIT",
)
def start_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> TripDetailResponse:
    return service.start_shipment(db, user, shipment_id)


@router.post(
    "/shipments/{shipment_id}/advance",
    response_model=TripDetailResponse,
    summary="Advance the vehicle one step along the route",
)
def advance_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> TripDetailResponse:
    return service.advance_shipment(db, user, shipment_id)


@router.post(
    "/shipments/{shipment_id}/deliver",
    response_model=TripDetailResponse,
    summary="Mark the shipment delivered and complete the order delivery",
)
def deliver_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> TripDetailResponse:
    return service.deliver_shipment(db, user, shipment_id)


@router.get(
    "/orders/awaiting",
    response_model=list[AwaitingOrderOut],
    summary="List eligible orders that have not been assigned a shipment yet",
)
def list_awaiting_orders(
    db: Session = Depends(get_db),
    user: User = Depends(OperatorDependency),
) -> list[AwaitingOrderOut]:
    return service.list_awaiting_orders(db, user)


def _stream_live(shipment: Shipment) -> StreamingResponse:
    positions, detail = service.get_live_plan(shipment)
    return StreamingResponse(
        _live_generator(shipment, positions, detail),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/shipments/{shipment_id}/live",
    summary="SSE live GPS stream for a shipment",
)
def live_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(AnyAuthenticated),
) -> StreamingResponse:
    shipment = service.get_accessible_shipment(db, user, shipment_id)
    return _stream_live(shipment)


@router.get(
    "/orders/{order_id}/tracking/live",
    summary="SSE live GPS stream for an order",
)
def live_order_tracking(
    order_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(PartyDependency),
) -> StreamingResponse:
    shipment = service.get_order_shipment(db, user, order_id)
    return _stream_live(shipment)


@router.get(
    "/orders/{order_id}/tracking",
    response_model=TripDetailResponse,
    summary="Live tracking feed for an order",
)
def get_order_tracking(
    order_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(PartyDependency),
) -> TripDetailResponse:
    return service.get_order_tracking(db, user, order_id)