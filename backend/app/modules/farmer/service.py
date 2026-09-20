from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.marketplace import (
    BuyerDemand,
    Crop,
    CropBatch,
    CropListing,
    FarmerCropPlan,
    Order,
    OrderItem,
)
from app.db.models.people import BuyerProfile, Farm, FarmerProfile
from app.db.models.social import TrustScore
from app.db.models.transaction import Settlement
from app.integrations.verification import (
    FarmerVerificationInput,
    VerificationReceipt,
    get_verification_provider,
)
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
    OnboardingStep,
    VerificationSubmitResponse,
)
from app.modules.notifications import service as notifications_service

STEPS: list[tuple[str, str]] = [
    ("profile", "Basic profile"),
    ("farm", "Farm details"),
    ("location", "Farm location"),
    ("crops", "Crop information"),
]


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _get_farmer_profile(db: Session, user_id: UUID) -> FarmerProfile | None:
    return db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user_id))


def _require_profile(db: Session, user_id: UUID) -> FarmerProfile:
    profile = _get_farmer_profile(db, user_id)
    if profile is None:
        raise _not_found("Complete your farmer profile before continuing")
    return profile


def _require_own_farm(db: Session, profile: FarmerProfile, farm_id: UUID) -> Farm:
    farm = db.get(Farm, farm_id)
    if farm is None or farm.farmer_id != profile.id:
        raise _not_found("Farm not found")
    return farm


def _require_own_crop_plan(
    db: Session, profile: FarmerProfile, farm_id: UUID, crop_plan_id: UUID
) -> FarmerCropPlan:
    farm = _require_own_farm(db, profile, farm_id)
    crop_plan = db.get(FarmerCropPlan, crop_plan_id)
    if crop_plan is None or crop_plan.farm_id != farm.id:
        raise _not_found("Crop plan not found")
    return crop_plan


def _require_own_listing(db: Session, profile: FarmerProfile, listing_id: UUID) -> CropListing:
    listing = db.get(CropListing, listing_id)
    if listing is None or listing.farmer_id != profile.id:
        raise _not_found("Listing not found")
    return listing


def get_profile(db: Session, user_id: UUID) -> FarmerProfileResponse:
    return FarmerProfileResponse.model_validate(_require_profile(db, user_id))


