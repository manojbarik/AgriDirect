"""Transparent weighted farmer-buyer matching engine.

The algorithm computes a match_score (0-100) as a weighted combination of six
clearly documented compatibility factors. No neural network is used, so every
score is explainable back to the underlying inputs.
"""

from __future__ import annotations

import re
from datetime import date
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import BuyerDemand, Crop, CropListing
from app.db.models.people import BuyerProfile, Farm, FarmerProfile
from app.db.models.social import TrustScore
from app.modules.ai.schemas import (
    MatchBuyersRequest,
    MatchFactorOutput,
    MatchFarmersRequest,
    MatchResponse,
    MatchResultItem,
)

MODEL_VERSION = "matching-v1"
ALGORITHM = "Transparent weighted compatibility scoring v1 (weights: crop 0.25, price 0.20, quantity 0.15, location 0.15, timing 0.15, trust 0.10)"
DISCLAIMER = (
    "DEMO MATCHING: Rankings use a deterministic, explainable weighted compatibility "
    "algorithm over live marketplace data. Scores are for preview purposes only."
)

# Documented weights (0-1, sum = 1.0)
WEIGHTS = {
    "crop": 0.25,
    "price": 0.20,
    "quantity": 0.15,
    "location": 0.15,
    "timing": 0.15,
    "trust": 0.10,
}

REASON_LABELS = {
    "crop": "Crop matches",
    "quantity": "Quantity matches",
    "price": "Price compatible",
    "location": "Location nearby",
    "timing": "Delivery date compatible",
    "trust": "Trusted counterparty",
}

PASS_THRESHOLDS = {
    "crop": 50,
    "quantity": 60,
    "price": 60,
    "location": 55,
    "timing": 60,
    "trust": 60,
}


def _decimal(value: float | Decimal) -> Decimal:
    return Decimal(str(value))


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float("inf")
    r = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 2 * r * asin(sqrt(a))


def _grade_from_quality(quality_text: str | None) -> str | None:
    if not quality_text:
        return None
    lowered = quality_text.lower()
    match = re.search(r"grade\s*([abc])", lowered)
    if match:
        return f"Grade {match.group(1).upper()}"
    return None


def _resolve_crop_ids(db: Session, crop_name: str, category: str | None) -> list[object]:
    name_stmt = select(Crop.id).where(Crop.name.ilike(crop_name))
    crop_ids = list(db.scalars(name_stmt).all())
    if category:
        cat_stmt = select(Crop.id).where(Crop.category == category)
        crop_ids.extend(db.scalars(cat_stmt).all())
    return list(dict.fromkeys(crop_ids))


def crop_compatibility(
    crop: Crop, requested_name: str, requested_variety: str | None
) -> tuple[Decimal, str]:
    if crop.name.strip().lower() == requested_name.strip().lower():
        if requested_variety and crop.variety and crop.variety.lower() != requested_variety.lower():
            return _decimal(
                80
            ), f"Crop matches ({crop.name}), but variety differs ({requested_variety})"
        return _decimal(100), f"Crop matches ({crop.name})"
    if crop.category and requested_variety is None:
        return _decimal(50), f"Only category matches ({crop.category})"
    return _decimal(0), f"Different crop ({crop.name})"


def quantity_compatibility(
    available_q: Decimal, required_q: Decimal, available_unit: str, required_unit: str
) -> tuple[Decimal, str]:
    if available_unit != required_unit:
        return _decimal(60), f"Units differ ({available_unit} vs {required_unit})"
    if available_q <= 0:
        return _decimal(0), "No quantity available"
    ratio = float(required_q) / float(available_q)
    if ratio <= 1.0:
        if ratio >= 0.2:
            return _decimal(100), f"Supplies {available_q} {available_unit}, you need {required_q}"
        return _decimal(
            75
        ), f"Farmer has much more ({available_q} {available_unit}) than needed ({required_q})"
    if ratio <= 2.0:
        return _decimal(100 - (ratio - 1.0) * 60), (
            f"Partially covers need ({available_q} of {required_q} {required_unit})"
        )
    return _decimal(30), f"Only covers {available_q} of {required_q} {required_unit}"


