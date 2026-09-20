"""Phase 13 - Batch and Quality service.

Every fulfilled order is associated with a crop batch. The batch tracks its
preparation, quality inspection (PASS/PROBLEM), pickup and delivery status.
Authorized parties (batch farmer, order buyer) and admins record quality
checks. A problem batch can raise a dispute on the order.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Crop, CropBatch, Order
from app.db.models.people import BuyerProfile, ConsumerProfile, FarmerProfile, User
from app.db.models.transaction import QualityCheck
from app.modules.batches.schemas import (
    BatchDetailResponse,
    BatchPrepareCreate,
    BatchSummaryResponse,
    QualityCheckCreate,
    QualityCheckResponse,
)
from app.modules.notifications import service as notifications_service
from app.modules.orders import service as orders_service


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _get_order(db: Session, order_id: UUID) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise _not_found("Order not found")
    return order


def _get_batch(db: Session, batch_id: UUID) -> CropBatch:
    batch = db.get(CropBatch, batch_id)
    if batch is None:
        raise _not_found("Batch not found")
    return batch


def _farmer_id(db: Session, user: User) -> UUID | None:
    if user.role != "FARMER":
        return None
    profile = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    return profile.id if profile is not None else None


def _is_buyer(db: Session, user: User, order: Order) -> bool:
    if user.role == "BUYER":
        profile = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        return profile is not None and profile.id == order.buyer_id
    if user.role == "CONSUMER":
        if order.order_type != "B2C":
            return False
        profile = db.scalar(select(ConsumerProfile).where(ConsumerProfile.user_id == user.id))
        return profile is not None and profile.id == order.consumer_id
    return False


def _require_order_party(db: Session, user: User, order: Order) -> None:
    if user.role == "ADMIN":
        return
    farmer_id = _farmer_id(db, user)
    if farmer_id is not None and farmer_id == order.farmer_id:
        return
    if _is_buyer(db, user, order):
        return
    raise _not_found("Order not found")


def _require_batch_party(db: Session, user: User, batch: CropBatch) -> Order:
    if user.role == "ADMIN":
        return _get_order(db, batch.order_id)
    farmer_id = _farmer_id(db, user)
    if farmer_id is not None and farmer_id == batch.farmer_id:
        return _get_order(db, batch.order_id)
    order = _get_order(db, batch.order_id)
    if _is_buyer(db, user, order):
        return order
    raise _not_found("Batch not found")


def _actor_role(user: User) -> str:
    return "FARMER" if user.role == "FARMER" else "SYSTEM"


def _photos(batch: CropBatch) -> list[str]:
    if not batch.photo_references:
        return []
    try:
        value = json.loads(batch.photo_references)
        return value if isinstance(value, list) else []
    except (TypeError, ValueError):
        return []


def _summary(db: Session, batch: CropBatch) -> BatchSummaryResponse:
    crop = db.get(Crop, batch.crop_id) if batch.crop_id else None
    return BatchSummaryResponse(
        id=str(batch.id),
        order_id=str(batch.order_id),
        listing_id=str(batch.listing_id) if batch.listing_id else None,
        crop_id=str(batch.crop_id) if batch.crop_id else None,
        farmer_id=str(batch.farmer_id) if batch.farmer_id else None,
        crop_name=crop.name if crop else None,
        crop_variety=crop.variety if crop else None,
        batch_code=batch.batch_code,
        qr_identifier=batch.qr_identifier or f"AGRI:{batch.batch_code}:{batch.id}",
        prepared_quantity=batch.prepared_quantity,
        preparation_notes=batch.preparation_notes,
        packaging_details=batch.packaging_details,
        harvest_date=batch.harvest_date,
        quality_grade=batch.quality_grade,
        photo_references=_photos(batch),
        prepared_at=batch.prepared_at,
        status=batch.status,
        preparation_status=batch.preparation_status,
        pickup_status=batch.pickup_status,
        delivery_status=batch.delivery_status,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
    )


def _quality_response(check: QualityCheck) -> QualityCheckResponse:
    return QualityCheckResponse(
        id=str(check.id),
        batch_id=str(check.batch_id),
        inspector_id=str(check.inspector_id) if check.inspector_id else None,
        result=check.result,
        quality_grade=check.quality_grade,
        quantity_received=check.quantity_received,
        damaged_quantity=check.damaged_quantity,
        notes=check.notes,
        evidence_reference=check.evidence_reference,
        checked_at=check.checked_at,
        created_at=check.created_at,
    )


def _actions(batch: CropBatch, order: Order, role: str) -> list[str]:
    actions: list[str] = []
    if role == "FARMER" or role == "ADMIN":
        if batch.status in ("PREPARING", "PREPARED"):
            actions.append("prepare")
        if batch.status in ("PREPARED", "PASSED", "PROBLEM"):
            actions.append("inspect")
        if batch.status == "PASSED" and batch.pickup_status == "NOT_STARTED":
            actions.append("pickup")
        if batch.pickup_status == "PICKED_UP" and batch.delivery_status == "NOT_STARTED":
            actions.append("deliver")
        if batch.status != "DISPUTED" and order.status not in ("CANCELLED", "COMPLETED"):
            actions.append("dispute")
    if role == "BUYER" or role == "ADMIN":
        if batch.status in ("PREPARED", "PASSED", "PROBLEM"):
            actions.append("inspect")
        if batch.status != "DISPUTED" and order.status not in ("CANCELLED", "COMPLETED"):
            actions.append("dispute")
    return list(dict.fromkeys(actions))


def _detail(db: Session, batch: CropBatch, role: str) -> BatchDetailResponse:
    order = _get_order(db, batch.order_id)
    summary = _summary(db, batch)
    checks = db.scalars(
        select(QualityCheck)
        .where(QualityCheck.batch_id == batch.id)
        .order_by(QualityCheck.checked_at.desc())
    ).all()
    return BatchDetailResponse(
        **summary.model_dump(),
        quality_checks=[_quality_response(check) for check in checks],
        next_allowed_actions=_actions(batch, order, role),
    )


def list_farmer_batches(db: Session, user: User) -> list[BatchSummaryResponse]:
    farmer_id = _farmer_id(db, user)
    if user.role != "ADMIN" and farmer_id is None:
        raise _bad_request("Only farmers and admins can list batches")
    stmt = select(CropBatch).order_by(CropBatch.created_at.desc())
    if user.role != "ADMIN":
        stmt = stmt.where(CropBatch.farmer_id == farmer_id)
    batches = db.scalars(stmt).all()
    return [_summary(db, batch) for batch in batches]


def list_order_batches(
    db: Session, user: User, order_id: UUID
) -> list[BatchSummaryResponse]:
    order = _get_order(db, order_id)
    _require_order_party(db, user, order)
    batches = db.scalars(
        select(CropBatch).where(CropBatch.order_id == order.id)
    ).all()
    return [_summary(db, batch) for batch in batches]


def get_batch(db: Session, user: User, batch_id: UUID) -> BatchDetailResponse:
    batch = _get_batch(db, batch_id)
    _require_batch_party(db, user, batch)
    return _detail(db, batch, user.role)


def prepare_batch(
    db: Session, user: User, order_id: UUID, payload: BatchPrepareCreate
) -> BatchDetailResponse:
    order = _get_order(db, order_id)
    farmer_id = _farmer_id(db, user)
    if user.role != "ADMIN" and farmer_id != order.farmer_id:
        raise _not_found("Order not found")
    if order.status not in ("CONFIRMED", "PREPARING"):
        raise _conflict("Batch preparation is only allowed on confirmed orders")

    batch = db.scalar(select(CropBatch).where(CropBatch.order_id == order.id))
    if batch is None:
        quantity = payload.prepared_quantity or order.agreed_quantity or order.requested_quantity
        batch = CropBatch(
            order_id=order.id,
            listing_id=order.listing_id,
            crop_id=order.crop_id,
            farmer_id=order.farmer_id if user.role != "ADMIN" else farmer_id,
            batch_code=f"BATCH-{order.public_order_number}",
            prepared_quantity=quantity,
            status="PREPARING",
            preparation_status="PREPARING",
        )
        db.add(batch)
        db.flush()
        batch.qr_identifier = f"AGRI:{batch.batch_code}:{batch.id}"

    if payload.prepared_quantity is not None:
        batch.prepared_quantity = payload.prepared_quantity
    if payload.harvest_date is not None:
        batch.harvest_date = payload.harvest_date
    if payload.quality_grade is not None:
        batch.quality_grade = payload.quality_grade
    if payload.preparation_notes is not None:
        batch.preparation_notes = payload.preparation_notes
    if payload.packaging_details is not None:
        batch.packaging_details = payload.packaging_details
    if payload.photo_references:
        batch.photo_references = json.dumps(payload.photo_references)

    batch.prepared_at = datetime.now(timezone.utc)
    batch.status = "PREPARED"
    batch.preparation_status = "PREPARED"

    db.flush()
    if not batch.qr_identifier:
        batch.qr_identifier = f"AGRI:{batch.batch_code}:{batch.id}"
    if order.status == "CONFIRMED":
        orders_service.apply_status_transition(
            db, order, "PREPARING", _actor_role(user), note="Batch prepared"
        )
    db.commit()
    db.refresh(batch)
    _notify_batch_ready(db, order)
    return _detail(db, batch, user.role)


def _notify_batch_ready(db: Session, order: Order) -> None:
    """In-app notify the purchaser when the batch is prepared and ready for pickup."""
    try:
        purchaser = None
        if order.order_type == "B2C":
            purchaser = db.get(ConsumerProfile, order.consumer_id) if order.consumer_id else None
        else:
            purchaser = db.get(BuyerProfile, order.buyer_id) if order.buyer_id else None
        if purchaser is None:
            return
        notifications_service.emit(
            db,
            "batch_ready",
            user_id=purchaser.user_id,
            order=order.public_order_number,
        )
        db.commit()
    except Exception:  # pragma: no cover - best effort, never break batch flow
        pass


def list_quality_checks(
    db: Session, user: User, batch_id: UUID
) -> list[QualityCheckResponse]:
    batch = _get_batch(db, batch_id)
    _require_batch_party(db, user, batch)
    checks = db.scalars(
        select(QualityCheck)
        .where(QualityCheck.batch_id == batch.id)
        .order_by(QualityCheck.checked_at.desc())
    ).all()
    return [_quality_response(check) for check in checks]


def record_quality_check(
    db: Session, user: User, batch_id: UUID, payload: QualityCheckCreate
) -> BatchDetailResponse:
    batch = _get_batch(db, batch_id)
    _require_batch_party(db, user, batch)
    if batch.status not in ("PREPARED", "INSPECTING", "PASSED", "PROBLEM"):
        raise _conflict(
            "Quality inspection is only allowed once the batch is prepared"
        )

    check = QualityCheck(
        batch_id=batch.id,
        inspector_id=user.id,
        result=payload.result,
        quality_grade=payload.quality_grade,
        quantity_received=payload.quantity_received,
        damaged_quantity=payload.damaged_quantity,
        notes=payload.notes,
        evidence_reference=payload.evidence_reference,
        checked_at=payload.checked_at or datetime.now(timezone.utc),
    )
    db.add(check)

    if payload.quality_grade is not None:
        batch.quality_grade = payload.quality_grade
    batch.status = "PASSED" if payload.result == "PASS" else "PROBLEM"
    db.commit()
    db.refresh(batch)
    return _detail(db, batch, user.role)


def mark_pickup(db: Session, user: User, batch_id: UUID) -> BatchDetailResponse:
    batch = _get_batch(db, batch_id)
    order = _require_batch_party(db, user, batch)
    if user.role not in ("FARMER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the farmer can pick up the batch",
        )
    if batch.status != "PASSED":
        raise _conflict("Only quality-passed batches can be picked up")
    batch.pickup_status = "PICKED_UP"
    if order.status == "READY_FOR_PICKUP":
        orders_service.apply_status_transition(
            db, order, "IN_TRANSIT", _actor_role(user), note="Batch picked up"
        )
    db.commit()
    db.refresh(batch)
    return _detail(db, batch, user.role)


def mark_delivered(db: Session, user: User, batch_id: UUID) -> BatchDetailResponse:
    batch = _get_batch(db, batch_id)
    order = _require_batch_party(db, user, batch)
    if user.role not in ("FARMER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the farmer can mark the batch as delivered",
        )
    if batch.pickup_status != "PICKED_UP":
        raise _conflict("The batch must be picked up before it can be delivered")
    batch.delivery_status = "DELIVERED"
    batch.status = "DELIVERED"
    if order.status == "IN_TRANSIT":
        orders_service.apply_status_transition(
            db, order, "DELIVERED", _actor_role(user), note="Batch delivered"
        )
    db.commit()
    db.refresh(batch)
    return _detail(db, batch, user.role)


def dispute_batch(db: Session, user: User, batch_id: UUID) -> BatchDetailResponse:
    batch = _get_batch(db, batch_id)
    _require_batch_party(db, user, batch)
    if batch.status == "DISPUTED":
        raise _conflict("Batch is already disputed")
    batch.status = "DISPUTED"
    db.commit()
    db.refresh(batch)
    return _detail(db, batch, user.role)