def create_profile(
    db: Session, user_id: UUID, payload: FarmerProfileCreate
) -> FarmerProfileResponse:
    if _get_farmer_profile(db, user_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Farmer profile already exists",
        )
    profile = FarmerProfile(
        user_id=user_id,
        full_name=payload.full_name,
        preferred_language=payload.preferred_language,
        verification_status="PENDING",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return FarmerProfileResponse.model_validate(profile)


def update_profile(
    db: Session, user_id: UUID, payload: FarmerProfileUpdate
) -> FarmerProfileResponse:
    profile = _require_profile(db, user_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return FarmerProfileResponse.model_validate(profile)


def list_farms(db: Session, user_id: UUID) -> list[FarmResponse]:
    profile = _require_profile(db, user_id)
    farms = db.scalars(
        select(Farm).where(Farm.farmer_id == profile.id).order_by(Farm.created_at.asc())
    ).all()
    return [FarmResponse.model_validate(farm) for farm in farms]


def create_farm(db: Session, user_id: UUID, payload: FarmCreate) -> FarmResponse:
    profile = _require_profile(db, user_id)
    farm = Farm(farmer_id=profile.id, **payload.model_dump())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return FarmResponse.model_validate(farm)


def get_farm(db: Session, user_id: UUID, farm_id: UUID) -> FarmResponse:
    profile = _require_profile(db, user_id)
    farm = _require_own_farm(db, profile, farm_id)
    return FarmResponse.model_validate(farm)


def update_farm(db: Session, user_id: UUID, farm_id: UUID, payload: FarmUpdate) -> FarmResponse:
    profile = _require_profile(db, user_id)
    farm = _require_own_farm(db, profile, farm_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(farm, field, value)
    db.commit()
    db.refresh(farm)
    return FarmResponse.model_validate(farm)


def update_farm_location(
    db: Session, user_id: UUID, farm_id: UUID, payload: FarmLocationUpdate
) -> FarmResponse:
    profile = _require_profile(db, user_id)
    farm = _require_own_farm(db, profile, farm_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(farm, field, value)
    db.commit()
    db.refresh(farm)
    return FarmResponse.model_validate(farm)


def _crop_plan_response(db: Session, crop_plan: FarmerCropPlan) -> CropPlanResponse:
    crop = db.get(Crop, crop_plan.crop_id)
    return CropPlanResponse(
        id=crop_plan.id,
        farm_id=crop_plan.farm_id,
        crop_id=crop_plan.crop_id,
        crop_name=crop.name if crop else None,
        crop_variety=crop.variety if crop else None,
        season=crop_plan.season,
        expected_harvest_start=crop_plan.expected_harvest_start,
        expected_harvest_end=crop_plan.expected_harvest_end,
        estimated_quantity=crop_plan.estimated_quantity,
        cultivation_method=crop_plan.cultivation_method,
        status=crop_plan.status,
        created_at=crop_plan.created_at,
    )


def list_crop_plans(db: Session, user_id: UUID) -> list[CropPlanResponse]:
    profile = _require_profile(db, user_id)
    crop_plans = db.scalars(
        select(FarmerCropPlan)
        .join(Farm, Farm.id == FarmerCropPlan.farm_id)
        .where(Farm.farmer_id == profile.id)
        .order_by(FarmerCropPlan.created_at.asc())
    ).all()
    return [_crop_plan_response(db, crop_plan) for crop_plan in crop_plans]


def list_farm_crop_plans(db: Session, user_id: UUID, farm_id: UUID) -> list[CropPlanResponse]:
    profile = _require_profile(db, user_id)
    farm = _require_own_farm(db, profile, farm_id)
    crop_plans = db.scalars(
        select(FarmerCropPlan)
        .where(FarmerCropPlan.farm_id == farm.id)
        .order_by(FarmerCropPlan.created_at.asc())
    ).all()
    return [_crop_plan_response(db, crop_plan) for crop_plan in crop_plans]


def create_crop_plan(
    db: Session, user_id: UUID, farm_id: UUID, payload: CropPlanCreate
) -> CropPlanResponse:
    profile = _require_profile(db, user_id)
    farm = _require_own_farm(db, profile, farm_id)
    if db.get(Crop, payload.crop_id) is None:
        raise _not_found("Crop not found")
    crop_plan = FarmerCropPlan(farm_id=farm.id, **payload.model_dump())
    db.add(crop_plan)
    db.commit()
    db.refresh(crop_plan)
    return _crop_plan_response(db, crop_plan)


def delete_crop_plan(db: Session, user_id: UUID, farm_id: UUID, crop_plan_id: UUID) -> None:
    profile = _require_profile(db, user_id)
    crop_plan = _require_own_crop_plan(db, profile, farm_id, crop_plan_id)
    db.delete(crop_plan)
    db.commit()


def _listing_response(db: Session, listing: CropListing) -> CropListingResponse:
    crop = db.get(Crop, listing.crop_id)
    return CropListingResponse(
        id=listing.id,
        farmer_id=listing.farmer_id,
        farm_id=listing.farm_id,
        crop_id=listing.crop_id,
        crop_name=crop.name if crop else None,
        crop_variety=crop.variety if crop else None,
        title=listing.title,
        description=listing.description,
        grade=listing.grade,
        unit=listing.unit,
        available_quantity=listing.available_quantity,
        unit_price=listing.unit_price,
        currency=listing.currency,
        available_from=listing.available_from,
        available_until=listing.available_until,
        state=listing.state,
        district=listing.district,
        status=listing.status,
        published_at=listing.published_at,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
    )


def list_listings(db: Session, user_id: UUID) -> list[CropListingResponse]:
    profile = _require_profile(db, user_id)
    listings = db.scalars(
        select(CropListing)
        .where(CropListing.farmer_id == profile.id)
        .order_by(CropListing.created_at.desc())
    ).all()
    return [_listing_response(db, listing) for listing in listings]


def create_listing(db: Session, user_id: UUID, payload: CropListingCreate) -> CropListingResponse:
    profile = _require_profile(db, user_id)
    farm = _require_own_farm(db, profile, payload.farm_id)
    if db.get(Crop, payload.crop_id) is None:
        raise _not_found("Crop not found")
    listing = CropListing(
        farmer_id=profile.id,
        farm_id=farm.id,
        crop_id=payload.crop_id,
        title=payload.title,
        description=payload.description,
        grade=payload.grade,
        unit=payload.unit,
        available_quantity=payload.available_quantity,
        unit_price=payload.unit_price,
        currency=payload.currency,
        available_from=payload.available_from,
        available_until=payload.available_until,
        state=farm.state,
        district=farm.district,
        status="DRAFT",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _listing_response(db, listing)


def get_listing(db: Session, user_id: UUID, listing_id: UUID) -> CropListingResponse:
    profile = _require_profile(db, user_id)
    listing = _require_own_listing(db, profile, listing_id)
    return _listing_response(db, listing)


def update_listing(
    db: Session, user_id: UUID, listing_id: UUID, payload: CropListingUpdate
) -> CropListingResponse:
    profile = _require_profile(db, user_id)
    listing = _require_own_listing(db, profile, listing_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    db.commit()
    db.refresh(listing)
    return _listing_response(db, listing)


def publish_listing(db: Session, user_id: UUID, listing_id: UUID) -> CropListingResponse:
    profile = _require_profile(db, user_id)
    if profile.verification_status != "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer profile must be verified before publishing listings",
        )
    listing = _require_own_listing(db, profile, listing_id)
    if listing.status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancelled listings cannot be published",
        )
    listing.status = "PUBLISHED"
    listing.published_at = listing.published_at or func.now()
    db.commit()
    db.refresh(listing)
    _notify_matching_buyers(db, listing, profile)
    return _listing_response(db, listing)


def _notify_matching_buyers(
    db: Session, listing: CropListing, farmer_profile: FarmerProfile
) -> None:
    """In-app notify buyers whose active demands match this listing (best effort)."""
    try:
        crop = db.get(Crop, listing.crop_id)
        crop_name = crop.name if crop else "produce"
        buyer_profile_ids = db.execute(
            select(BuyerDemand.buyer_id)
            .where(
                BuyerDemand.crop_id == listing.crop_id,
                BuyerDemand.status == "DRAFT",
                BuyerDemand.state == listing.state,
            )
            .distinct()
            .limit(20)
        ).scalars().all()
        for buyer_profile_id in buyer_profile_ids:
            buyer_profile = db.get(BuyerProfile, buyer_profile_id)
            if buyer_profile is None:
                continue
            notifications_service.emit(
                db,
                "new_farmer_match",
                user_id=buyer_profile.user_id,
                farmer_name=farmer_profile.full_name or "A farmer",
                crop=crop_name,
                price=listing.unit_price,
                unit=listing.unit,
                location=", ".join(
                    part for part in (listing.district, listing.state) if part
                )
                or "your area",
            )
        db.commit()
    except Exception:  # pragma: no cover - best effort, never break listing publishing
        pass


def pause_listing(db: Session, user_id: UUID, listing_id: UUID) -> CropListingResponse:
    profile = _require_profile(db, user_id)
    listing = _require_own_listing(db, profile, listing_id)
    if listing.status != "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only published listings can be paused",
        )
    listing.status = "PAUSED"
    db.commit()
    db.refresh(listing)
    return _listing_response(db, listing)


def cancel_listing(db: Session, user_id: UUID, listing_id: UUID) -> CropListingResponse:
    profile = _require_profile(db, user_id)
    listing = _require_own_listing(db, profile, listing_id)
    if listing.status == "SOLD_OUT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A sold out listing cannot be cancelled",
        )
    listing.status = "CANCELLED"
    db.commit()
    db.refresh(listing)
    return _listing_response(db, listing)


def delete_listing(db: Session, user_id: UUID, listing_id: UUID) -> None:
    profile = _require_profile(db, user_id)
    listing = _require_own_listing(db, profile, listing_id)
    order_count = (
        db.scalar(select(func.count(OrderItem.id)).where(OrderItem.listing_id == listing.id)) or 0
    )
    if order_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A listing with order history cannot be deleted",
        )
    if listing.status == "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pause or cancel the listing before deleting it",
        )
    db.delete(listing)
    db.commit()


