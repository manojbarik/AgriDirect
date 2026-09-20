from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.disputes import service
from app.modules.disputes.schemas import (
    DisputeCreate,
    DisputeResponse,
    DisputeReviewCreate,
)
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/disputes", tags=["disputes"])

BuyerDependency = require_roles("BUYER", "BULK_BUYER")
PartyDependency = require_roles("BUYER", "FARMER", "BULK_BUYER")
AdminDependency = require_roles("ADMIN")


@router.get(
    "",
    response_model=list[DisputeResponse],
    summary="List disputes I am involved in",
)
def my_disputes(
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[DisputeResponse]:
    return service.list_my_disputes(db, _user)


@router.post(
    "",
    response_model=DisputeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Raise a dispute on a disputable order",
)
def open_dispute(
    payload: DisputeCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(BuyerDependency),
) -> DisputeResponse:
    return service.create_dispute(db, _user, payload)


@router.get(
    "/{dispute_id}",
    response_model=DisputeResponse,
    summary="Get a dispute and its audit trail",
)
def get_dispute(
    dispute_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> DisputeResponse:
    return service.get_dispute(db, _user, dispute_id)


@router.get(
    "/orders/{order_id}",
    response_model=list[DisputeResponse],
    summary="List disputes for an order (parties)",
)
def order_disputes(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[DisputeResponse]:
    return service.list_order_disputes(db, _user, order_id)


@router.get(
    "/admin/list",
    response_model=list[DisputeResponse],
    summary="Admin dispute queue (filter by status)",
)
def admin_disputes(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(AdminDependency),
) -> list[DisputeResponse]:
    return service.list_admin_disputes(db, _user, status_filter)


@router.post(
    "/admin/{dispute_id}/review",
    response_model=DisputeResponse,
    summary="Admin decision on a dispute (REFUND / REPLACEMENT / REJECT)",
)
def review_dispute(
    dispute_id: UUID,
    payload: DisputeReviewCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(AdminDependency),
) -> DisputeResponse:
    return service.review_dispute(db, _user, dispute_id, payload.decision, payload.reason)


@router.post(
    "/admin/replacements/{replacement_id}/complete",
    response_model=DisputeResponse,
    summary="Admin marks an approved replacement as completed",
)
def complete_replacement(
    replacement_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(AdminDependency),
) -> DisputeResponse:
    return service.complete_replacement(db, _user, replacement_id, None)