def price_compatibility(
    price: Decimal,
    target_price: Decimal | None,
    target_min: Decimal | None,
    target_max: Decimal | None,
) -> tuple[Decimal, str]:
    if target_min is not None and target_max is not None:
        if target_min <= price <= target_max:
            return _decimal(100), f"₹{price} within budget range ₹{target_min}-₹{target_max}"
        if price < target_min:
            return _decimal(80), f"₹{price} is below target range (savings)"
        return _decimal(60), f"₹{price} above target range (max ₹{target_max})"
    if target_price is None:
        return _decimal(60), "No target price provided"
    ratio = float(price) / float(target_price)
    if ratio <= 0.8:
        return _decimal(80), f"₹{price} is below your target ₹{target_price}"
    if ratio <= 1.2:
        score = 100 - (abs(ratio - 1.0) * 200)
        return _decimal(max(0, score)), f"₹{price} close to your target ₹{target_price}"
    return _decimal(
        max(0, 100 - (ratio - 1.2) * 300)
    ), f"₹{price} above your target ₹{target_price}"


def location_compatibility(
    lat_a, lon_a, state_a, district_a, lat_b, lon_b, state_b, district_b
) -> tuple[Decimal, str]:
    def to_float(value) -> float | None:
        return float(value) if value is not None else None

    distance = _haversine_km(to_float(lat_a), to_float(lon_a), to_float(lat_b), to_float(lon_b))
    if distance != float("inf"):
        score = max(0, 100 - distance / 5)
        label = "Location nearby" if distance <= 60 else "Location compatible"
        return _decimal(score), f"{label} ({round(distance)} km apart)"
    if state_a and state_b and state_a.lower() == state_b.lower():
        if district_a and district_b and district_a.lower() == district_b.lower():
            return _decimal(100), f"Same area ({state_a} · {district_a})"
        return _decimal(70), f"Same state ({state_a})"
    if state_a and state_b:
        return _decimal(35), f"Different states ({state_a} vs {state_b})"
    return _decimal(30), "Location data unavailable"


def timing_compatibility(
    required_by: date,
    available_from: date | None,
    available_until: date | None,
) -> tuple[Decimal, str]:
    if available_from is None and available_until is None:
        return _decimal(80), "Availability window not specified"
    if available_until is not None and required_by <= available_until:
        if available_from is not None and required_by < available_from:
            gap = (available_from - required_by).days
            score = max(30, 100 - gap * 15)
            return _decimal(score), f"Need by {required_by}, harvest starts {available_from}"
        return _decimal(100), f"Delivery by {required_by} fits harvest window"
    if available_until is not None:
        overdue = (required_by - available_until).days
        score = max(10, 100 - overdue * 25)
        return _decimal(score), f"Harvest ends {available_until}, buyer needs {required_by}"
    return _decimal(60), "Harvest date unclear"


def trust_compatibility(trust_score: Decimal | None) -> tuple[Decimal, str]:
    if trust_score is None:
        return _decimal(50), "Trust score not calculated yet"
    score = float(trust_score)
    if score >= 70:
        return _decimal(100), f"Strong trust score ({round(score)}/100)"
    if score >= 40:
        return _decimal(80), f"Established trust score ({round(score)}/100)"
    return _decimal(30), f"Low trust score ({round(score)}/100)"


def _factor(key: str, score: Decimal, detail: str) -> MatchFactorOutput:
    return MatchFactorOutput(
        key=key,
        label=REASON_LABELS[key],
        score=_decimal(min(100, float(score))),
        passed=float(score) >= PASS_THRESHOLDS[key],
        detail=detail,
    )


