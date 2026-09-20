from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.bulk_buyer import service
from app.modules.bulk_buyer.schemas import (
    BulkBuyerDashboardResponse,
    BulkBuyerProfileCreate,
    BulkBuyerProfileResponse,
    BulkBuyerProfileUpdate,
)
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/bulk-buyer", tags=["bulk-buyer"])

BulkBuyerDependency = require_roles("BULK_BUYER")


@router.post(
    "/profile",
    response_model=BulkBuyerProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create the bulk buyer organization profile",
)
def create_profile(
    payload: BulkBuyerProfileCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(BulkBuyerDependency),
) -> BulkBuyerProfileResponse:
    return service.create_profile(db, _user.id, payload)


@router.put(
    "/profile",
    response_model=BulkBuyerProfileResponse,
    summary="Update the bulk buyer organization profile",
)
def update_profile(
    payload: BulkBuyerProfileUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(BulkBuyerDependency),
) -> BulkBuyerProfileResponse:
    return service.update_profile(db, _user.id, payload)


@router.get(
    "/profile",
    response_model=BulkBuyerProfileResponse,
    summary="Return the bulk buyer organization profile",
)
def get_profile(
    db: Session = Depends(get_db),
    _user: User = Depends(BulkBuyerDependency),
) -> BulkBuyerProfileResponse:
    return service.get_profile(db, _user.id)


@router.get(
    "/dashboard",
    response_model=BulkBuyerDashboardResponse,
    summary="Return the bulk buyer enterprise dashboard",
)
def bulk_buyer_dashboard(
    db: Session = Depends(get_db),
    _user: User = Depends(BulkBuyerDependency),
) -> BulkBuyerDashboardResponse:
    return service.get_dashboard(db, _user)