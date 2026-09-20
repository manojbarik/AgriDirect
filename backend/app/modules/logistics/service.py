from __future__ import annotations

import hashlib
import math
import random
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.db.models.logistics import SHIPMENT_STATUSES, Shipment, TrackingEvent
from app.db.models.marketplace import Order
from app.db.models.people import BuyerProfile, ConsumerProfile, FarmerProfile, User
from app.modules.logistics.schemas import (
    AssignShipmentPayload,
    AwaitingOrderOut,
    LogisticsMetricsOut,
    ShipmentSummary,
    TrackingEventOut,
    TripDetailResponse,
)
from app.modules.orders import service as orders_service

ELIGIBLE_ASSIGN_STATUSES = (
    "ACCEPTED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "QUALITY_CHECK",
)

FALLBACK_ORIGIN = ("Farm pickup point", 20.2961, 85.8245)
FALLBACK_DESTINATION = ("Buyer delivery point", 20.5937, 78.9629)

CHECKPOINT_POOL = (
    "NH-16 Highway Toll Plaza",
    "Collectorate Junction Bypass",
    "Ring Road Freight Plaza",
    "Bhubaneswar-Cuttack Expressway Hub",
    "Wholesale Mandi Crossing",
    "Agri Terminal Gate 4",
    "Mandir Chowk Transit Point",
    "Grain Market Square",
    "Interstate Cargo Interchange",
    "Krishi Link Logistics Center",
)


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def _seed_for(value: object) -> int:
    return int(hashlib.md5(str(value).encode("utf-8")).hexdigest(), 16)


def _as_float(value: object) -> float | None:
    if value is None:
        return None
    return float(value)


def _origin_for(order: Order) -> tuple[str, float, float]:
    farm = order.farmer.farms[0] if (order.farmer and order.farmer.farms) else None
    label = "Farm pickup point"
    if farm is not None:
        pieces = [p for p in (farm.locality, farm.name, farm.district) if p]
        if pieces:
            label = pieces[0] if len(pieces) == 1 else f"{pieces[0]} • {pieces[1]}"
    lat, lng = FALLBACK_ORIGIN[1], FALLBACK_ORIGIN[2]
    if farm is not None and farm.latitude is not None and farm.longitude is not None:
        lat, lng = float(farm.latitude), float(farm.longitude)
    return label, lat, lng


def _purchaser_name(order: Order) -> str:
    if order.order_type == "B2C":
        consumer = order.consumer
        if consumer is not None:
            return consumer.user.email or consumer.user.phone_e164 or "A consumer"
        return "A consumer"
    buyer = order.buyer
    return buyer.full_name if buyer and buyer.full_name else "A buyer"


def _destination_for(order: Order) -> tuple[str, float, float]:
    lat, lng = FALLBACK_DESTINATION[1], FALLBACK_DESTINATION[2]
    if order.order_type == "B2C":
        consumer = order.consumer
        label = "Consumer delivery point"
        if order.delivery_address_snapshot:
            label = order.delivery_address_snapshot.splitlines()[0][:60]
        elif consumer is not None and (consumer.district or consumer.state):
            label = consumer.district or consumer.state
        return label, lat, lng
    buyer = order.buyer
    label = "Buyer delivery point"
    if buyer is not None and (buyer.business_name or buyer.full_name or buyer.district):
        pieces = [p for p in (buyer.business_name, buyer.full_name, buyer.district) if p]
        label = pieces[0]
        if len(pieces) > 2:
            label = f"{pieces[0]} • {pieces[1]}"
    if buyer is not None and buyer.latitude is not None and buyer.longitude is not None:
        lat, lng = float(buyer.latitude), float(buyer.longitude)
    return label, lat, lng


def _make_waypoints(order: Order) -> list[dict]:
    origin_label, lat, lng = _origin_for(order)
    dest_label, dlat, dlng = _destination_for(order)
    return [
        {"label": origin_label, "latitude": lat, "longitude": lng},
        {"label": dest_label, "latitude": dlat, "longitude": dlng},
    ]