def _completion_steps(db: Session, profile: FarmerProfile) -> list[OnboardingStep]:
    farms = db.scalars(select(Farm).where(Farm.farmer_id == profile.id)).all()
    located_farm = next(
        (
            farm
            for farm in farms
            if farm.state and farm.district and farm.locality and farm.postal_code
        ),
        None,
    )
    crop_plan_count = (
        db.scalar(
            select(func.count(FarmerCropPlan.id))
            .join(Farm, Farm.id == FarmerCropPlan.farm_id)
            .where(Farm.farmer_id == profile.id)
        )
        or 0
    )
    done = {
        "profile": bool(profile.full_name),
        "farm": len(farms) > 0,
        "location": located_farm is not None,
        "crops": crop_plan_count > 0,
    }
    return [OnboardingStep(key=key, label=label, done=done[key]) for key, label in STEPS]


def get_status(db: Session, user_id: UUID) -> FarmerStatusResponse:
    profile = _require_profile(db, user_id)
    steps = _completion_steps(db, profile)
    completed = sum(1 for step in steps if step.done)
    percent = round(completed * 100 / len(steps)) if steps else 0
    return FarmerStatusResponse(
        verification_status=profile.verification_status,
        completion_percent=percent,
        steps=steps,
        can_submit=completed == len(steps),
    )


