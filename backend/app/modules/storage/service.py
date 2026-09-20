"""Storage intelligence service.

Pure calculation - no database dependency for the recommendation itself.
Storage options are demonstration facilities.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from app.modules.ai.schemas import PricePredictionRequest
from app.modules.ai.service import get_price_prediction
from app.modules.storage.schemas import (
    SellNowOutcome,
    StorageOption,
    StorageOptionsResponse,
    StorageRecommendationRequest,
    StorageRecommendationResponse,
    StoreThenSellOutcome,
)

_DISCLAIMER = (
    "Demonstration estimate. Storage facilities and figures are synthetic demo "
    "data; the price forecast is an AI estimate and is not a guaranteed market price."
)

_BASE_RATE_PER_KG_PER_DAY = Decimal("0.04")

# name, storage_type, capacity_tonnes, state, district, rate_per_kg/day, min_days, max_days, services
_DEMO_FACILITIES: tuple[tuple[str, str, str, str, str, str, int, int, tuple[str, ...]], ...] = (
    ("AgriDirect Cold Storage Hub", "COLD_STORAGE", "1200", "Odisha", "Bhubaneswar", "0.05", 1, 180, ("Refrigeration", "Sorting", "Pest control")),
    ("AgriDirect Warehouse Park", "WAREHOUSE", "2500", "Odisha", "Cuttack", "0.035", 1, 365, ("Dry storage", "Pallet racks", "Loading ramp")),
    ("Green Valley Cold Chain", "COLD_STORAGE", "800", "Maharashtra", "Nashik", "0.06", 1, 120, ("Refrigeration", "Humidity control")),
    ("Mandi Godown - Collectorate", "GODOWN", "1500", "Odisha", "Puri", "0.025", 7, 300, ("Covered shed", "Fumigation")),
    ("Farmer Producer Storage Center", "WAREHOUSE", "600", "Odisha", "Khordha", "0.03", 3, 240, ("Dry storage", "Bagging", "Grading")),
    ("Chill Store Unit - AgriPark", "COLD_STORAGE", "450", "Odisha", "Ganjam", "0.055", 2, 90, ("Refrigeration", "Sorting")),
)


def _d(value: str | Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def list_storage_options(state: str | None = None, district: str | None = None) -> StorageOptionsResponse:
    options: list[StorageOption] = []
    for row in _DEMO_FACILITIES:
        name, s_type, capacity, s_state, s_district, rate, min_days, max_days, services = row
        if state and s_state.lower() != state.strip().lower():
            continue
        if district and s_district.lower() != district.strip().lower():
            if state:
                continue
        options.append(
            StorageOption(
                id=f"storage-{len(options) + 1}",
                name=name,
                storage_type=s_type,
                capacity_tonnes=Decimal(capacity),
                location=f"{s_district}, {s_state}",
                state=s_state,
                district=s_district,
                price_per_kg_per_day=Decimal(rate),
                min_duration_days=min_days,
                max_duration_days=max_days,
                services=list(services),
                is_demo=True,
            )
        )
    return StorageOptionsResponse(
        options=options or _fallback_options(),
        region=district or state,
        is_demo=True,
        disclaimer=_DISCLAIMER,
    )


def _fallback_options() -> list[StorageOption]:
    return [
        StorageOption(
            id="storage-1",
            name="AgriDirect Cold Storage Hub",
            storage_type="COLD_STORAGE",
            capacity_tonnes=Decimal("1200"),
            location="Bhubaneswar, Odisha",
            state="Odisha",
            district="Bhubaneswar",
            price_per_kg_per_day=Decimal("0.05"),
            min_duration_days=1,
            max_duration_days=180,
            services=["Refrigeration", "Sorting", "Pest control"],
            is_demo=True,
        )
    ]


def get_storage_recommendation(payload: StorageRecommendationRequest) -> StorageRecommendationResponse:
    if payload.predicted_price_per_kg is None:
        prediction = get_price_prediction(
            PricePredictionRequest(
                crop_name=payload.crop_name,
                variety=payload.variety,
                state=payload.state,
                district=payload.district,
                quantity_kg=payload.quantity_kg,
            )
        )
        predicted_price = _d(prediction.predicted_price)
        predicted_metadata = f"AI forecast (model v{prediction.model_version})"
    else:
        predicted_price = _d(payload.predicted_price_per_kg)
        predicted_metadata = "user-supplied expected price"

    current_price = _d(payload.current_price_per_kg)
    quantity = _d(payload.quantity_kg)
    loss_pct = _d(payload.expected_loss_rate_pct)
    tx_pct = _d(payload.transaction_cost_pct)
    days = payload.storage_days

    rate_per_kg_day = (
        _d(payload.storage_cost_per_kg_per_day)
        if payload.storage_cost_per_kg_per_day is not None
        else _BASE_RATE_PER_KG_PER_DAY
    )

    sell_now_rev = _d(quantity * current_price)
    sell_now_tx = _d(sell_now_rev * tx_pct / 100)
    sell_now_net = _d(sell_now_rev - sell_now_tx)

    store_rev = _d(quantity * predicted_price)
    storage_cost = _d(quantity * rate_per_kg_day * Decimal(days))
    loss_kg = _d(quantity * loss_pct / 100)
    lost_value = _d(loss_kg * predicted_price)
    store_tx = _d(store_rev * tx_pct / 100)
    store_net = _d(store_rev - storage_cost - lost_value - store_tx)

    benefit = _d(store_net - sell_now_net)

    # breakeven days: store_net(d) == sell_now_net
    # store_net(d) = qty*P_fut*(1-tx-loss) - qty*rate*d
    # => d* = [P_fut*(1-tx-loss) - P_now*(1-tx)] / rate
    bracket = predicted_price * Decimal("1") - (predicted_price * tx_pct / 100) - (predicted_price * loss_pct / 100)
    now_term = current_price * (Decimal("1") - (tx_pct / 100))
    if rate_per_kg_day > 0 and bracket > now_term:
        breakeven = int((bracket - now_term) / rate_per_kg_day)
        breakeven = max(0, breakeven)
    else:
        breakeven = None

    if benefit > 0:
        rank = "STORE_THEN_SELL"
        label = f"Store then sell — you could gain ₹{benefit} over selling now"
    else:
        rank = "SELL_NOW"
        label = f"Sell now — storing would cost ₹{abs(benefit)} more than selling today"

    reasoning: list[str] = [
        f"Current market price: ₹{current_price}/kg (quantity {quantity} kg).",
        f"{predicted_metadata.capitalize()}: ₹{predicted_price}/kg.",
        f"Storage cost @ ₹{rate_per_kg_day}/kg/day for {days} days = ₹{storage_cost}.",
        f"Expected post-harvest loss {loss_pct}% = {loss_kg} kg (₹{lost_value}).",
        f"Net if selling now: ₹{sell_now_net}. Net if storing then selling: ₹{store_net}.",
        f"Storing adds ₹{benefit} {'' if benefit >= 0 else '(removes ₹' + str(abs(benefit)) + ')'} of value.",
    ]
    if breakeven is not None:
        reasoning.append(f"You break even at ~{breakeven} days of storage; beyond that storing loses value.")

    # simple confidence: stronger when the price gap clearly favours one option
    gap_ratio = float(min(abs(benefit), sell_now_net) / sell_now_net) if sell_now_net > 0 else 0.0
    confidence = round(min(0.95, 0.55 + 0.4 * gap_ratio), 2)

    return StorageRecommendationResponse(
        crop_name=payload.crop_name,
        quantity_kg=quantity,
        current_price_per_kg=current_price,
        predicted_price_per_kg=predicted_price,
        storage_days=days,
        sell_now=SellNowOutcome(
            estimated_revenue=sell_now_rev,
            transaction_cost=sell_now_tx,
            net_income=sell_now_net,
        ),
        store_then_sell=StoreThenSellOutcome(
            estimated_revenue=store_rev,
            storage_cost=storage_cost,
            expected_loss_kg=loss_kg,
            lost_value=lost_value,
            transaction_cost=store_tx,
            net_income=store_net,
        ),
        recommendation_rank=rank,
        recommendation_label=label,
        net_benefit_of_storing=benefit,
        breakeven_storage_days=breakeven,
        confidence_score=confidence,
        reasoning=reasoning,
        is_synthetic=True,
        estimated_at=datetime.now(timezone.utc),
        disclaimer=_DISCLAIMER,
    )