def _make_checkpoint(start: dict, end: dict, gap_index: int, second: bool) -> dict:
    rng = random.Random(_seed_for(f"{start['label']}-{end['label']}-{gap_index}-{second}"))
    frac = 0.35 if not second else 0.72
    origin_lat = start.get("latitude") or FALLBACK_ORIGIN[1]
    origin_lng = start.get("longitude") or FALLBACK_ORIGIN[2]
    end_lat = end.get("latitude") or FALLBACK_DESTINATION[1]
    end_lng = end.get("longitude") or FALLBACK_DESTINATION[2]
    return {
        "label": CHECKPOINT_POOL[rng.randrange(len(CHECKPOINT_POOL))],
        "latitude": origin_lat + (end_lat - origin_lat) * frac,
        "longitude": origin_lng + (end_lng - origin_lng) * frac,
        "description": f"En route from {start['label']} to {end['label']}",
    }


def _build_positions(waypoints: list[dict]) -> list[dict]:
    if not waypoints:
        return []
    positions: list[dict] = [waypoints[0]]
    for i in range(len(waypoints) - 1):
        a, b = waypoints[i], waypoints[i + 1]
        positions.append(_make_checkpoint(a, b, i, False))
        positions.append(_make_checkpoint(a, b, i, True))
        positions.append(b)
    return positions


def _base_eta(seed: int) -> int:
    return 45 + seed % 60


def _next_eta(current: int, seed: int) -> int:
    return max(5, current - (8 + seed % 10))


def _get_order_or_404(db: Session, order_id: UUID) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def get_accessible_shipment(db: Session, user: User, shipment_id: UUID) -> Shipment:
    shipment = db.get(Shipment, shipment_id)
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    if user.role == "ADMIN":
        return shipment
    if user.role == "LOGISTICS":
        if shipment.provider_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
        return shipment
    order = shipment.order
    if user.role == "FARMER":
        if order.farmer.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
        return shipment
    if user.role in ("BUYER", "BULK_BUYER"):
        if order.order_type != "B2B" or order.buyer is None or order.buyer.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
        return shipment
    if user.role == "CONSUMER":
        if order.order_type != "B2C" or order.consumer is None or order.consumer.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
        return shipment
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this shipment")


def _own_shipment(db: Session, user: User, shipment_id: UUID) -> Shipment:
    shipment = db.get(Shipment, shipment_id)
    if shipment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found"
        )
    if user.role != "ADMIN" and shipment.provider_user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found"
        )
    return shipment


def _add_event(
    db: Session,
    shipment: Shipment,
    event_type: str,
    label: str,
    description: str | None,
    latitude: float | None,
    longitude: float | None,
    updated_by: str | None = None,
) -> None:
    event = TrackingEvent(
        shipment_id=shipment.id,
        sequence=len(shipment.events),
        event_type=event_type,
        label=label,
        description=description,
        latitude=latitude,
        longitude=longitude,
        occurred_at=datetime.now(timezone.utc),
        updated_by=updated_by,
    )
    db.add(event)
    shipment.events.append(event)


def _require_status(shipment: Shipment, *allowed: str) -> None:
    if shipment.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Shipment is not in an {', '.join(allowed)} state (currently {shipment.status})",
        )


def _order_items_summary(order: Order) -> str:
    if not order.items:
        return "Farm Harvest Lot"
    pieces = []
    for item in order.items:
        name = item.crop.name if item.crop else "Harvest"
        qty = float(item.quantity)
        unit = item.unit or "kg"
        pieces.append(f"{name} ({qty:.1f} {unit})")
    return ", ".join(pieces)