def submit_verification(db: Session, user_id: UUID) -> VerificationSubmitResponse:
    profile = _require_profile(db, user_id)
    farms = db.scalars(select(Farm).where(Farm.farmer_id == profile.id)).all()
    located_farm_count = sum(
        1 for farm in farms if farm.state and farm.district and farm.locality and farm.postal_code
    )
    crop_plan_count = (
        db.scalar(
            select(func.count(FarmerCropPlan.id))
            .join(Farm, Farm.id == FarmerCropPlan.farm_id)
            .where(Farm.farmer_id == profile.id)
        )
        or 0
    )
    receipt: VerificationReceipt = get_verification_provider().submit(
        FarmerVerificationInput(
            full_name=profile.full_name,
            farm_count=len(farms),
            located_farm_count=located_farm_count,
            crop_plan_count=crop_plan_count,
        )
    )
    # Always mark PENDING – admin must approve or reject via the admin panel.
    profile.verification_status = "PENDING"
    db.commit()
    return VerificationSubmitResponse(
        verification_status=profile.verification_status,
        provider_reference=receipt.provider_reference,
        reason=receipt.reason,
    )


def get_dashboard(db: Session, user_id: UUID) -> FarmerDashboardResponse:
    profile = _require_profile(db, user_id)
    farms = db.scalars(select(Farm).where(Farm.farmer_id == profile.id)).all()
    crop_plan_count = (
        db.scalar(
            select(func.count(FarmerCropPlan.id))
            .join(Farm, Farm.id == FarmerCropPlan.farm_id)
            .where(Farm.farmer_id == profile.id)
        )
        or 0
    )
    active_listings = (
        db.scalar(
            select(func.count(CropListing.id)).where(
                CropListing.farmer_id == profile.id,
                CropListing.status == "PUBLISHED",
            )
        )
        or 0
    )
    orders_count = db.scalar(select(func.count(Order.id)).where(Order.farmer_id == profile.id)) or 0
    batches_count = (
        db.scalar(select(func.count(CropBatch.id)).where(CropBatch.farmer_id == profile.id)) or 0
    )
    earnings = (
        db.scalar(
            select(func.coalesce(func.sum(Settlement.net_amount), 0)).where(
                Settlement.order_id.in_(select(Order.id).where(Order.farmer_id == profile.id)),
                Settlement.status == "RELEASED",
            )
        )
        or 0
    )
    trust = db.scalar(select(TrustScore).where(TrustScore.user_id == user_id))
    steps = _completion_steps(db, profile)
    completed = sum(1 for step in steps if step.done)
    percent = round(completed * 100 / len(steps)) if steps else 0
    return FarmerDashboardResponse(
        profile_completion_percent=percent,
        verification_status=profile.verification_status,
        farms_count=len(farms),
        crops_count=crop_plan_count,
        active_listings_count=active_listings,
        orders_count=orders_count,
        batches_count=batches_count,
        earnings=Decimal(earnings),
        trust_score=Decimal(trust.score) if trust else Decimal("0"),
        trust_band=trust.score_band if trust else "NEW",
    )
