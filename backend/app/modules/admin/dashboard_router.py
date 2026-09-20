"""Phase 18 - Admin dashboard and analytics (ADMIN only).

Provides broad-but-sanitized operational visibility: counts, per-day chart
series, and read-only list endpoints across every marketplace entity. Endpoints
never expose sensitive private data (no passwords, OTPs, PII beyond a display
name/phone, or provider credentials).
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import (
    AiPrediction,
    BuyerDemand,
    BuyerProfile,
    ConsumerProfile,
    Crop,
    CropBatch,
    CropListing,
    Delivery,
    Dispute,
    FarmerProfile,
    Notification,
    Order,
    Payment,
    QualityCheck,
    Rating,
    Refund,
    TrustScore,
    User,
)
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/admin", tags=["admin-dashboard"])

PAID_PAYMENT_STATUSES = ("PAID", "SETTLED", "REFUNDED", "PARTIALLY_REFUNDED")


def _series(db: Session, model: type, criterion: Any, days: int) -> list[dict[str, Any]]:
    statement = select(
        func.date(getattr(model, "created_at")), func.count(model.id)
    ).group_by(func.date(getattr(model, "created_at")))
    if criterion is not None:
        statement = statement.where(criterion)
    rows = db.execute(statement).all()
    counts = {str(day): count for day, count in rows}
    today = date.today()
    result: list[dict[str, Any]] = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        result.append({"date": day.isoformat(), "value": counts.get(day.isoformat(), 0)})
    return result


@router.get(
    "/dashboard",
    summary="System statistics and dashboard chart series (ADMIN only)",
)
def admin_dashboard(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    paid_volume = (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.status.in_(PAID_PAYMENT_STATUSES)
            )
        )
        or 0
    )
    statistics = {
        "users": db.scalar(select(func.count(User.id))) or 0,
        "farmers": db.scalar(select(func.count(FarmerProfile.id))) or 0,
        "buyers": db.scalar(select(func.count(BuyerProfile.id))) or 0,
        "admins": db.scalar(select(func.count(User.id)).where(User.role == "ADMIN")) or 0,
        "pending_verifications": (
            db.scalar(
                select(func.count(FarmerProfile.id)).where(
                    FarmerProfile.verification_status == "PENDING"
                )
            )
            or 0
        )
        + (
            db.scalar(
                select(func.count(BuyerProfile.id)).where(
                    BuyerProfile.verification_status == "PENDING"
                )
            )
            or 0
        ),
        "listings": db.scalar(select(func.count(CropListing.id))) or 0,
        "active_listings": (
            db.scalar(
                select(func.count(CropListing.id)).where(
                    CropListing.status == "PUBLISHED",
                    CropListing.available_quantity > 0,
                )
            )
            or 0
        ),
        "demands": db.scalar(select(func.count(BuyerDemand.id))) or 0,
        "orders": db.scalar(select(func.count(Order.id))) or 0,
        "completed_orders": (
            db.scalar(select(func.count(Order.id)).where(Order.status == "COMPLETED")) or 0
        ),
        "disputed_orders": (
            db.scalar(
                select(func.count(Order.id)).where(Order.status.in_(("DISPUTED", "REFUNDED", "REPLACED")))
            )
            or 0
        ),
        "active_disputes": (
            db.scalar(select(func.count(Dispute.id)).where(Dispute.status == "OPEN")) or 0
        ),
        "payments": db.scalar(select(func.count(Payment.id))) or 0,
        "transaction_volume": float(paid_volume or 0),
        "deliveries": db.scalar(select(func.count(Delivery.id))) or 0,
        "quality_checks": db.scalar(select(func.count(QualityCheck.id))) or 0,
        "refunds": db.scalar(select(func.count(Refund.id))) or 0,
        "reviews": db.scalar(select(func.count(Rating.id))) or 0,
        "avg_rating": float(db.scalar(select(func.avg(Rating.score))) or 0),
        "ai_predictions": db.scalar(select(func.count(AiPrediction.id))) or 0,
        "notifications": db.scalar(select(func.count(Notification.id))) or 0,
        "trust_scores": db.scalar(select(func.count(TrustScore.id))) or 0,
        "avg_trust_score": float(db.scalar(select(func.avg(TrustScore.score))) or 0),
    }

    charts = {
        "registered_farmers": _series(db, User, User.role == "FARMER", 30),
        "registered_buyers": _series(db, User, User.role == "BUYER", 30),
        "registered_bulk_buyers": _series(db, User, User.role == "BULK_BUYER", 30),
        "active_listings": _series(db, CropListing, CropListing.status == "PUBLISHED", 30),
        "orders": _series(db, Order, None, 30),
        "completed_orders": _series(db, Order, Order.status == "COMPLETED", 30),
        "disputes": _series(db, Dispute, None, 30),
        "ai_predictions": _series(db, AiPrediction, None, 30),
        "crop_demand": _demand_chart(db),
    }

    volume_rows = db.execute(
        select(func.date(Payment.created_at), func.sum(Payment.amount))
        .where(Payment.status.in_(PAID_PAYMENT_STATUSES))
        .group_by(func.date(Payment.created_at))
    ).all()
    amounts = {str(day): float(value or 0) for day, value in volume_rows}
    today = date.today()
    charts["transaction_volume"] = []
    for offset in range(29, -1, -1):
        day = today - timedelta(days=offset)
        charts["transaction_volume"].append(
            {"date": day.isoformat(), "value": amounts.get(day.isoformat(), 0)}
        )

    return {"statistics": statistics, "charts": charts}


def _demand_chart(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Crop.name, func.sum(BuyerDemand.requested_quantity), func.count(BuyerDemand.id))
        .join(BuyerDemand.crop)
        .group_by(Crop.name)
        .order_by(func.sum(BuyerDemand.requested_quantity).desc())
        .limit(10)
    ).all()
    return [
        {
            "crop": name,
            "quantity": float(quantity or 0),
            "demands": count,
        }
        for name, quantity, count in rows
    ]


def _uu(user_id: UUID | None) -> str | None:
    return str(user_id) if user_id else None


@router.get("/users", summary="List users (sanitized, ADMIN only)")
def admin_users(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(select(User).order_by(User.created_at.desc()).limit(500)).scalars().all()
    return [
        {
            "user_id": str(user.id),
            "phone_e164": user.phone_e164,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "created_at": user.created_at,
        }
        for user in rows
    ]


@router.get("/listings", summary="List crop listings (ADMIN only)")
def admin_listings(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(CropListing, Crop.name, FarmerProfile.full_name)
        .join(Crop, Crop.id == CropListing.crop_id)
        .join(FarmerProfile, FarmerProfile.id == CropListing.farmer_id)
        .order_by(CropListing.created_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "listing_id": str(listing.id),
            "crop": crop_name,
            "farmer": farmer_name,
            "unit_price": float(listing.unit_price),
            "available_quantity": float(listing.available_quantity),
            "unit": listing.unit,
            "state": listing.state or listing.district,
            "status": listing.status,
            "created_at": listing.created_at,
        }
        for listing, crop_name, farmer_name in rows
    ]


@router.get("/demands", summary="List buyer demands (ADMIN only)")
def admin_demands(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(BuyerDemand, Crop.name, BuyerProfile.business_name, BuyerProfile.full_name)
        .join(Crop, Crop.id == BuyerDemand.crop_id)
        .join(BuyerProfile, BuyerProfile.id == BuyerDemand.buyer_id)
        .order_by(BuyerDemand.created_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "demand_id": str(demand.id),
            "crop": crop_name,
            "buyer": business_name or full_name,
            "quantity": float(demand.requested_quantity),
            "unit": demand.unit,
            "max_price": float(demand.target_max_price) if demand.target_max_price is not None else None,
            "location": demand.state or demand.district,
            "status": demand.status,
            "created_at": demand.created_at,
        }
        for demand, crop_name, business_name, full_name in rows
    ]


@router.get("/orders", summary="List orders (ADMIN only)")
def admin_orders(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(
            Order,
            FarmerProfile.full_name,
            BuyerProfile.business_name,
            BuyerProfile.full_name,
            ConsumerProfile,
            Crop.name,
        )
        .join(FarmerProfile, FarmerProfile.id == Order.farmer_id)
        .join(BuyerProfile, BuyerProfile.id == Order.buyer_id, isouter=True)
        .join(ConsumerProfile, ConsumerProfile.id == Order.consumer_id, isouter=True)
        .join(Crop, Crop.id == Order.crop_id, isouter=True)
        .order_by(Order.created_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "order_id": str(order.id),
            "order_number": order.public_order_number,
            "order_type": order.order_type,
            "crop": crop_name,
            "farmer": farmer_name,
            "buyer": business_name
            or full_name
            or (consumer.user.email or consumer.user.phone_e164 if consumer else None)
            or "Consumer",
            "status": order.status,
            "total_amount": float(order.total_amount),
            "source": order.source_type,
            "created_at": order.created_at,
        }
        for order, farmer_name, business_name, full_name, consumer, crop_name in rows
    ]


@router.get("/payments", summary="List payments (ADMIN only)")
def admin_payments(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Payment, Order.public_order_number)
        .join(Order, Order.id == Payment.order_id)
        .order_by(Payment.created_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "payment_id": str(payment.id),
            "order": order_number,
            "operation": payment.operation,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "status": payment.status,
            "provider": payment.provider,
            "failure_code": payment.failure_code,
            "created_at": payment.created_at,
        }
        for payment, order_number in rows
    ]


@router.get("/deliveries", summary="List deliveries (ADMIN only)")
def admin_deliveries(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Delivery, Order.public_order_number)
        .join(Order, Order.id == Delivery.order_id)
        .order_by(Delivery.created_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "delivery_id": str(delivery.id),
            "order": order_number,
            "status": delivery.status,
            "provider": delivery.provider,
            "destination": delivery.destination_snapshot,
            "picked_up_at": delivery.picked_up_at,
            "delivered_at": delivery.delivered_at,
            "created_at": delivery.created_at,
        }
        for delivery, order_number in rows
    ]


@router.get("/quality-checks", summary="List quality checks (ADMIN only)")
def admin_quality_checks(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(QualityCheck, Order.public_order_number, CropBatch.batch_code)
        .join(CropBatch, CropBatch.id == QualityCheck.batch_id)
        .join(Order, Order.id == CropBatch.order_id)
        .order_by(QualityCheck.checked_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "quality_check_id": str(qc.id),
            "order": order_number,
            "batch": batch_code,
            "result": qc.result,
            "grade": qc.quality_grade,
            "quantity_received": float(qc.quantity_received) if qc.quantity_received is not None else None,
            "damaged_quantity": float(qc.damaged_quantity) if qc.damaged_quantity is not None else None,
            "checked_at": qc.checked_at,
        }
        for qc, order_number, batch_code in rows
    ]


@router.get("/refunds", summary="List refunds (ADMIN only)")
def admin_refunds(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(select(Refund).order_by(Refund.created_at.desc()).limit(500)).scalars().all()
    return [
        {
            "refund_id": str(refund.id),
            "payment_id": str(refund.payment_id),
            "dispute_id": _uu(refund.dispute_id),
            "amount": float(refund.amount),
            "currency": refund.currency,
            "status": refund.status,
            "reason": refund.reason,
            "created_at": refund.created_at,
        }
        for refund in rows
    ]


@router.get("/reviews", summary="List reviews (ADMIN only)")
def admin_reviews(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Rating, Order.public_order_number, User.phone_e164)
        .join(Order, Order.id == Rating.order_id)
        .join(User, User.id == Rating.rater_id)
        .order_by(Rating.created_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "rating_id": str(rating.id),
            "order": order_number,
            "reviewer_phone": reviewer_phone,
            "score": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at,
        }
        for rating, order_number, reviewer_phone in rows
    ]


@router.get("/ai-predictions", summary="List AI prediction activity (ADMIN only)")
def admin_ai_predictions(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(AiPrediction, Crop.name)
        .join(Crop, Crop.id == AiPrediction.crop_id, isouter=True)
        .order_by(AiPrediction.created_at.desc())
        .limit(500)
    ).all()
    return [
        {
            "prediction_id": str(prediction.id),
            "prediction_type": prediction.prediction_type,
            "crop": crop_name,
            "location": prediction.location,
            "created_at": prediction.created_at,
        }
        for prediction, crop_name in rows
    ]


@router.get("/verification-requests", summary="List pending verification requests (ADMIN only)")
def admin_verification_requests(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    farmer_rows = (
        db.execute(
            select(FarmerProfile, User.phone_e164)
            .join(User, User.id == FarmerProfile.user_id)
            .where(FarmerProfile.verification_status == "PENDING")
            .order_by(FarmerProfile.created_at.asc())
        ).all()
    )
    buyer_rows = (
        db.execute(
            select(BuyerProfile, User.phone_e164)
            .join(User, User.id == BuyerProfile.user_id)
            .where(
                (BuyerProfile.verification_status == "PENDING")
                | (BuyerProfile.payment_verification_status == "PENDING")
            )
            .order_by(BuyerProfile.created_at.asc())
        ).all()
    )
    return {
        "farmers": [
            {
                "profile_id": str(profile.id),
                "user_id": str(profile.user_id),
                "full_name": profile.full_name,
                "phone_e164": phone,
                "verification_status": profile.verification_status,
                "created_at": profile.created_at,
            }
            for profile, phone in farmer_rows
        ],
        "buyers": [
            {
                "profile_id": str(profile.id),
                "user_id": str(profile.user_id),
                "full_name": profile.full_name,
                "business_name": profile.business_name,
                "buyer_type": profile.buyer_type,
                "phone_e164": phone,
                "verification_status": profile.verification_status,
                "payment_verification_status": profile.payment_verification_status,
                "created_at": profile.created_at,
            }
            for profile, phone in buyer_rows
        ],
    }