def _to_summary(shipment: Shipment) -> ShipmentSummary:
    positions = _build_positions(shipment.waypoints)
    current = min(shipment.current_stop_index, len(positions) - 1) if positions else 0
    active_pos = positions[current] if positions else None

    pickup_loc = shipment.pickup_location or (positions[0]["label"] if positions else "Pickup Point")
    pickup_lat = shipment.pickup_latitude or (positions[0]["latitude"] if positions else None)
    pickup_lng = shipment.pickup_longitude or (positions[0]["longitude"] if positions else None)

    dest_loc = shipment.destination_location or (positions[-1]["label"] if positions else "Destination Point")
    dest_lat = shipment.destination_latitude or (positions[-1]["latitude"] if positions else None)
    dest_lng = shipment.destination_longitude or (positions[-1]["longitude"] if positions else None)

    curr_lat = shipment.current_latitude or (active_pos["latitude"] if active_pos else pickup_lat)
    curr_lng = shipment.current_longitude or (active_pos["longitude"] if active_pos else pickup_lng)

    dist_rem = shipment.distance_remaining_km
    if dist_rem is None and curr_lat is not None and curr_lng is not None and dest_lat is not None and dest_lng is not None:
        dist_rem = _haversine_distance(curr_lat, curr_lng, dest_lat, dest_lng)
    if shipment.status == "DELIVERED":
        dist_rem = 0.0

    partner_name = "AgriDirect Logistics"
    if shipment.provider and getattr(shipment.provider, "logistics_profile", None):
        partner_name = shipment.provider.logistics_profile.company_name
    elif shipment.provider:
        partner_name = shipment.provider.email or shipment.provider.phone_e164 or "Logistics Partner"

    farmer_name = shipment.order.farmer.full_name if (shipment.order and shipment.order.farmer) else "Farmer"
    farmer_contact = (
        shipment.order.farmer.user.phone_e164
        if (shipment.order and shipment.order.farmer and shipment.order.farmer.user)
        else None
    )
    buyer_name = _purchaser_name(shipment.order) if shipment.order else "Buyer"
    items_summary = _order_items_summary(shipment.order) if shipment.order else "Agricultural Produce"
    order_val = f"{float(shipment.order.total_amount):.2f}" if shipment.order else "0.00"

    return ShipmentSummary(
        id=shipment.id,
        order_id=shipment.order_id,
        order_number=shipment.order.public_order_number if shipment.order else "ORD-000",
        status=shipment.status,
        origin_label=pickup_loc,
        destination_label=dest_loc,
        driver_name=shipment.driver_name,
        vehicle_label=shipment.vehicle_label,
        current_stop_index=current,
        total_stops=len(positions),
        eta_minutes=shipment.eta_minutes,
        started_at=shipment.started_at,
        delivered_at=shipment.delivered_at,
        updated_at=shipment.updated_at,
        pickup_location=pickup_loc,
        pickup_latitude=pickup_lat,
        pickup_longitude=pickup_lng,
        destination_location=dest_loc,
        destination_latitude=dest_lat,
        destination_longitude=dest_lng,
        current_latitude=curr_lat,
        current_longitude=curr_lng,
        distance_remaining_km=dist_rem,
        is_demo_gps=shipment.is_demo_gps or False,
        logistics_partner_name=partner_name,
        farmer_name=farmer_name,
        farmer_contact=farmer_contact,
        buyer_name=buyer_name,
        order_items_summary=items_summary,
        order_total=order_val,
        waypoints=shipment.waypoints or [],
    )


def get_own_shipment(db: Session, user: User, shipment_id: UUID) -> Shipment:
    return _own_shipment(db, user, shipment_id)


def get_live_plan(shipment: Shipment) -> tuple[list[dict], TripDetailResponse]:
    positions = _build_positions(shipment.waypoints)
    return positions, _to_detail(shipment)


def _to_detail(shipment: Shipment) -> TripDetailResponse:
    summary = _to_summary(shipment)
    positions = _build_positions(shipment.waypoints)
    current = min(shipment.current_stop_index, len(positions) - 1) if positions else 0
    events = [
        TrackingEventOut(
            id=event.id,
            sequence=event.sequence,
            event_type=event.event_type,
            label=event.label,
            description=event.description,
            latitude=event.latitude,
            longitude=event.longitude,
            occurred_at=event.occurred_at,
            updated_by=event.updated_by,
        )
        for event in shipment.events
    ]
    progress = int(round((current + 1) / len(positions) * 100)) if positions else 0
    if shipment.status == "DELIVERED":
        progress = 100

    return TripDetailResponse(
        **summary.model_dump(),
        events=events,
        current_location_label=positions[current]["label"] if positions else "",
        next_stop_label=positions[current + 1]["label"]
        if positions and current + 1 < len(positions)
        else None,
        progress_percent=progress,
    )


