from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.marketplace import BuyerDemand, Crop, CropListing, Delivery, Order
from app.db.models.people import BuyerProfile, FarmerProfile
from app.db.models.social import Review, TrustScore
from app.db.models.transaction import Dispute, Payment
from app.integrations.buyer_verification import (
    BUSINESS_BUYER_TYPES,
    BuyerIdentityVerificationInput,
    BuyerPaymentVerificationInput,
    get_buyer_verification_provider,
)
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
    OnboardingStep,
)
from app.modules.notifications import service as notifications_service

STEPS: list[tuple[str, str]] = [
    ("buyer_type", "Buyer type"),
    ("basic", "Basic information"),
    ("identity", "Identity/business verification"),
    ("location", "Location"),
    ("payment", "Payment verification"),
]


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _get_buyer_profile(db: Session, user_id: UUID) -> BuyerProfile | None:
    return db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user_id))


def _require_profile(db: Session, user_id: UUID) -> BuyerProfile:
    profile = _get_buyer_profile(db, user_id)
    if profile is None:
        raise _not_found("Complete your buyer profile before continuing")
    return profile


def _location_complete(profile: BuyerProfile) -> bool:
    return bool(profile.state and profile.district and profile.locality and profile.postal_code)


def _identity_data_complete(profile: BuyerProfile) -> bool:
    requires_business_name = profile.buyer_type in BUSINESS_BUYER_TYPES
    return bool(profile.full_name and profile.buyer_type) and (
        not requires_business_name or bool(profile.business_name)
    )


def get_profile(db: Session, user_id: UUID) -> BuyerProfileResponse:
    return BuyerProfileResponse.model_validate(_require_profile(db, user_id))


