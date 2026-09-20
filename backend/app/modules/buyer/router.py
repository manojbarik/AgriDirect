from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.buyer import service
from app.modules.buyer.schemas import (
    BuyerDashboardResponse,
    BuyerDemandCreate,
    BuyerDemandResponse,
    BuyerDemandUpdate,
    BuyerLocationUpdate,
    BuyerProfileCreate,
    BuyerProfileResponse,
    BuyerProfileUpdate,
    BuyerStatusResponse,
    BuyerVerificationSubmitResponse,
)
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/buyer", tags=["buyer"])

BuyerDependency = require_roles("BUYER", "BULK_BUYER")


@router.post(
    "/profile",
    response_model=BuyerProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create the buyer's profile with buyer type",
)
def create_profile(
    payload: BuyerProfileCreate,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerProfileResponse:
    return service.create_profile(db, _buyer.id, payload)


@router.put(
    "/profile",
    response_model=BuyerProfileResponse,
    summary="Update the buyer's basic information",
)
def update_profile(
    payload: BuyerProfileUpdate,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerProfileResponse:
    return service.update_profile(db, _buyer.id, payload)


@router.get(
    "/profile",
    response_model=BuyerProfileResponse,
    summary="Return the buyer's profile",
)
def get_profile(
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerProfileResponse:
    return service.get_profile(db, _buyer.id)


@router.put(
    "/location",
    response_model=BuyerProfileResponse,
    summary="Update the buyer's location",
)
def update_location(
    payload: BuyerLocationUpdate,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerProfileResponse:
    return service.update_location(db, _buyer.id, payload)


@router.get(
    "/status",
    response_model=BuyerStatusResponse,
    summary="Return buyer onboarding and verification status",
)
def buyer_status(
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerStatusResponse:
    return service.get_status(db, _buyer.id)


@router.post(
    "/verification/identity/submit",
    response_model=BuyerVerificationSubmitResponse,
    summary="Submit the buyer data for mock identity/business verification",
)
def submit_identity_verification(
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerVerificationSubmitResponse:
    return service.submit_identity_verification(db, _buyer.id)


@router.post(
    "/verification/payment/submit",
    response_model=BuyerVerificationSubmitResponse,
    summary="Submit the buyer data for mock payment verification",
)
def submit_payment_verification(
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerVerificationSubmitResponse:
    return service.submit_payment_verification(db, _buyer.id)


@router.post(
    "/demands",
    response_model=BuyerDemandResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a buyer demand (starts as DRAFT)",
)
def create_demand(
    payload: BuyerDemandCreate,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerDemandResponse:
    return service.create_demand(db, _buyer.id, payload)


@router.get(
    "/demands",
    response_model=list[BuyerDemandResponse],
    summary="List the buyer's demands, optionally filtered by status",
)
def list_demands(
    status: str | None = None,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> list[BuyerDemandResponse]:
    return service.list_demands(db, _buyer.id, status)


@router.get(
    "/demands/{demand_id}",
    response_model=BuyerDemandResponse,
    summary="Return one of the buyer's demands",
)
def get_demand(
    demand_id: UUID,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerDemandResponse:
    return service.get_demand(db, _buyer.id, demand_id)


@router.put(
    "/demands/{demand_id}",
    response_model=BuyerDemandResponse,
    summary="Update one of the buyer's demands",
)
def update_demand(
    demand_id: UUID,
    payload: BuyerDemandUpdate,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerDemandResponse:
    return service.update_demand(db, _buyer.id, demand_id, payload)


@router.delete(
    "/demands/{demand_id}",
    response_model=BuyerDemandResponse,
    summary="Cancel one of the buyer's demands",
)
def cancel_demand(
    demand_id: UUID,
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerDemandResponse:
    return service.cancel_demand(db, _buyer.id, demand_id)  # noqa: D401


@router.get(
    "/dashboard",
    response_model=BuyerDashboardResponse,
    summary="Return buyer dashboard statistics",
)
def buyer_dashboard(
    db: Session = Depends(get_db),
    _buyer: User = Depends(BuyerDependency),
) -> BuyerDashboardResponse:
    return service.get_dashboard(db, _buyer.id)