def assign_shipment(
    db: Session, user: User, payload: AssignShipmentPayload
) -> TripDetailResponse:
    existing = db.scalar(
        select(Shipment).where(Shipment.order_id == payload.order_id)
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This order already has an assigned shipment",
        )
    order = _get_order_or_404(db, payload.order_id)
    if order.status not in ELIGIBLE_ASSIGN_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign a shipment to an order in {order.status} state",
        )
    waypoints = _make_waypoints(order)
    positions = _build_positions(waypoints)
    origin = positions[0]
    destination = positions[-1]
    initial_distance = _haversine_distance(
        origin["latitude"], origin["longitude"], destination["latitude"], destination["longitude"]
    )

    shipment = Shipment(
        order_id=order.id,
        provider_user_id=user.id,
        driver_name=payload.driver_name,
        vehicle_label=payload.vehicle_label,
        status="ASSIGNED",
        waypoints=waypoints,
        current_stop_index=0,
        total_stops=len(positions),
        pickup_location=origin["label"],
        pickup_latitude=origin["latitude"],
        pickup_longitude=origin["longitude"],
        destination_location=destination["label"],
        destination_latitude=destination["latitude"],
        destination_longitude=destination["longitude"],
        current_latitude=origin["latitude"],
        current_longitude=origin["longitude"],
        distance_remaining_km=initial_distance,
        is_demo_gps=False,
    )
    db.add(shipment)
    db.flush()

    partner_name = (
        user.logistics_profile.company_name
        if getattr(user, "logistics_profile", None)
        else "Logistics Partner"
    )
    _add_event(
        db,
        shipment,
        "ASSIGNED",
        f"Trip assigned at {origin['label']}",
        f"Delivery partner {partner_name} will transport {order.public_order_number}.",
        origin["latitude"],
        origin["longitude"],
        updated_by=user.email or user.phone_e164 or "Logistics Dispatcher",
    )
    db.commit()
    db.refresh(shipment)
    return _to_detail(shipment)


def list_shipments(
    db: Session,
    user: User,
    status_filter: str | None = None,
    search: str | None = None,
) -> list[ShipmentSummary]:
    query = select(Shipment)
    if user.role == "LOGISTICS":
        query = query.where(Shipment.provider_user_id == user.id)
    elif user.role == "FARMER":
        query = query.join(Shipment.order).join(Order.farmer).where(FarmerProfile.user_id == user.id)
    elif user.role in ("BUYER", "BULK_BUYER"):
        query = query.join(Shipment.order).join(Order.buyer).where(BuyerProfile.user_id == user.id)
    elif user.role == "CONSUMER":
        query = query.join(Shipment.order).join(Order.consumer).where(ConsumerProfile.user_id == user.id)
    # ADMIN sees all

    if status_filter:
        query = query.where(Shipment.status == status_filter.upper())

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        # ensure order is joined
        if user.role in ("ADMIN", "LOGISTICS"):
            query = query.join(Shipment.order)
        query = query.where(
            (Order.public_order_number.ilike(search_term))
            | (Shipment.driver_name.ilike(search_term))
            | (Shipment.vehicle_label.ilike(search_term))
            | (Shipment.pickup_location.ilike(search_term))
            | (Shipment.destination_location.ilike(search_term))
        )

    shipments = db.scalars(query.order_by(Shipment.created_at.desc())).all()
    return [_to_summary(shipment) for shipment in shipments]


def get_shipment(db: Session, user: User, shipment_id: UUID) -> TripDetailResponse:
    shipment = _own_shipment(db, user, shipment_id)
    return _to_detail(shipment)


def list_awaiting_orders(db: Session, user: User) -> list[AwaitingOrderOut]:
    orders = db.scalars(
        select(Order)
        .where(Order.status.in_(list(ELIGIBLE_ASSIGN_STATUSES)))
        .where(~exists().where(Shipment.order_id == Order.id))
        .order_by(Order.created_at.desc())
    ).all()
    result: list[AwaitingOrderOut] = []
    for order in orders:
        origin = _origin_for(order)
        destination = _destination_for(order)
        result.append(
            AwaitingOrderOut(
                id=order.id,
                order_number=order.public_order_number,
                status=order.status,
                farmer_name=order.farmer.full_name,
                buyer_name=_purchaser_name(order),
                origin_label=origin[0],
                destination_label=destination[0],
                total_amount=f"{order.total_amount:.2f}",
            )
        )
    return result