def _finalize(
    factors: dict[str, MatchFactorOutput],
    unit: str,
    quantity: Decimal,
    price: Decimal | None,
) -> tuple[Decimal, list[str], list[MatchFactorOutput]]:
    score = sum(float(factors[key].score) * weight for key, weight in WEIGHTS.items())
    reasons = [factors[key].label for key in WEIGHTS if factors[key].passed]
    return _decimal(round(score, 2)), reasons, list(factors.values())


def _farmer_trust(db: Session, farmer: FarmerProfile) -> TrustScore | None:
    return db.scalar(select(TrustScore).where(TrustScore.user_id == farmer.user_id))


def _buyer_trust(db: Session, buyer: BuyerProfile) -> TrustScore | None:
    return db.scalar(select(TrustScore).where(TrustScore.user_id == buyer.user_id))


def match_farmers(db: Session, payload: MatchFarmersRequest) -> MatchResponse:
    crop_ids = _resolve_crop_ids(db, payload.crop_name, payload.category)
    if not crop_ids:
        return MatchResponse(
            model_version=MODEL_VERSION,
            algorithm=ALGORITHM,
            query_summary=f"Buyer looking for {payload.crop_name}",
            matches=[],
            disclaimer=DISCLAIMER,
        )

    listings = db.scalars(
        select(CropListing)
        .where(
            CropListing.status == "PUBLISHED",
            CropListing.available_quantity > 0,
            CropListing.crop_id.in_(crop_ids),
        )
        .order_by(CropListing.published_at.desc())
        .limit(30)
    ).all()

    matches: list[MatchResultItem] = []
    for listing in listings:
        crop = db.get(Crop, listing.crop_id)
        farmer = db.get(FarmerProfile, listing.farmer_id)
        farm = db.get(Farm, listing.farm_id)
        if crop is None or farmer is None:
            continue

        crop_score, crop_detail = crop_compatibility(crop, payload.crop_name, payload.variety)
        qty_score, qty_detail = quantity_compatibility(
            listing.available_quantity, payload.quantity_required, listing.unit, payload.unit
        )
        price_score, price_detail = price_compatibility(
            listing.unit_price,
            payload.target_price,
            payload.target_min_price,
            payload.target_max_price,
        )
        loc_score, loc_detail = location_compatibility(
            farm.latitude if farm else None,
            farm.longitude if farm else None,
            farm.state if farm else None,
            farm.district if farm else None,
            payload.latitude,
            payload.longitude,
            payload.state,
            payload.district,
        )
        timing_score, timing_detail = timing_compatibility(
            payload.required_by, listing.available_from, listing.available_until
        )
        trust = _farmer_trust(db, farmer)
        trust_score, trust_detail = trust_compatibility(_decimal(trust.score) if trust else None)

        factors = {
            "crop": _factor("crop", crop_score, crop_detail),
            "quantity": _factor("quantity", qty_score, qty_detail),
            "price": _factor("price", price_score, price_detail),
            "location": _factor("location", loc_score, loc_detail),
            "timing": _factor("timing", timing_score, timing_detail),
            "trust": _factor("trust", trust_score, trust_detail),
        }
        overall, reasons, factor_list = _finalize(
            factors, listing.unit, listing.available_quantity, listing.unit_price
        )
        location_text = " · ".join(
            part for part in (farm.state if farm else None, farm.district if farm else None) if part
        )
        availability = _availability_text(listing.available_from, listing.available_until)

        matches.append(
            MatchResultItem(
                entity_id=str(listing.id),
                counterparty_id=str(farmer.id),
                name=farmer.full_name,
                crop_name=crop.name,
                variety=crop.variety,
                grade=listing.grade,
                title=listing.title,
                unit=listing.unit,
                quantity=listing.available_quantity,
                price=listing.unit_price,
                location=location_text or None,
                availability_text=availability,
                trust_score=_decimal(trust.score) if trust else None,
                trust_band=trust.score_band if trust else None,
                match_score=overall,
                reasons=reasons,
                factors=factor_list,
            )
        )

    matches.sort(key=lambda m: m.match_score, reverse=True)
    return MatchResponse(
        model_version=MODEL_VERSION,
        algorithm=ALGORITHM,
        query_summary=f"Buyer looking for {payload.crop_name} ({payload.quantity_required} {payload.unit})",
        matches=matches,
        disclaimer=DISCLAIMER,
    )


