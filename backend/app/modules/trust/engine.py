"""Transparent, factor-based trust score engine (Phase 15).

The trust score is a weighted sum of five explainable components:

    score = verification + transaction reliability + quality
            + rating + dispute   (normalized to 0-100)

Every component is computed from measurable signals and each factor carries a
human-readable value and explanation, so users always see WHY they scored the
way they did.  There is no opaque or black-box model.  Sensitive attributes
(phone numbers, emails, identity documents) are never read or used.

Configuration (weights and thresholds) lives in app/core/config.py and can be
tuned per deployment.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.marketplace import CropBatch, Order, OrderStatusEvent
from app.db.models.people import BuyerProfile, FarmerProfile, User
from app.db.models.social import Rating
from app.db.models.transaction import Dispute, Payment, QualityCheck

COMPONENT_LABELS = {
    "verification": "Verification",
    "transaction": "Transaction reliability",
    "quality": "Quality",
    "rating": "Rating",
    "dispute": "Dispute",
}

COMPONENT_ORDER = ("verification", "transaction", "quality", "rating", "dispute")

DELIVERED_AND_AFTER = {
    "DELIVERED",
    "QUALITY_CHECK",
    "COMPLETED",
    "DISPUTED",
    "REFUNDED",
    "REPLACED",
}
DECIDED_ORDER_STATUSES = {"COMPLETED", "CANCELLED", "REFUNDED", "REPLACED"}

# Payment statuses that mean the buyer actually paid (even if later refunded).
CHARGED_PAYMENT_STATUSES = {"PAID", "SETTLED", "PARTIALLY_REFUNDED", "REFUNDED"}


@dataclass(frozen=True)
class Factor:
    key: str
    label: str
    component: str
    value: str
    points: Decimal
    max_points: Decimal
    detail: str
    kind: str  # "positive" | "penalty" | "neutral"


@dataclass(frozen=True)
class ComponentResult:
    key: str
    label: str
    points: Decimal
    max_points: Decimal
    factors: list[Factor]


@dataclass
class TrustComputation:
    role: str
    score: Decimal
    band: str
    calculation_version: str
    computed_at: datetime
    factors: list[Factor]
    components: list[ComponentResult] = field(default_factory=list)
    why: list[str] = field(default_factory=list)
    concerns: list[str] = field(default_factory=list)

    def group_components(self) -> list[ComponentResult]:
        grouped: dict[str, list[Factor]] = {key: [] for key in COMPONENT_ORDER}
        for factor in self.factors:
            grouped[factor.component].append(factor)
        return [
            ComponentResult(
                key=key,
                label=COMPONENT_LABELS[key],
                points=_money(sum(float(f.points) for f in grouped[key])),
                max_points=_money(sum(float(f.max_points) for f in grouped[key])),
                factors=grouped[key],
            )
            for key in COMPONENT_ORDER
        ]


@dataclass
class FarmerMetrics:
    verification: str
    completed_orders: int
    cancelled_by_farmer: int
    delivered_orders: int
    on_time_deliveries: int
    decided_orders: int
    pass_checks: int
    total_checks: int
    receipt_confirmations: int
    disputes_count: int
    ratings_count: int
    avg_rating: float | None


@dataclass
class BuyerMetrics:
    identity_verified: bool
    payment_verified: bool
    fully_paid_orders: int
    payment_successes: int
    payment_attempts: int
    cancelled_by_buyer: int
    completed_orders: int
    decided_orders: int
    disputes_count: int
    ratings_count: int
    avg_rating: float | None


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def _money(value: float) -> Decimal:
    return Decimal(str(round(float(value), 2))).quantize(Decimal("0.01"))


def _percent(ratio: float) -> str:
    return f"{round(ratio * 100)}%"


def _avg_rating(scores: list[int]) -> float | None:
    if not scores:
        return None
    return round(sum(scores) / len(scores), 1)


# --------------------------------------------------------------------------- #
# Metric gathering (measurable signals only - no sensitive attributes)
# --------------------------------------------------------------------------- #

def _cancelling_roles(db: Session, order_ids: set) -> dict[str, str]:
    """Map order_id -> role that cancelled it, using the order status events."""
    if not order_ids:
        return {}
    rows = db.execute(
        select(OrderStatusEvent.order_id, OrderStatusEvent.changed_by_role).where(
            OrderStatusEvent.order_id.in_(order_ids),
            OrderStatusEvent.to_status == "CANCELLED",
        )
    ).all()
    return {str(order_id): str(role) for order_id, role in rows}


def _ratings(db: Session, user_id) -> tuple[int, float | None]:
    scores = list(
        db.scalars(select(Rating.score).where(Rating.rated_user_id == user_id)).all()
    )
    if not scores:
        return 0, None
    return len(scores), _avg_rating(scores)


def gather_farmer_metrics(db: Session, profile: FarmerProfile) -> FarmerMetrics:
    orders = db.scalars(select(Order).where(Order.farmer_id == profile.id)).all()

    cancelled_ids = {o.id for o in orders if o.status == "CANCELLED"}
    cancelling = _cancelling_roles(db, cancelled_ids)
    cancelled_by_farmer = sum(
        1 for order_id in cancelled_ids if cancelling.get(str(order_id)) == "FARMER"
    )

    delivered = [
        o for o in orders if o.status in DELIVERED_AND_AFTER and o.delivered_at is not None
    ]
    on_time = sum(
        1
        for o in delivered
        if o.expected_delivery_date is None or o.delivered_at.date() <= o.expected_delivery_date
    )

    check_results = db.scalars(
        select(QualityCheck.result)
        .join(CropBatch, CropBatch.id == QualityCheck.batch_id)
        .where(CropBatch.farmer_id == profile.id)
    ).all()

    disputes_count = (
        db.scalar(
            select(func.count(Dispute.id))
            .join(Order, Order.id == Dispute.order_id)
            .where(Order.farmer_id == profile.id)
        )
        or 0
    )

    ratings_count, avg_rating = _ratings(db, profile.user_id)

    return FarmerMetrics(
        verification=profile.verification_status,
        completed_orders=sum(1 for o in orders if o.status == "COMPLETED"),
        cancelled_by_farmer=cancelled_by_farmer,
        delivered_orders=len(delivered),
        on_time_deliveries=on_time,
        decided_orders=sum(1 for o in orders if o.status in DECIDED_ORDER_STATUSES),
        pass_checks=sum(1 for result in check_results if result == "PASS"),
        total_checks=len(check_results),
        receipt_confirmations=sum(
            1 for o in orders if o.status in DELIVERED_AND_AFTER and o.receipt_confirmed_at is not None
        ),
        disputes_count=disputes_count,
        ratings_count=ratings_count,
        avg_rating=avg_rating,
    )


def gather_buyer_metrics(db: Session, profile: BuyerProfile, user: User) -> BuyerMetrics:
    orders = db.scalars(select(Order).where(Order.buyer_id == profile.id)).all()

    cancelled_ids = {o.id for o in orders if o.status == "CANCELLED"}
    cancelling = _cancelling_roles(db, cancelled_ids)
    cancelled_by_buyer = sum(
        1 for order_id in cancelled_ids if cancelling.get(str(order_id)) == "BUYER"
    )

    payments = db.execute(
        select(Payment.status, Payment.operation).where(Payment.payer_id == user.id)
    ).all()
    successes = sum(1 for status, _ in payments if status in CHARGED_PAYMENT_STATUSES)
    attempts = successes + sum(1 for status, _ in payments if status == "FAILED")

    balance_rows = db.execute(
        select(Payment.order_id, Payment.status).where(
            Payment.payer_id == user.id, Payment.operation == "BALANCE"
        )
    ).all()
    fully_paid_orders = len(
        {order_id for order_id, status in balance_rows if status in CHARGED_PAYMENT_STATUSES}
    )

    disputes_count = (
        db.scalar(select(func.count(Dispute.id)).where(Dispute.opened_by_id == user.id)) or 0
    )

    ratings_count, avg_rating = _ratings(db, user.id)

    return BuyerMetrics(
        identity_verified=profile.verification_status == "VERIFIED",
        payment_verified=profile.payment_verification_status == "VERIFIED",
        fully_paid_orders=fully_paid_orders,
        payment_successes=successes,
        payment_attempts=attempts,
        cancelled_by_buyer=cancelled_by_buyer,
        completed_orders=sum(1 for o in orders if o.status == "COMPLETED"),
        decided_orders=sum(1 for o in orders if o.status in DECIDED_ORDER_STATUSES),
        disputes_count=disputes_count,
        ratings_count=ratings_count,
        avg_rating=avg_rating,
    )


# --------------------------------------------------------------------------- #
# Factor computation (weights and thresholds read from settings)
# --------------------------------------------------------------------------- #

def _weights() -> dict[str, float]:
    settings = get_settings()
    return {
        "verification": settings.trust_verification_weight,
        "transaction": settings.trust_transaction_weight,
        "quality": settings.trust_quality_weight,
        "rating": settings.trust_rating_weight,
        "dispute": settings.trust_dispute_weight,
    }


def _make_factor(
    key: str,
    label: str,
    component: str,
    value: str,
    points: float,
    max_points: float,
    detail: str,
    kind: str,
) -> Factor:
    return Factor(
        key=key,
        label=label,
        component=component,
        value=value,
        points=_money(points),
        max_points=_money(max_points),
        detail=detail,
        kind=kind,
    )


def _rating_points(count: int, avg_rating: float | None, max_points: float) -> tuple[float, str]:
    if count == 0 or avg_rating is None:
        return 0.0, "No ratings yet"
    target = float(get_settings().trust_rating_target)
    denominator = max(target - 3.0, 0.001)
    normalized = _clamp((avg_rating - 3.0) / denominator)
    return max_points * normalized, f"{avg_rating:.1f}/5"


def compute_farmer_factors(db: Session, profile: FarmerProfile) -> TrustComputation:
    metrics = gather_farmer_metrics(db, profile)
    weights = _weights()
    max_orders = max(1, float(get_settings().trust_orders_for_full_credit))
    transaction_max = weights["transaction"]
    factors: list[Factor] = []

    # --- Verification component ---
    verification_points = {
        "VERIFIED": weights["verification"],
        "PENDING": weights["verification"] / 2,
    }.get(metrics.verification, 0.0)
    factors.append(
        _make_factor(
            "verification",
            "Verified identity",
            "verification",
            metrics.verification or "NONE",
            verification_points,
            weights["verification"],
            "Administrator-verified farmer identity with a complete profile.",
            "positive",
        )
    )

    # --- Transaction reliability component ---
    order_points = min(
        transaction_max * 0.40,
        transaction_max * 0.40 * metrics.completed_orders / max_orders,
    )
    factors.append(
        _make_factor(
            "successful_orders",
            "Successful orders",
            "transaction",
            str(metrics.completed_orders),
            order_points,
            transaction_max * 0.40,
            "Orders taken through the full fulfillment chain to COMPLETED.",
            "positive",
        )
    )

    on_time_ratio = _ratio(metrics.on_time_deliveries, metrics.delivered_orders)
    factors.append(
        _make_factor(
            "delivery_reliability",
            "Delivery reliability",
            "transaction",
            _percent(on_time_ratio),
            transaction_max * 0.32 * on_time_ratio,
            transaction_max * 0.32,
            "Share of delivered orders that met the promised delivery date.",
            "positive" if metrics.delivered_orders > 0 else "neutral",
        )
    )

    cancellation_rate = _ratio(metrics.cancelled_by_farmer, metrics.decided_orders)
    has_samples = metrics.decided_orders > 0
    factors.append(
        _make_factor(
            "cancellation_rate",
            "Cancellation rate",
            "transaction",
            _percent(cancellation_rate),
            transaction_max * 0.28 * (1.0 - cancellation_rate) if has_samples else 0.0,
            transaction_max * 0.28,
            "Fewer farmer-cancelled orders earn more points.",
            "penalty" if cancellation_rate > 0 else ("positive" if has_samples else "neutral"),
        )
    )

    # --- Quality component ---
    pass_ratio = _ratio(metrics.pass_checks, metrics.total_checks)
    receipt_ratio = _ratio(metrics.receipt_confirmations, metrics.delivered_orders)
    has_quality_data = metrics.total_checks > 0 or metrics.delivered_orders > 0
    quality_points = (
        weights["quality"] * (0.5 * pass_ratio + 0.5 * receipt_ratio)
        if has_quality_data
        else 0.0
    )
    factors.append(
        _make_factor(
            "quality_confirmations",
            "Quality confirmations",
            "quality",
            f"{_percent(pass_ratio)} pass · {_percent(receipt_ratio)} receipts",
            quality_points,
            weights["quality"],
            "Quality checks that pass and buyers that confirm receipt on delivery.",
            "positive" if has_quality_data else "neutral",
        )
    )

    # --- Rating component ---
    rating_points, rating_display = _rating_points(
        metrics.ratings_count, metrics.avg_rating, weights["rating"]
    )
    factors.append(
        _make_factor(
            "buyer_ratings",
            "Buyer ratings",
            "rating",
            rating_display,
            rating_points,
            weights["rating"],
            f"Average rating from {metrics.ratings_count} buyer(s).",
            "positive" if metrics.ratings_count > 0 else "neutral",
        )
    )

    # --- Dispute component ---
    dispute_sample = metrics.decided_orders + metrics.disputes_count
    dispute_rate = _ratio(metrics.disputes_count, dispute_sample) if dispute_sample > 0 else 0.0
    dispute_points = weights["dispute"] * (1.0 - dispute_rate) if dispute_sample > 0 else 0.0
    factors.append(
        _make_factor(
            "dispute_rate",
            "Dispute rate",
            "dispute",
            f"{metrics.disputes_count} of {dispute_sample}",
            dispute_points,
            weights["dispute"],
            "Disputes raised against your fulfilled orders.",
            "penalty" if metrics.disputes_count > 0 else ("positive" if dispute_sample > 0 else "neutral"),
        )
    )

    return _finalize("FARMER", factors, metrics)


def compute_buyer_factors(db: Session, profile: BuyerProfile, user: User) -> TrustComputation:
    metrics = gather_buyer_metrics(db, profile, user)
    weights = _weights()
    max_orders = max(1, float(get_settings().trust_orders_for_full_credit))
    transaction_max = weights["transaction"]
    factors: list[Factor] = []

    # --- Verification component ---
    factors.append(
        _make_factor(
            "identity_verification",
            "Identity verification",
            "verification",
            "VERIFIED" if metrics.identity_verified else "NOT_VERIFIED",
            weights["verification"] / 2 if metrics.identity_verified else 0.0,
            weights["verification"] / 2,
            "Buyer identity is verified by an administrator.",
            "positive",
        )
    )
    factors.append(
        _make_factor(
            "payment_verification",
            "Payment verification",
            "verification",
            "VERIFIED" if metrics.payment_verified else "NOT_VERIFIED",
            weights["verification"] / 2 if metrics.payment_verified else 0.0,
            weights["verification"] / 2,
            "Buyer payment method is verified by an administrator.",
            "positive",
        )
    )

    # --- Transaction reliability component ---
    payment_points = min(
        transaction_max * 0.40,
        transaction_max * 0.40 * metrics.fully_paid_orders / max_orders,
    )
    factors.append(
        _make_factor(
            "successful_payments",
            "Successful payments",
            "transaction",
            str(metrics.fully_paid_orders),
            payment_points,
            transaction_max * 0.40,
            "Orders on which the buyer completed the full advance + balance payment.",
            "positive",
        )
    )

    reliability_ratio = (
        _ratio(metrics.payment_successes, metrics.payment_attempts)
        if metrics.payment_attempts > 0
        else 0.0
    )
    factors.append(
        _make_factor(
            "payment_reliability",
            "Payment reliability",
            "transaction",
            _percent(reliability_ratio),
            transaction_max * 0.32 * reliability_ratio,
            transaction_max * 0.32,
            "Share of payment attempts that succeeded without failure.",
            "positive" if metrics.payment_attempts > 0 else "neutral",
        )
    )

    cancellation_rate = _ratio(metrics.cancelled_by_buyer, metrics.decided_orders)
    has_samples = metrics.decided_orders > 0
    factors.append(
        _make_factor(
            "cancellation_rate",
            "Cancellation rate",
            "transaction",
            _percent(cancellation_rate),
            transaction_max * 0.28 * (1.0 - cancellation_rate) if has_samples else 0.0,
            transaction_max * 0.28,
            "Fewer buyer-cancelled orders earn more points.",
            "penalty" if cancellation_rate > 0 else ("positive" if has_samples else "neutral"),
        )
    )

    # --- Quality (reliable completion) component ---
    completion_ratio = _ratio(metrics.completed_orders, metrics.decided_orders)
    factors.append(
        _make_factor(
            "order_completion",
            "Order completion",
            "quality",
            _percent(completion_ratio),
            weights["quality"] * completion_ratio,
            weights["quality"],
            "Share of committed orders the buyer saw through to COMPLETED.",
            "positive" if metrics.decided_orders > 0 else "neutral",
        )
    )

    # --- Rating component ---
    rating_points, rating_display = _rating_points(
        metrics.ratings_count, metrics.avg_rating, weights["rating"]
    )
    factors.append(
        _make_factor(
            "farmer_ratings",
            "Farmer ratings",
            "rating",
            rating_display,
            rating_points,
            weights["rating"],
            f"Average rating from {metrics.ratings_count} farmer(s).",
            "positive" if metrics.ratings_count > 0 else "neutral",
        )
    )

    # --- Dispute component ---
    dispute_sample = metrics.decided_orders + metrics.disputes_count
    dispute_rate = _ratio(metrics.disputes_count, dispute_sample) if dispute_sample > 0 else 0.0
    dispute_points = weights["dispute"] * (1.0 - dispute_rate) if dispute_sample > 0 else 0.0
    factors.append(
        _make_factor(
            "dispute_rate",
            "Disputes opened",
            "dispute",
            f"{metrics.disputes_count} of {dispute_sample}",
            dispute_points,
            weights["dispute"],
            "Disputes the buyer has opened against orders.",
            "penalty" if metrics.disputes_count > 0 else ("positive" if dispute_sample > 0 else "neutral"),
        )
    )

    return _finalize("BUYER", factors, metrics)


def _finalize(
    role: str,
    factors: list[Factor],
    metrics: object,
) -> TrustComputation:
    total = round(sum(float(f.points) for f in factors), 2)
    total = max(0.0, min(100.0, total))

    why, concerns = _reasons(role, factors, metrics)

    computation = TrustComputation(
        role=role,
        score=_money(total),
        band=_band(total),
        calculation_version=get_settings().trust_calculation_version,
        computed_at=datetime.now(timezone.utc),
        factors=factors,
        why=why,
        concerns=concerns,
    )
    computation.components = computation.group_components()
    return computation


def _band(total: float) -> str:
    if total <= 0.0:
        return "NEW"
    if total >= 70:
        return "HIGH"
    if total >= 40:
        return "MEDIUM"
    return "LOW"


def _reasons(role: str, factors: list[Factor], metrics: object) -> tuple[list[str], list[str]]:
    """Build the user-facing WHY list (earned signals) and concerns."""
    by_key = {f.key: f for f in factors}
    weights = _weights()
    why: list[str] = []
    concerns: list[str] = []

    if metrics is None:
        return why, concerns

    # Verification
    if role == "FARMER":
        verification_points = float(by_key["verification"].points)
        if verification_points >= float(weights["verification"]):
            why.append("Verified identity")
        elif verification_points > 0:
            concerns.append("Identity verification is still pending")
    else:
        identity_points = float(by_key["identity_verification"].points)
        payment_points = float(by_key["payment_verification"].points)
        if identity_points > 0 and payment_points > 0:
            why.append("Verified identity")
        else:
            concerns.append("Complete identity and payment verification to improve your score")

    # Transaction signals
    if role == "FARMER":
        completed = int(float(by_key["successful_orders"].value))
        if completed > 0:
            why.append(f"{completed} successful orders")
        if metrics.delivered_orders > 0:
            why.append(f"{by_key['delivery_reliability'].value} on-time completion")
        if metrics.pass_checks + metrics.receipt_confirmations > 0:
            pass_ratio = _ratio(metrics.pass_checks, metrics.total_checks)
            why.append(f"{_percent(pass_ratio)} quality confirmation rate")
    else:
        fully_paid = int(float(by_key["successful_payments"].value))
        if fully_paid > 0:
            why.append(f"{fully_paid} fully paid orders")
        if metrics.payment_attempts > 0:
            why.append(f"{by_key['payment_reliability'].value} payment reliability")
        if metrics.decided_orders > 0:
            why.append(f"{by_key['order_completion'].value} completed orders")

    # Rating
    rating_factor = by_key["buyer_ratings"] if role == "FARMER" else by_key["farmer_ratings"]
    if rating_factor.value != "No ratings yet":
        why.append(f"{rating_factor.value} average rating")
    elif metrics.decided_orders > 0:
        concerns.append("No ratings yet — add reviews for your completed orders")

    # Cancellation and dispute concerns
    cancellation_factor = by_key["cancellation_rate"]
    if cancellation_factor.kind == "penalty":
        concerns.append(f"{cancellation_factor.value} cancellation rate")

    dispute_factor = by_key["dispute_rate"]
    if dispute_factor.kind == "penalty":
        concerns.append(f"Disputes on {dispute_factor.value} transactions")
    elif dispute_factor.kind == "positive":
        why.append("Low dispute rate")

    if not why and not concerns:
        concerns.append(
            "No transaction history yet — your score grows as you complete verified orders"
        )
    return why, concerns


def snapshot(computation: TrustComputation) -> dict:
    """Plain-dict snapshot of a computation, stored alongside score history."""
    return {
        "role": computation.role,
        "score": str(computation.score),
        "band": computation.band,
        "calculation_version": computation.calculation_version,
        "computed_at": computation.computed_at.isoformat(),
        "factors": [
            {
                "key": f.key,
                "label": f.label,
                "component": f.component,
                "value": f.value,
                "points": str(f.points),
                "max_points": str(f.max_points),
                "detail": f.detail,
                "kind": f.kind,
            }
            for f in computation.factors
        ],
        "why": computation.why,
        "concerns": computation.concerns,
    }


def dumps(computation: TrustComputation) -> str:
    return json.dumps(snapshot(computation), ensure_ascii=False)