def start_shipment(db: Session, user: User, shipment_id: UUID) -> TripDetailResponse:
    shipment = get_accessible_shipment(db, user, shipment_id)
    _require_status(shipment, "ASSIGNED", "PICKUP_SCHEDULED")
    positions = _build_positions(shipment.waypoints)
    seed = _seed_for(shipment.id)
    shipment.status = "IN_TRANSIT"
    shipment.started_at = datetime.now(timezone.utc)
    shipment.current_stop_index = 0
    shipment.eta_minutes = _base_eta(seed)
    origin = positions[0]
    destination = positions[-1]
    shipment.current_latitude = origin["latitude"]
    shipment.current_longitude = origin["longitude"]
    shipment.distance_remaining_km = _haversine_distance(
        origin["latitude"], origin["longitude"], destination["latitude"], destination["longitude"]
    )

    updated_by_str = user.email or user.phone_e164 or "Logistics Partner"
    _add_event(
        db,
        shipment,
        "PICKUP",
        f"Cargo picked up at {origin['label']}",
        "Goods loaded and trip started by logistics partner.",
        origin["latitude"],
        origin["longitude"],
        updated_by=updated_by_str,
    )
    _add_event(
        db,
        shipment,
        "ETA_UPDATE",
        "ETA updated",
        f"Estimated time of arrival is now ~{shipment.eta_minutes} minutes.",
        None,
        None,
        updated_by=updated_by_str,
    )
    if shipment.order.status in ("READY_FOR_PICKUP", "CONFIRMED", "PREPARING"):
        orders_service.apply_status_transition(
            db,
            shipment.order,
            "IN_TRANSIT",
            "SYSTEM",
            note="Shipment started by logistics partner",
        )
    db.commit()
    db.refresh(shipment)
    return _to_detail(shipment)


def advance_shipment(db: Session, user: User, shipment_id: UUID) -> TripDetailResponse:
    shipment = get_accessible_shipment(db, user, shipment_id)
    _require_status(shipment, "IN_TRANSIT", "NEAR_DESTINATION", "OUT_FOR_DELIVERY", "PICKED_UP")
    positions = _build_positions(shipment.waypoints)
    if shipment.current_stop_index >= len(positions) - 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Shipment has already arrived at the destination — mark it delivered",
        )
    seed = _seed_for(shipment.id)
    shipment.current_stop_index += 1
    position = positions[shipment.current_stop_index]
    shipment.current_latitude = position["latitude"]
    shipment.current_longitude = position["longitude"]

    dest_pos = positions[-1]
    shipment.distance_remaining_km = _haversine_distance(
        position["latitude"], position["longitude"], dest_pos["latitude"], dest_pos["longitude"]
    )

    if shipment.current_stop_index >= len(positions) - 2:
        shipment.status = "NEAR_DESTINATION"

    updated_by_str = user.email or user.phone_e164 or "Logistics Partner"
    _add_event(
        db,
        shipment,
        "CHECKPOINT",
        position["label"],
        position.get("description") or "Live GPS checkpoint update.",
        position["latitude"],
        position["longitude"],
        updated_by=updated_by_str,
    )
    shipment.eta_minutes = _next_eta(shipment.eta_minutes or _base_eta(seed), seed)
    _add_event(
        db,
        shipment,
        "ETA_UPDATE",
        "ETA updated",
        f"Estimated time of arrival is now ~{shipment.eta_minutes} minutes.",
        None,
        None,
        updated_by=updated_by_str,
    )
    db.commit()
    db.refresh(shipment)
    return _to_detail(shipment)