def match_buyers(db: Session, payload: MatchBuyersRequest) -> MatchResponse:
    crop_ids = _resolve_crop_ids(db, payload.crop_name, payload.category)
    if not crop_ids:
        return MatchResponse(
            model_version=MODEL_VERSION,
            algorithm=ALGORITHM,
            query_summary=f"Farmer offering {payload.crop_name}",
            matches=[],
            disclaimer=DISCLAIMER,
        )

    demands = db.scalars(
        select(BuyerDemand)
        .where(
            BuyerDemand.crop_id.in_(crop_ids),
            BuyerDemand.status != "CANCELLED",
        )
        .order_by(BuyerDemand.created_at.desc())
        .limit(30)
    ).all()

    matches: list[MatchResultItem] = []
    for demand in demands:
        crop = db.get(Crop, demand.crop_id)
        buyer = db.get(BuyerProfile, demand.buyer_id)
        if crop is None or buyer is None:
            continue

        crop_score, crop_detail = crop_compatibility(crop, payload.crop_name, payload.variety)
        qty_score, qty_detail = quantity_compatibility(
            payload.available_quantity, demand.requested_quantity, payload.unit, demand.unit
        )
        price_score, price_detail = price_compatibility(
            payload.expected_price or _decimal(0),
            None,
            demand.target_min_price,
            demand.target_max_price,
        )
        loc_score, loc_detail = location_compatibility(
            payload.latitude,
            payload.longitude,
            payload.state,
            payload.district,
            buyer.latitude,
            buyer.longitude,
            buyer.state,
            buyer.district,
        )
        timing_score, timing_detail = timing_compatibility(
            demand.required_by, payload.available_from, payload.available_until
        )
        trust = _buyer_trust(db, buyer)
        trust_score, trust_detail = trust_compatibility(_decimal(trust.score) if trust else None)

        factors = {
            "crop": _factor("crop", crop_score, crop_detail),
            "quantity": _factor("quantity", qty_score, qty_detail),
            "price": _factor("price", price_score, price_detail),
            "location": _factor("location", loc_score, loc_detail),
            "timing": _factor("timing", timing_score, timing_detail),
            "trust": _factor("trust", trust_score, trust_detail),
        }
        overall, reasons, factor_list = _finalize(
            factors, demand.unit, demand.requested_quantity, payload.expected_price
        )
        location_text = " · ".join(part for part in (buyer.state, buyer.district) if part)
        availability = f"Needed by {demand.required_by}"

        matches.append(
            MatchResultItem(
                entity_id=str(demand.id),
                counterparty_id=str(buyer.id),
                name=buyer.full_name,
                crop_name=crop.name,
                variety=crop.variety,
                grade=None,
                title=None,
                unit=demand.unit,
                quantity=demand.requested_quantity,
                price=payload.expected_price,
                location=location_text or None,
                availability_text=availability,
                trust_score=_decimal(trust.score) if trust else None,
                trust_band=trust.score_band if trust else None,
                match_score=overall,
                reasons=reasons,
                factors=factor_list,
            )
        )

    matches.sort(key=lambda m: m.match_score, reverse=True)
    return MatchResponse(
        model_version=MODEL_VERSION,
        algorithm=ALGORITHM,
        query_summary=f"Farmer offering {payload.crop_name} ({payload.available_quantity} {payload.unit})",
        matches=matches,
        disclaimer=DISCLAIMER,
    )


def _availability_text(available_from: date | None, available_until: date | None) -> str | None:
    if available_from and available_until:
        return f"Harvest {available_from} → {available_until}"
    if available_from:
        return f"Available from {available_from}"
    if available_until:
        return f"Available until {available_until}"
    return None
