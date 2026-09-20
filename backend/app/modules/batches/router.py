"""Phase 13 - Batch and Quality router."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.batches import service
from app.modules.batches.schemas import (
    BatchDetailResponse,
    BatchPrepareCreate,
    BatchSummaryResponse,
    QualityCheckCreate,
    QualityCheckResponse,
)
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/batches", tags=["batches"])

PartyDependency = require_roles("FARMER", "BUYER", "CONSUMER", "ADMIN", "BULK_BUYER")
FarmerDependency = require_roles("FARMER", "ADMIN")


@router.get(
    "",
    response_model=list[BatchSummaryResponse],
    summary="List batches (farmer's own batches)",
)
def list_batches(
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[BatchSummaryResponse]:
    return service.list_farmer_batches(db, _user)


@router.get(
    "/orders/{order_id}",
    response_model=list[BatchSummaryResponse],
    summary="List batches associated with an order",
)
def order_batches(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[BatchSummaryResponse]:
    return service.list_order_batches(db, _user, order_id)


@router.post(
    "/orders/{order_id}/prepare",
    response_model=BatchDetailResponse,
    summary="Prepare a batch for a confirmed order (marks it ready for inspection)",
)
def prepare_batch(
    order_id: UUID,
    payload: BatchPrepareCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(FarmerDependency),
) -> BatchDetailResponse:
    return service.prepare_batch(db, _user, order_id, payload)


@router.get(
    "/{batch_id}",
    response_model=BatchDetailResponse,
    summary="Get batch details and full quality-check history",
)
def get_batch(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> BatchDetailResponse:
    return service.get_batch(db, _user, batch_id)


@router.get(
    "/{batch_id}/quality-checks",
    response_model=list[QualityCheckResponse],
    summary="List quality checks recorded for a batch",
)
def quality_checks(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[QualityCheckResponse]:
    return service.list_quality_checks(db, _user, batch_id)


@router.post(
    "/{batch_id}/inspect",
    response_model=BatchDetailResponse,
    summary="Record a quality inspection (PASS or PROBLEM) for a batch",
)
def record_quality_check(
    batch_id: UUID,
    payload: QualityCheckCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> BatchDetailResponse:
    return service.record_quality_check(db, _user, batch_id, payload)


@router.post(
    "/{batch_id}/pickup",
    response_model=BatchDetailResponse,
    summary="Mark a quality-passed batch as picked up",
)
def mark_pickup(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(FarmerDependency),
) -> BatchDetailResponse:
    return service.mark_pickup(db, _user, batch_id)


@router.post(
    "/{batch_id}/deliver",
    response_model=BatchDetailResponse,
    summary="Mark a picked-up batch as delivered",
)
def mark_delivered(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(FarmerDependency),
) -> BatchDetailResponse:
    return service.mark_delivered(db, _user, batch_id)


@router.post(
    "/{batch_id}/dispute",
    response_model=BatchDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Raise a dispute on the batch (also disputes the order)",
)
def dispute_batch(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> BatchDetailResponse:
    return service.dispute_batch(db, _user, batch_id)