def advance_demo_gps(db: Session, user: User, shipment_id: UUID) -> TripDetailResponse:
    shipment = get_accessible_shipment(db, user, shipment_id)
    positions = _build_positions(shipment.waypoints)
    if not positions:
        raise HTTPException(status_code=400, detail="No route positions found")

    next_idx = (shipment.current_stop_index + 1) % len(positions)
    shipment.current_stop_index = next_idx
    shipment.is_demo_gps = True

    pos = positions[next_idx]
    shipment.current_latitude = pos["latitude"]
    shipment.current_longitude = pos["longitude"]

    dest_pos = positions[-1]
    shipment.distance_remaining_km = _haversine_distance(
        pos["latitude"], pos["longitude"], dest_pos["latitude"], dest_pos["longitude"]
    )

    frac_remaining = (len(positions) - 1 - next_idx) / max(1, len(positions) - 1)
    shipment.eta_minutes = max(2, round(90 * frac_remaining))

    if next_idx == 0:
        shipment.status = "PICKUP_SCHEDULED"
    elif next_idx == 1:
        shipment.status = "PICKED_UP"
    elif 1 < next_idx < len(positions) - 2:
        shipment.status = "IN_TRANSIT"
    elif next_idx == len(positions) - 2:
        shipment.status = "NEAR_DESTINATION"
    elif next_idx == len(positions) - 1:
        shipment.status = "DELIVERED"
        shipment.distance_remaining_km = 0.0
        shipment.eta_minutes = 0
        shipment.delivered_at = datetime.now(timezone.utc)

    _add_event(
        db,
        shipment,
        "CHECKPOINT",
        f"Demo GPS: {pos['label']}",
        f"Simulated GPS coordinate update ({pos['latitude']:.4f}, {pos['longitude']:.4f})",
        pos["latitude"],
        pos["longitude"],
        updated_by="Demo GPS Simulator",
    )

    db.commit()
    db.refresh(shipment)
    return _to_detail(shipment)


def update_shipment_status(
    db: Session,
    user: User,
    shipment_id: UUID,
    new_status: str,
    note: str | None = None,
    location_label: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> TripDetailResponse:
    shipment = get_accessible_shipment(db, user, shipment_id)
    new_status = new_status.upper()
    if new_status not in SHIPMENT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid shipment status: {new_status}",
        )
    shipment.status = new_status
    now = datetime.now(timezone.utc)
    if new_status in ("IN_TRANSIT", "PICKED_UP") and shipment.started_at is None:
        shipment.started_at = now
    if new_status == "DELIVERED":
        shipment.delivered_at = now
        shipment.eta_minutes = 0
        shipment.distance_remaining_km = 0.0

    positions = _build_positions(shipment.waypoints)
    active_idx = min(shipment.current_stop_index, len(positions) - 1) if positions else 0
    default_pos = positions[active_idx] if positions else None

    ev_label = location_label or (default_pos["label"] if default_pos else f"Status: {new_status}")
    ev_lat = latitude if latitude is not None else (default_pos["latitude"] if default_pos else None)
    ev_lng = longitude if longitude is not None else (default_pos["longitude"] if default_pos else None)

    if ev_lat is not None:
        shipment.current_latitude = ev_lat
    if ev_lng is not None:
        shipment.current_longitude = ev_lng

    updated_by_str = user.email or user.phone_e164 or user.role
    _add_event(
        db,
        shipment,
        new_status,
        f"{new_status.replace('_', ' ').title()}: {ev_label}",
        note or f"Shipment status transitioned to {new_status}.",
        ev_lat,
        ev_lng,
        updated_by=updated_by_str,
    )

    if new_status in ("IN_TRANSIT", "OUT_FOR_DELIVERY") and shipment.order.status in ("ACCEPTED", "CONFIRMED", "READY_FOR_PICKUP"):
        orders_service.apply_status_transition(
            db, shipment.order, "IN_TRANSIT", "SYSTEM", note=f"Shipment {new_status}"
        )
    elif new_status == "DELIVERED" and shipment.order.status == "IN_TRANSIT":
        orders_service.apply_status_transition(
            db, shipment.order, "DELIVERED", "SYSTEM", note="Shipment delivered"
        )

    db.commit()
    db.refresh(shipment)
    return _to_detail(shipment)


def update_shipment_location(
    db: Session,
    user: User,
    shipment_id: UUID,
    latitude: float,
    longitude: float,
    location_label: str | None = None,
    is_demo_gps: bool = False,
) -> TripDetailResponse:
    shipment = get_accessible_shipment(db, user, shipment_id)
    shipment.current_latitude = latitude
    shipment.current_longitude = longitude
    shipment.is_demo_gps = is_demo_gps

    if shipment.destination_latitude and shipment.destination_longitude:
        shipment.distance_remaining_km = _haversine_distance(
            latitude, longitude, shipment.destination_latitude, shipment.destination_longitude
        )

    label = location_label or f"GPS Ping ({latitude:.4f}, {longitude:.4f})"
    updated_by_str = "Demo GPS" if is_demo_gps else (user.email or user.phone_e164 or "GPS Device")
    _add_event(
        db,
        shipment,
        "CHECKPOINT",
        label,
        f"Live coordinates recorded: {latitude:.5f}, {longitude:.5f}",
        latitude,
        longitude,
        updated_by=updated_by_str,
    )

    db.commit()
    db.refresh(shipment)
    return _to_detail(shipment)


