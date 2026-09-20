from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.farmer import service
from app.modules.farmer.schemas import (
    CropListingCreate,
    CropListingResponse,
    CropListingUpdate,
    CropPlanCreate,
    CropPlanResponse,
    FarmCreate,
    FarmerDashboardResponse,
    FarmerProfileCreate,
    FarmerProfileResponse,
    FarmerProfileUpdate,
    FarmerStatusResponse,
    FarmLocationUpdate,
    FarmResponse,
    FarmUpdate,
    VerificationSubmitResponse,
)
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/farmer", tags=["farmer"])

FarmerDependency = require_roles("FARMER")


@router.post(
    "/profile",
    response_model=FarmerProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create the farmer's basic profile",
)
def create_profile(
    payload: FarmerProfileCreate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmerProfileResponse:
    return service.create_profile(db, _farmer.id, payload)


@router.put(
    "/profile",
    response_model=FarmerProfileResponse,
    summary="Update the farmer's basic profile",
)
def update_profile(
    payload: FarmerProfileUpdate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmerProfileResponse:
    return service.update_profile(db, _farmer.id, payload)


@router.get(
    "/profile",
    response_model=FarmerProfileResponse,
    summary="Return the farmer's basic profile",
)
def get_profile(
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmerProfileResponse:
    return service.get_profile(db, _farmer.id)


@router.post(
    "/farms",
    response_model=FarmResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create farm information for the farmer",
)
def create_farm(
    payload: FarmCreate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmResponse:
    return service.create_farm(db, _farmer.id, payload)


@router.get(
    "/farms",
    response_model=list[FarmResponse],
    summary="List the farmer's farms",
)
def list_farms(
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> list[FarmResponse]:
    return service.list_farms(db, _farmer.id)


@router.get(
    "/farms/{farm_id}",
    response_model=FarmResponse,
    summary="Return one of the farmer's farms",
)
def get_farm(
    farm_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmResponse:
    return service.get_farm(db, _farmer.id, farm_id)


@router.put(
    "/farms/{farm_id}",
    response_model=FarmResponse,
    summary="Update farm information",
)
def update_farm(
    farm_id: UUID,
    payload: FarmUpdate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmResponse:
    return service.update_farm(db, _farmer.id, farm_id, payload)


@router.put(
    "/farms/{farm_id}/location",
    response_model=FarmResponse,
    summary="Update the farm location",
)
def update_farm_location(
    farm_id: UUID,
    payload: FarmLocationUpdate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmResponse:
    return service.update_farm_location(db, _farmer.id, farm_id, payload)


@router.post(
    "/farms/{farm_id}/crops",
    response_model=CropPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a crop plan to a farm",
)
def add_crop_plan(
    farm_id: UUID,
    payload: CropPlanCreate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> CropPlanResponse:
    return service.create_crop_plan(db, _farmer.id, farm_id, payload)


@router.get(
    "/farms/{farm_id}/crops",
    response_model=list[CropPlanResponse],
    summary="List crop plans for one of the farmer's farms",
)
def list_farm_crops(
    farm_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> list[CropPlanResponse]:
    return service.list_farm_crop_plans(db, _farmer.id, farm_id)


@router.get(
    "/crops",
    response_model=list[CropPlanResponse],
    summary="List all of the farmer's crop plans",
)
def list_crops(
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> list[CropPlanResponse]:
    return service.list_crop_plans(db, _farmer.id)


@router.delete(
    "/farms/{farm_id}/crops/{crop_plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a crop plan from a farm",
)
def remove_crop_plan(
    farm_id: UUID,
    crop_plan_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> None:
    service.delete_crop_plan(db, _farmer.id, farm_id, crop_plan_id)


@router.post(
    "/listings",
    response_model=CropListingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a crop listing (starts as DRAFT)",
)
def create_listing(
    payload: CropListingCreate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> CropListingResponse:
    return service.create_listing(db, _farmer.id, payload)


@router.get(
    "/listings",
    response_model=list[CropListingResponse],
    summary="List the farmer's crop listings",
)
def list_listings(
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> list[CropListingResponse]:
    return service.list_listings(db, _farmer.id)


@router.get(
    "/listings/{listing_id}",
    response_model=CropListingResponse,
    summary="Return one of the farmer's crop listings",
)
def get_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> CropListingResponse:
    return service.get_listing(db, _farmer.id, listing_id)


@router.put(
    "/listings/{listing_id}",
    response_model=CropListingResponse,
    summary="Update a crop listing",
)
def update_listing(
    listing_id: UUID,
    payload: CropListingUpdate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> CropListingResponse:
    return service.update_listing(db, _farmer.id, listing_id, payload)


@router.put(
    "/listings/{listing_id}/publish",
    response_model=CropListingResponse,
    summary="Publish a crop listing (requires a verified profile)",
)
def publish_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> CropListingResponse:
    return service.publish_listing(db, _farmer.id, listing_id)


@router.put(
    "/listings/{listing_id}/pause",
    response_model=CropListingResponse,
    summary="Pause a published crop listing",
)
def pause_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> CropListingResponse:
    return service.pause_listing(db, _farmer.id, listing_id)


@router.put(
    "/listings/{listing_id}/cancel",
    response_model=CropListingResponse,
    summary="Cancel a crop listing",
)
def cancel_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> CropListingResponse:
    return service.cancel_listing(db, _farmer.id, listing_id)


@router.delete(
    "/listings/{listing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a non-published listing without order history",
)
def delete_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> None:
    return service.delete_listing(db, _farmer.id, listing_id)


@router.post(
    "/verification/submit",
    response_model=VerificationSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit the onboarding data for mock verification",
)
def submit_verification(
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> VerificationSubmitResponse:
    return service.submit_verification(db, _farmer.id)


@router.get(
    "/status",
    response_model=FarmerStatusResponse,
    summary="Return farmer onboarding and verification status",
)
def farmer_status(
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmerStatusResponse:
    return service.get_status(db, _farmer.id)


@router.get(
    "/dashboard",
    response_model=FarmerDashboardResponse,
    summary="Return farmer dashboard statistics",
)
def farmer_dashboard(
    db: Session = Depends(get_db),
    _farmer: User = Depends(FarmerDependency),
) -> FarmerDashboardResponse:
    return service.get_dashboard(db, _farmer.id)
