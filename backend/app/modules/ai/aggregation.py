from __future__ import annotations

import math
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Crop, CropListing
from app.db.models.people import FarmerProfile
from app.modules.ai.aggregation_schemas import (
    AggregationGroup,
    AggregationRequest,
    AggregationResponse,
    OptimizedSequenceStep,
    RouteOptimizeRequest,
    RouteOptimizeResponse,
    RouteStop,
    WastageRiskRequest,
    WastageRiskResponse,
)

LOGISTICS_RATE_PER_10KM_PER_50KG = 10.0

# Denormalized lat/long lookup for demo states/districts.
LOCATION_TABLE: dict[tuple[str, str], tuple[float, float]] = {
    ("Odisha", "Bhubaneswar"): (20.2961, 85.8245),
    ("Odisha", "Cuttack"): (20.4625, 85.8828),
    ("Odisha", "Puri"): (19.8135, 85.8312),
    ("West Bengal", "Kolkata"): (22.5726, 88.3639),
    ("Jharkhand", "Ranchi"): (23.3441, 85.3096),
    ("Telangana", "Hyderabad"): (17.3850, 78.4867),
    ("Maharashtra", "Nashik"): (19.9975, 73.7898),
    ("Maharashtra", "Pune"): (18.5204, 73.8567),
    ("Maharashtra", "Mumbai"): (19.0760, 72.8777),
}


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _coords(stop: RouteStop) -> tuple[float, float]:
    key = (stop.state or "", stop.district or "")
    if key in LOCATION_TABLE:
        return LOCATION_TABLE[key]
    # Deterministic pseudo-distance for unknown locations.
    base = abs(hash(f"{stop.state}:{stop.district}")) % 1000
    return (20.0 + (base % 10), 75.0 + ((base // 10) % 10))


def _distance(a: RouteStop, b: RouteStop) -> Decimal:
    lat1, lon1 = _coords(a)
    lat2, lon2 = _coords(b)
    return Decimal(f"{_haversine(lat1, lon1, lat2, lon2):.1f}")


def _round2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def build_aggregation(
    db: Session, payload: AggregationRequest
) -> AggregationResponse:
    crops = db.scalars(
        select(Crop).where(Crop.name.ilike(f"%{payload.crop_name}%"))
    ).all()
    crop_ids = [c.id for c in crops]

    stmt = select(CropListing).where(CropListing.status == "PUBLISHED")
    if crop_ids:
        stmt = stmt.where(CropListing.crop_id.in_(crop_ids))
    if payload.state:
        stmt = stmt.where(CropListing.state == payload.state)
    if payload.district:
        stmt = stmt.where(CropListing.district == payload.district)
    listings = db.scalars(stmt).all()

    centre = RouteStop(
        name="centre",
        state=payload.state,
        district=payload.district,
    )

    scored: list[dict[str, Any]] = []
    for listing in listings:
        if payload.max_price is not None and listing.unit_price > payload.max_price:
            continue
        stop = RouteStop(
            name=str(listing.id),
            state=listing.state,
            district=listing.district,
        )
        dist = float(_distance(stop, centre))
        scored.append(
            {
                "listing": listing,
                "dist": dist,
                "price": float(listing.unit_price),
            }
        )

    # Greedy pack: sort by distance then price.
    scored.sort(key=lambda x: (x["dist"], x["price"]))

    groups: list[AggregationGroup] = []
    share_split: dict[str, dict[str, Any]] = {}
    remaining = payload.quantity_required
    total_value = Decimal("0.00")
    for entry in scored:
        if remaining <= 0:
            break
        listing = entry["listing"]
        take = min(listing.available_quantity, remaining)
        remaining -= take
        price = listing.unit_price
        value = (take * price).quantize(Decimal("0.01"))
        total_value += value
        farmer_name = None
        farmer = db.get(FarmerProfile, listing.farmer_id)
        if farmer is not None:
            farmer_name = farmer.full_name
        groups.append(
            AggregationGroup(
                listing_id=str(listing.id),
                farmer_name=farmer_name,
                state=listing.state,
                district=listing.district,
                quantity_kg=take,
                price_per_kg=price,
                value=value,
            )
        )
        share_split[str(listing.id)] = {
            "quantity": str(take),
            "revenue": str(value),
        }

    total_quantity = payload.quantity_required - remaining
    shortfall = max(Decimal("0"), remaining)

    # Transport savings estimate: per-10km-per-50kg model.
    total_group_km = 0.0
    for entry in scored:
        if entry["listing"].id in {
            g.listing_id for g in groups
        }:
            total_group_km += entry["dist"]
    logistics_cost = Decimal(
        f"{((float(total_quantity) / 50.0) * (total_group_km / 10.0) * LOGISTICS_RATE_PER_10KM_PER_50KG):.2f}"
    )
    savings = _round2(logistics_cost * Decimal("0.30"))

    return AggregationResponse(
        groups=groups,
        total_quantity=total_quantity,
        total_value=total_value,
        quantity_shortfall=shortfall,
        transportation_savings_estimate=f"₹{savings:.2f}",
        aggregated_share_split=share_split,
        estimated_logistics_cost=logistics_cost,
        estimated_savings=savings,
    )


PERISHABILITY_TABLE = {
    "tomato": "high",
    "leafy": "high",
    "spinach": "high",
    "lettuce": "high",
    "berries": "medium",
    "okra": "medium",
    "strawberry": "medium",
    "potato": "low",
    "onion": "low",
    "garlic": "low",
}


def _crop_perishability(crop: str) -> str:
    key = crop.strip().lower()
    for name, level in PERISHABILITY_TABLE.items():
        if name in key or key in name:
            return level
    for high in ("tomato", "leafy", "spinach", "lettuce"):
        if high in key:
            return "high"
    for medium in ("berries", "okra", "strawberry"):
        if medium in key:
            return "medium"
    return "medium"


def assess_wastage_risk(payload: WastageRiskRequest) -> WastageRiskResponse:
    perish = _crop_perishability(payload.crop)
    reasons: list[str] = []

    if perish == "high":
        base_score = 70
        reasons.append("Highly perishable crop")
    elif perish == "medium":
        base_score = 45
        reasons.append("Moderately perishable crop")
    else:
        base_score = 18
        reasons.append("Low perishability crop")

    total_hours = payload.transport_duration_hours + payload.delivery_eta_hours
    if total_hours > 24:
        base_score += 25
        reasons.append("Long total transit time increases spoilage risk")
    elif total_hours > 12:
        base_score += 12
        reasons.append("Extended transit time")

    if payload.temperature_c > 35:
        base_score += 15
        reasons.append("High temperature accelerates spoilage")
    elif payload.temperature_c > 28:
        base_score += 7
        reasons.append("Elevated temperature risk")

    if payload.humidity > 85:
        base_score += 10
        reasons.append("High humidity promotes fungal growth")
    elif payload.humidity < 30:
        base_score += 5
        reasons.append("Very low humidity causes dehydration")

    if payload.storage_condition.strip().lower() in ("cold", "refrigerated", "chilled"):
        base_score -= 20
        reasons.append("Refrigerated storage lowers risk")
    elif payload.storage_condition.strip().lower() in ("dry", "ventilated"):
        base_score -= 5

    score = max(0, min(100, base_score))
    if score >= 65:
        risk = "HIGH"
        recommendation = "Ship immediately using refrigerated transport and prioritize delivery."
    elif score >= 35:
        risk = "MEDIUM"
        recommendation = "Ship as soon as possible; use proper ventilation and monitor temperature."
    else:
        risk = "LOW"
        recommendation = "Standard handling is sufficient; maintain cool, dry storage."

    return WastageRiskResponse(
        risk=risk,
        perishability_score=score,
        reasons=reasons,
        recommendation=recommendation,
    )


def optimize_route(payload: RouteOptimizeRequest) -> RouteOptimizeResponse:
    stops = list(payload.pickups)
    destination = payload.destination

    # Nearest-neighbor TSP from destination, visiting all pickups.
    visited = set()
    current = destination
    sequence_steps: list[OptimizedSequenceStep] = []
    distance_total = Decimal("0")
    while len(visited) < len(stops):
        best_idx = None
        best_dist = None
        for i, stop in enumerate(stops):
            if i in visited:
                continue
            d = _distance(current, stop)
            if best_dist is None or d < best_dist:
                best_dist = d
                best_idx = i
        # deterministic tie-break by index
        d = best_dist if best_dist is not None else Decimal("0")
        stop = stops[best_idx]
        distance_total += d
        visited.add(best_idx)
        eta = d / Decimal("40")
        sequence_steps.append(
            OptimizedSequenceStep(
                name=stop.name,
                distance_km=Decimal(f"{d:.1f}"),
                eta_hours=Decimal(f"{eta:.1f}"),
            )
        )
        current = stop

    # Return leg to destination.
    return_leg = _distance(current, destination)
    distance_total += return_leg
    sequence_steps.append(
        OptimizedSequenceStep(
            name=destination.name,
            distance_km=Decimal(f"{return_leg:.1f}"),
            eta_hours=Decimal(f"{return_leg / 40:.1f}"),
        )
    )

    est_cost = distance_total * Decimal("12.00")
    total_load = sum(
        payload.order_quantities_kg
    ) if payload.order_quantities_kg else Decimal("0")
    capacity = payload.vehicle_capacity_kg
    utilization = (total_load / capacity * 100) if capacity > 0 else Decimal("0")

    pickups_sequence = [s.name for s in sequence_steps[:-1]]
    delivery_order = [s.name for s in sequence_steps[:-1]] + [destination.name]

    rationale = (
        "Nearest-neighbour TSP using a demo distance model; "
        "orders are grouped by proximity to reduce empty kilometres."
    )
    return RouteOptimizeResponse(
        optimized_sequence=sequence_steps,
        total_distance_km=Decimal(f"{distance_total:.1f}"),
        total_cost_inr=Decimal(f"{est_cost:.2f}"),
        eta_hours=sum((s.eta_hours for s in sequence_steps), Decimal("0")),
        vehicle_utilization=Decimal(f"{utilization:.1f}"),
        pickups_sequence=pickups_sequence,
        delivery_order=delivery_order,
        rationale=rationale,
    )