def deliver_shipment(db: Session, user: User, shipment_id: UUID) -> TripDetailResponse:
    shipment = get_accessible_shipment(db, user, shipment_id)
    _require_status(shipment, "IN_TRANSIT", "NEAR_DESTINATION", "OUT_FOR_DELIVERY", "PICKED_UP")
    positions = _build_positions(shipment.waypoints)
    destination = positions[-1] if positions else {"label": "Destination", "latitude": None, "longitude": None}
    shipment.status = "DELIVERED"
    shipment.delivered_at = datetime.now(timezone.utc)
    shipment.eta_minutes = 0
    shipment.distance_remaining_km = 0.0
    shipment.current_stop_index = len(positions) - 1 if positions else 0

    updated_by_str = user.email or user.phone_e164 or "Logistics Partner"
    _add_event(
        db,
        shipment,
        "DELIVERED",
        f"Delivered at {destination['label']}",
        "Shipment handed over at destination. Delivery verified.",
        destination["latitude"],
        destination["longitude"],
        updated_by=updated_by_str,
    )
    if shipment.order.status in ("IN_TRANSIT", "CONFIRMED", "READY_FOR_PICKUP"):
        orders_service.apply_status_transition(
            db,
            shipment.order,
            "DELIVERED",
            "SYSTEM",
            note="Delivered by logistics partner",
        )
    db.commit()
    db.refresh(shipment)
    return _to_detail(shipment)


def get_logistics_metrics(db: Session, user: User) -> LogisticsMetricsOut:
    query = select(Shipment)
    if user.role == "LOGISTICS":
        query = query.where(Shipment.provider_user_id == user.id)
    elif user.role == "FARMER":
        query = query.join(Shipment.order).join(Order.farmer).where(FarmerProfile.user_id == user.id)
    elif user.role in ("BUYER", "BULK_BUYER"):
        query = query.join(Shipment.order).join(Order.buyer).where(BuyerProfile.user_id == user.id)
    elif user.role == "CONSUMER":
        query = query.join(Shipment.order).join(Order.consumer).where(ConsumerProfile.user_id == user.id)

    shipments = db.scalars(query).all()

    active_statuses = {"ASSIGNED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "NEAR_DESTINATION", "OUT_FOR_DELIVERY"}
    in_transit_statuses = {"IN_TRANSIT", "NEAR_DESTINATION", "OUT_FOR_DELIVERY"}

    active = sum(1 for s in shipments if s.status in active_statuses)
    in_transit = sum(1 for s in shipments if s.status in in_transit_statuses)
    delivering_today = sum(1 for s in shipments if s.status in {"IN_TRANSIT", "NEAR_DESTINATION", "OUT_FOR_DELIVERY", "PICKED_UP"})
    delivered = sum(1 for s in shipments if s.status == "DELIVERED")
    delayed = sum(1 for s in shipments if s.status == "DELAYED")

    return LogisticsMetricsOut(
        active_shipments=active,
        in_transit=in_transit,
        delivering_today=delivering_today,
        delivered=delivered,
        delayed=delayed,
    )


def get_order_shipment(db: Session, user: User, order_id: UUID) -> Shipment:
    order = _get_order_or_404(db, order_id)
    if user.role == "FARMER" and order.farmer.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    if user.role in ("BUYER", "BULK_BUYER") and (
        order.order_type != "B2B" or order.buyer is None or order.buyer.user_id != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    if (
        user.role == "CONSUMER"
        and (order.order_type != "B2C" or order.consumer is None or order.consumer.user_id != user.id)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    shipment = db.scalar(select(Shipment).where(Shipment.order_id == order.id))
    if shipment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shipment assigned to this order yet",
        )
    return shipment


def get_order_tracking(db: Session, user: User, order_id: UUID) -> TripDetailResponse:
    shipment = get_order_shipment(db, user, order_id)
    return _to_detail(shipment)