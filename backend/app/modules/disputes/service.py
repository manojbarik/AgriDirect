"""Phase 14 - Dispute, refund, and replacement service.

Workflow:
1. A BUYER raises a dispute against a disputable order. The order moves to
   DISPUTED with its pre-dispute status recorded.
2. An ADMIN reviews the dispute in a queue: the decision is always explicit
   (no auto-approval). REFUND executes captured-payment refunds and moves the
   order to REFUNDED; REPLACEMENT approves a replacement that an admin later
   marks COMPLETED, moving the order to REPLACED; REJECT restores the order to
   its pre-dispute status.
3. Every status change on the dispute, refund, or replacement is written to
   dispute_status_events with the actor, timestamp, reason, and previous/new
   status so the trail is fully auditable.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Crop, Order
from app.db.models.people import BuyerProfile, FarmerProfile, User
from app.db.models.transaction import (
    Dispute,
    DisputeStatusEvent,
    Payment,
    Replacement,
)
from app.modules.disputes.schemas import (
    DisputeCreate,
    DisputeEventResponse,
    DisputeResponse,
)
from app.modules.notifications import service as notifications_service
from app.modules.orders import service as orders_service
from app.modules.payments import service as payments_service

RESOLVABLE_STATUSES = ("OPEN", "UNDER_REVIEW")
DECISIONS = ("REFUND", "REPLACEMENT", "REJECT")


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _get_dispute(db: Session, dispute_id: UUID) -> Dispute:
    dispute = db.get(Dispute, dispute_id)
    if dispute is None:
        raise _not_found("Dispute not found")
    return dispute


def _get_order(db: Session, order_id: UUID) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise _not_found("Order not found")
    return order


def _buyer_profile(db: Session, user: User) -> BuyerProfile:
    profile = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
    if profile is None:
        raise _not_found("Complete your buyer profile before continuing")
    return profile


def _farmer_profile(db: Session, user: User) -> FarmerProfile:
    profile = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    if profile is None:
        raise _not_found("Complete your farmer profile before continuing")
    return profile


def _require_buyer_of(db: Session, user: User, order: Order) -> BuyerProfile:
    profile = _buyer_profile(db, user)
    if profile.id != order.buyer_id:
        raise _not_found("Order not found")
    return profile


def _require_party(db: Session, user: User, order: Order) -> None:
    buyer = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
    farmer = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    is_buyer = buyer is not None and buyer.id == order.buyer_id
    is_farmer = farmer is not None and farmer.id == order.farmer_id
    if not (is_buyer or is_farmer or user.role == "ADMIN"):
        raise _not_found("Order not found")


def _log(
    db: Session,
    dispute: Dispute,
    entity_type: str,
    entity_id: str | None,
    from_status: str | None,
    to_status: str,
    actor: User,
    reason: str | None,
) -> None:
    db.add(
        DisputeStatusEvent(
            dispute_id=dispute.id,
            entity_type=entity_type,
            entity_id=entity_id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=actor.id,
            changed_by_role=actor.role,
            reason=reason,
        )
    )


def _active_dispute(db: Session, order_id: UUID) -> Dispute | None:
    return db.scalar(
        select(Dispute).where(
            Dispute.order_id == order_id,
            Dispute.status.in_(("OPEN", "UNDER_REVIEW", "REFUND_APPROVED", "REPLACEMENT_APPROVED")),
        )
    )


def _replacement_for(db: Session, dispute: Dispute) -> Replacement | None:
    return db.scalar(
        select(Replacement)
        .where(Replacement.dispute_id == dispute.id)
        .order_by(Replacement.created_at.desc())
    )


def create_dispute(db: Session, user: User, payload: DisputeCreate) -> DisputeResponse:
    if user.role != "BUYER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only buyers can raise a dispute",
        )
    order = _get_order(db, payload.order_id)
    _require_buyer_of(db, user, order)
    return _create_dispute(db, order, user, payload)


def _create_dispute(db: Session, order: Order, user: User, payload: DisputeCreate) -> DisputeResponse:
    if order.status not in orders_service.DISPUTABLE_STATUSES:
        raise _conflict(f"An order in {order.status} status cannot be disputed")
    if _active_dispute(db, order.id) is not None:
        raise _conflict("An active dispute already exists for this order")

    dispute = Dispute(
        order_id=order.id,
        opened_by_id=user.id,
        category=payload.category,
        description=payload.description,
        requested_resolution=payload.requested_resolution,
        status="OPEN",
    )
    db.add(dispute)
    db.flush()
    _log(db, dispute, "DISPUTE", str(dispute.id), None, "OPEN", user, "Dispute opened")

    orders_service.mark_order_disputed(
        db, order, note=f"Dispute opened: {payload.category} ({user.role})"
    )
    db.commit()
    db.refresh(dispute)
    _notify_dispute_opened(db, order)
    return _response(db, dispute)


def _notify_dispute_opened(db: Session, order: Order) -> None:
    """In-app notify both parties that the order was placed under dispute."""
    try:
        farmer = db.get(FarmerProfile, order.farmer_id) if order.farmer_id else None
        buyer = db.get(BuyerProfile, order.buyer_id) if order.buyer_id else None
        for recipient in (farmer.user_id if farmer else None, buyer.user_id if buyer else None):
            if recipient is None:
                continue
            notifications_service.emit(
                db,
                "dispute",
                user_id=recipient,
                order=order.public_order_number,
            )
        db.commit()
    except Exception:  # pragma: no cover - best effort, never break dispute creation
        pass


def list_order_disputes(db: Session, user: User, order_id: UUID) -> list[DisputeResponse]:
    order = _get_order(db, order_id)
    _require_party(db, user, order)
    disputes = db.scalars(
        select(Dispute).where(Dispute.order_id == order.id).order_by(Dispute.created_at.desc())
    ).all()
    return [_response(db, dispute) for dispute in disputes]


def list_my_disputes(db: Session, user: User) -> list[DisputeResponse]:
    order_ids = select(Order.id)
    if user.role == "BUYER":
        profile = _buyer_profile(db, user)
        order_ids = order_ids.where(Order.buyer_id == profile.id)
    elif user.role == "FARMER":
        profile = _farmer_profile(db, user)
        order_ids = order_ids.where(Order.farmer_id == profile.id)
    else:
        raise _not_found("No disputes to list")
    disputes = db.scalars(
        select(Dispute)
        .where(Dispute.order_id.in_(order_ids))
        .order_by(Dispute.created_at.desc())
    ).all()
    return [_response(db, dispute) for dispute in disputes]


def get_dispute(db: Session, user: User, dispute_id: UUID) -> DisputeResponse:
    dispute = _get_dispute(db, dispute_id)
    order = _get_order(db, dispute.order_id)
    _require_party(db, user, order)
    return _response(db, dispute)


def list_admin_disputes(db: Session, user: User, status_filter: str | None) -> list[DisputeResponse]:
    stmt = select(Dispute)
    if status_filter:
        stmt = stmt.where(Dispute.status == status_filter)
    disputes = db.scalars(stmt.order_by(Dispute.created_at.desc())).all()
    return [_response(db, dispute) for dispute in disputes]


def _require_resolvable(dispute: Dispute) -> None:
    if dispute.status not in RESOLVABLE_STATUSES:
        raise _conflict(f"Dispute is already resolved ({dispute.status})")


def review_dispute(
    db: Session, admin: User, dispute_id: UUID, decision: str, reason: str
) -> DisputeResponse:
    if admin.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can review and decide disputes",
        )
    if decision not in DECISIONS:
        raise _bad_request(f"Decision must be one of {', '.join(DECISIONS)}")

    dispute = _get_dispute(db, dispute_id)
    _require_resolvable(dispute)
    order = _get_order(db, dispute.order_id)

    if dispute.status == "OPEN":
        _log(db, dispute, "DISPUTE", str(dispute.id), "OPEN", "UNDER_REVIEW", admin, "Admin began review")
        dispute.status = "UNDER_REVIEW"
        db.flush()

    if decision == "REJECT":
        dispute.status = "REJECTED"
        dispute.resolution = "REJECTED"
        dispute.resolved_at = datetime.now(timezone.utc)
        _log(db, dispute, "DISPUTE", str(dispute.id), "UNDER_REVIEW", "REJECTED", admin, reason)
        orders_service.restore_from_dispute(db, order, reason=f"Dispute rejected: {reason}")
        db.flush()
    elif decision == "REFUND":
        refundable = db.scalars(
            select(Payment).where(
                Payment.order_id == order.id,
                Payment.status.in_(("PAID", "PARTIALLY_REFUNDED")),
            )
        ).all()
        if not refundable:
            raise _conflict("There are no captured payments to refund for this order")
        dispute.status = "REFUND_APPROVED"
        dispute.resolution = "REFUND"
        _log(db, dispute, "DISPUTE", str(dispute.id), "UNDER_REVIEW", "REFUND_APPROVED", admin, reason)
        already_refunded = sum((p.refunded_amount or Decimal("0")) for p in refundable)
        if already_refunded >= sum(p.amount for p in refundable):
            raise _conflict("Payments for this order have already been fully refunded")
        for payment in refundable:
            refund = payments_service.refund_payment(
                db, admin, payment.id, None, reason or "Refund approved in dispute review", dispute.id
            )
            _log(
                db, dispute, "REFUND", str(refund.id), "PENDING", refund.status, admin,
                f"Refunded {refund.amount} {refund.currency}",
            )
        orders_service.apply_status_transition(
            db, order, "REFUNDED", "SYSTEM", note="Refund approved by admin"
        )
        order.pre_dispute_status = None
        db.flush()
        _log(db, dispute, "DISPUTE", str(dispute.id), "REFUND_APPROVED", "CLOSED", admin, reason)
        _close_dispute(db, dispute, admin)
    else:  # REPLACEMENT
        dispute.status = "REPLACEMENT_APPROVED"
        dispute.resolution = "REPLACEMENT"
        _log(db, dispute, "DISPUTE", str(dispute.id), "UNDER_REVIEW", "REPLACEMENT_APPROVED", admin, reason)
        replacement = _replacement_for(db, dispute)
        if replacement is None:
            replacement = Replacement(
                dispute_id=dispute.id,
                status="REQUESTED",
                reason=reason,
            )
            db.add(replacement)
            db.flush()
        _log(db, dispute, "REPLACEMENT", str(replacement.id), None, replacement.status, admin, reason)

    db.commit()
    db.refresh(dispute)
    return _response(db, dispute)


def complete_replacement(
    db: Session, admin: User, replacement_id: UUID, reason: str | None
) -> DisputeResponse:
    if admin.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can complete a replacement",
        )
    replacement = db.get(Replacement, replacement_id)
    if replacement is None:
        raise _not_found("Replacement not found")
    if replacement.status != "REQUESTED":
        raise _conflict(f"Replacement cannot be completed in {replacement.status} status")
    dispute = _get_dispute(db, replacement.dispute_id)
    if dispute.status != "REPLACEMENT_APPROVED":
        raise _conflict("Replacement can only be completed while the dispute is approved")

    now = datetime.now(timezone.utc)
    _log(
        db, dispute, "REPLACEMENT", str(replacement.id),
        replacement.status, "COMPLETED", admin, reason,
    )
    replacement.status = "COMPLETED"
    replacement.completed_at = now

    order = _get_order(db, dispute.order_id)
    orders_service.apply_status_transition(
        db, order, "REPLACED", "SYSTEM", note="Replacement completed by admin"
    )
    order.pre_dispute_status = None
    _log(db, dispute, "DISPUTE", str(dispute.id), "REPLACEMENT_APPROVED", "CLOSED", admin, reason)
    _close_dispute(db, dispute, admin)

    db.commit()
    db.refresh(dispute)
    return _response(db, dispute)


def _close_dispute(db: Session, dispute: Dispute, admin: User) -> None:
    dispute.status = "CLOSED"
    dispute.resolved_at = datetime.now(timezone.utc)


def _response(db: Session, dispute: Dispute) -> DisputeResponse:
    order = _get_order(db, dispute.order_id)
    farmer = db.get(FarmerProfile, order.farmer_id)
    crop = db.get(Crop, order.crop_id) if order.crop_id else None
    replacement = _replacement_for(db, dispute)
    return DisputeResponse(
        id=str(dispute.id),
        order_id=str(order.id),
        order_public_number=order.public_order_number,
        opened_by_id=str(dispute.opened_by_id),
        opened_by_name=_user_display_name(db, dispute.opened_by),
        farmer_name=farmer.full_name if farmer else "",
        crop_name=crop.name if crop else None,
        total_amount=str(order.total_amount),
        currency=order.currency,
        category=dispute.category,
        description=dispute.description,
        requested_resolution=dispute.requested_resolution,
        resolution=dispute.resolution,
        status=dispute.status,
        deadline=dispute.deadline,
        resolved_at=dispute.resolved_at,
        replacement_status=replacement.status if replacement else None,
        replacement_id=str(replacement.id) if replacement else None,
        events=[_event_response(e) for e in dispute.events],
        created_at=dispute.created_at,
        updated_at=dispute.updated_at,
    )


def _user_display_name(db: Session, user: User | None) -> str:
    if user is None:
        return ""
    if user.role in ("FARMER", "BUYER"):
        profile = db.scalar(
            select(BuyerProfile).where(BuyerProfile.user_id == user.id)
        ) or db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
        if profile is not None:
            return profile.full_name
    return user.phone_e164


def _event_response(event: DisputeStatusEvent) -> DisputeEventResponse:
    return DisputeEventResponse(
        id=str(event.id),
        entity_type=event.entity_type,
        entity_id=event.entity_id,
        from_status=event.from_status,
        to_status=event.to_status,
        changed_by_id=str(event.changed_by_id) if event.changed_by_id else None,
        changed_by_role=event.changed_by_role,
        reason=event.reason,
        created_at=event.created_at,
    )