def create_profile(db: Session, user_id: UUID, payload: BuyerProfileCreate) -> BuyerProfileResponse:
    if _get_buyer_profile(db, user_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Buyer profile already exists",
        )
    profile = BuyerProfile(
        user_id=user_id,
        full_name=payload.full_name,
        buyer_type=payload.buyer_type.value,
        business_name=payload.business_name,
        verification_status="PENDING",
        payment_verification_status="PENDING",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return BuyerProfileResponse.model_validate(profile)


def update_profile(db: Session, user_id: UUID, payload: BuyerProfileUpdate) -> BuyerProfileResponse:
    profile = _require_profile(db, user_id)
    changes = payload.model_dump(exclude_unset=True)
    if "buyer_type" in changes:
        changes["buyer_type"] = changes["buyer_type"].value
    for field, value in changes.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return BuyerProfileResponse.model_validate(profile)


def update_location(
    db: Session, user_id: UUID, payload: BuyerLocationUpdate
) -> BuyerProfileResponse:
    profile = _require_profile(db, user_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return BuyerProfileResponse.model_validate(profile)


def _completion_steps(db: Session, profile: BuyerProfile) -> list[OnboardingStep]:
    done = {
        "buyer_type": bool(profile.buyer_type),
        "basic": _identity_data_complete(profile),
        "identity": profile.verification_status == "VERIFIED",
        "location": _location_complete(profile),
        "payment": profile.payment_verification_status == "VERIFIED",
    }
    return [OnboardingStep(key=key, label=label, done=done[key]) for key, label in STEPS]


def get_status(db: Session, user_id: UUID) -> BuyerStatusResponse:
    profile = _require_profile(db, user_id)
    steps = _completion_steps(db, profile)
    completed = sum(1 for step in steps if step.done)
    percent = round(completed * 100 / len(steps)) if steps else 0
    return BuyerStatusResponse(
        verification_status=profile.verification_status,
        payment_verification_status=profile.payment_verification_status,
        completion_percent=percent,
        steps=steps,
        identity_can_submit=_identity_data_complete(profile),
        payment_can_submit=(
            profile.verification_status == "VERIFIED" and _location_complete(profile)
        ),
    )


def submit_identity_verification(db: Session, user_id: UUID) -> BuyerVerificationSubmitResponse:
    profile = _require_profile(db, user_id)
    receipt = get_buyer_verification_provider().submit_identity(
        BuyerIdentityVerificationInput(
            full_name=profile.full_name,
            buyer_type=profile.buyer_type,
            business_name=profile.business_name,
        )
    )
    profile.verification_status = receipt.status
    if profile.verification_status == "REJECTED":
        profile.verification_status = "PENDING"
    db.commit()
    return BuyerVerificationSubmitResponse(
        verification_status=profile.verification_status,
        provider_reference=receipt.provider_reference,
        reason=receipt.reason,
    )


def submit_payment_verification(db: Session, user_id: UUID) -> BuyerVerificationSubmitResponse:
    profile = _require_profile(db, user_id)
    receipt = get_buyer_verification_provider().submit_payment(
        BuyerPaymentVerificationInput(
            identity_verified=profile.verification_status == "VERIFIED",
            location_complete=_location_complete(profile),
        )
    )
    profile.payment_verification_status = receipt.status
    if receipt.status == "VERIFIED":
        profile.payment_profile_reference = receipt.provider_reference
    db.commit()
    return BuyerVerificationSubmitResponse(
        verification_status=profile.payment_verification_status,
        provider_reference=receipt.provider_reference,
        reason=receipt.reason,
    )


def _demand_response(db: Session, demand: BuyerDemand) -> BuyerDemandResponse:
    crop = db.get(Crop, demand.crop_id)
    return BuyerDemandResponse(
        id=demand.id,
        buyer_id=demand.buyer_id,
        crop_id=demand.crop_id,
        crop_name=crop.name if crop else None,
        crop_variety=crop.variety if crop else None,
        requested_quantity=demand.requested_quantity,
        unit=demand.unit,
        target_min_price=demand.target_min_price,
        target_max_price=demand.target_max_price,
        currency=demand.currency,
        quality_requirements=demand.quality_requirements,
        delivery_address_summary=demand.delivery_address_summary,
        state=demand.state,
        district=demand.district,
        required_by=demand.required_by,
        status=demand.status,
        created_at=demand.created_at,
    )


def _require_own_demand(db: Session, profile: BuyerProfile, demand_id: UUID) -> BuyerDemand:
    demand = db.get(BuyerDemand, demand_id)
    if demand is None or demand.buyer_id != profile.id:
        raise _not_found("Demand not found")
    return demand


def create_demand(db: Session, user_id: UUID, payload: BuyerDemandCreate) -> BuyerDemandResponse:
    profile = _require_profile(db, user_id)
    if db.get(Crop, payload.crop_id) is None:
        raise _not_found("Crop not found")
    demand = BuyerDemand(
        buyer_id=profile.id,
        crop_id=payload.crop_id,
        requested_quantity=payload.requested_quantity,
        unit=payload.unit,
        target_min_price=payload.target_min_price,
        target_max_price=payload.target_max_price,
        currency=payload.currency,
        quality_requirements=payload.quality_requirements,
        delivery_address_summary=payload.delivery_address_summary,
        state=payload.state or profile.state,
        district=payload.district or profile.district,
        required_by=payload.required_by,
        status="DRAFT",
    )
    db.add(demand)
    db.commit()
    db.refresh(demand)
    _notify_matching_farmers(db, demand, profile)
    return _demand_response(db, demand)


def _notify_matching_farmers(
    db: Session, demand: BuyerDemand, buyer_profile: BuyerProfile
) -> None:
    """In-app notify farmers whose published listings match this demand (best effort)."""
    try:
        crop = db.get(Crop, demand.crop_id)
        crop_name = crop.name if crop else "produce"
        farmer_profile_ids = db.execute(
            select(CropListing.farmer_id)
            .where(
                CropListing.crop_id == demand.crop_id,
                CropListing.status == "PUBLISHED",
                CropListing.state == demand.state,
                CropListing.available_quantity > 0,
            )
            .distinct()
            .limit(20)
        ).scalars().all()
        for farm_profile_id in farmer_profile_ids:
            farm_profile = db.get(FarmerProfile, farm_profile_id)
            if farm_profile is None:
                continue
            notifications_service.emit(
                db,
                "new_buyer_demand",
                user_id=farm_profile.user_id,
                buyer_name=buyer_profile.full_name or "A buyer",
                quantity=demand.requested_quantity,
                unit=demand.unit,
                crop=crop_name,
                location=", ".join(
                    part for part in (demand.district, demand.state) if part
                )
                or "your area",
            )
        db.commit()
    except Exception:  # pragma: no cover - best effort, never break demand creation
        pass


def get_demand(db: Session, user_id: UUID, demand_id: UUID) -> BuyerDemandResponse:
    profile = _require_profile(db, user_id)
    return _demand_response(db, _require_own_demand(db, profile, demand_id))


def update_demand(
    db: Session, user_id: UUID, demand_id: UUID, payload: BuyerDemandUpdate
) -> BuyerDemandResponse:
    profile = _require_profile(db, user_id)
    demand = _require_own_demand(db, profile, demand_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(demand, field, value)
    db.commit()
    db.refresh(demand)
    return _demand_response(db, demand)


def cancel_demand(db: Session, user_id: UUID, demand_id: UUID) -> BuyerDemandResponse:
    profile = _require_profile(db, user_id)
    demand = _require_own_demand(db, profile, demand_id)
    if demand.status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Demand is already cancelled",
        )
    demand.status = "CANCELLED"
    db.commit()
    db.refresh(demand)
    return _demand_response(db, demand)


def list_demands(
    db: Session, user_id: UUID, status_filter: str | None = None
) -> list[BuyerDemandResponse]:
    profile = _require_profile(db, user_id)
    stmt = select(BuyerDemand).where(BuyerDemand.buyer_id == profile.id)
    if status_filter:
        stmt = stmt.where(BuyerDemand.status == status_filter)
    demands = db.scalars(stmt.order_by(BuyerDemand.created_at.desc())).all()
    return [_demand_response(db, demand) for demand in demands]


def get_dashboard(db: Session, user_id: UUID) -> BuyerDashboardResponse:
    profile = _require_profile(db, user_id)
    marketplace_listings = (
        db.scalar(select(func.count(CropListing.id)).where(CropListing.status == "PUBLISHED")) or 0
    )
    demands_count = (
        db.scalar(select(func.count(BuyerDemand.id)).where(BuyerDemand.buyer_id == profile.id)) or 0
    )
    recommendations = (
        db.scalar(
            select(func.count(CropListing.id)).where(
                CropListing.status == "PUBLISHED",
                CropListing.state == profile.state,
            )
        )
        or 0
    )
    orders_count = db.scalar(select(func.count(Order.id)).where(Order.buyer_id == profile.id)) or 0
    payments_count = (
        db.scalar(select(func.count(Payment.id)).where(Payment.payer_id == user_id)) or 0
    )
    deliveries_count = (
        db.scalar(
            select(func.count(Delivery.id)).where(
                Delivery.order_id.in_(select(Order.id).where(Order.buyer_id == profile.id))
            )
        )
        or 0
    )
    disputes_count = (
        db.scalar(select(func.count(Dispute.id)).where(Dispute.opened_by_id == user_id)) or 0
    )
    reviews_count = (
        db.scalar(select(func.count(Review.id)).where(Review.subject_id == user_id)) or 0
    )
    trust = db.scalar(select(TrustScore).where(TrustScore.user_id == user_id))
    percent = sum(1 for step in _completion_steps(db, profile) if step.done)
    percent = round(percent * 100 / len(STEPS)) if STEPS else 0
    return BuyerDashboardResponse(
        verification_status=profile.verification_status,
        payment_verification_status=profile.payment_verification_status,
        profile_completion_percent=percent,
        marketplace_listings_count=marketplace_listings,
        demands_count=demands_count,
        recommendations_count=recommendations,
        orders_count=orders_count,
        payments_count=payments_count,
        deliveries_count=deliveries_count,
        disputes_count=disputes_count,
        reviews_count=reviews_count,
        trust_score=Decimal(trust.score) if trust else Decimal("0"),
        trust_band=trust.score_band if trust else "NEW",
    )
