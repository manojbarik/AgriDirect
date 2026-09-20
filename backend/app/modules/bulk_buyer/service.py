from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.marketplace import (
    BuyerDemand,
    Contract,
    Crop,
    CropListing,
    Delivery,
    Order,
)
from app.db.models.people import BulkBuyerProfile, BuyerProfile, User
from app.db.models.social import TrustScore
from app.modules.bulk_buyer.schemas import (
    BulkBuyerDashboardResponse,
    BulkBuyerProfileCreate,
    BulkBuyerProfileResponse,
    BulkBuyerProfileUpdate,
    RecommendedListing,
)

ORDER_OPEN_STATUSES = ("PENDING", "COUNTERED")
CONTRACT_ACTIVE_STATUSES = ("ACCEPTED", "ACTIVE", "COUNTERED")
IN_TRANSIT = "IN_TRANSIT"


def _not_found(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)


def _conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


def _require_profile(db: Session, user_id: UUID) -> BulkBuyerProfile:
    profile = db.scalar(
        select(BulkBuyerProfile).where(BulkBuyerProfile.user_id == user_id)
    )
    if profile is None:
        raise _not_found("Create your organization profile to access this feature")
    return profile


def _has_buyer_profile(db: Session, user_id: UUID) -> bool:
    return (
        db.scalar(
            select(func.count(BuyerProfile.id)).where(BuyerProfile.user_id == user_id)
        )
        or 0
    ) > 0


def create_profile(
    db: Session, user_id: UUID, payload: BulkBuyerProfileCreate
) -> BulkBuyerProfileResponse:
    existing = db.scalar(
        select(BulkBuyerProfile).where(BulkBuyerProfile.user_id == user_id)
    )
    if existing is not None:
        raise _conflict("Organization profile already exists")
    profile = BulkBuyerProfile(
        user_id=user_id,
        organization_name=payload.organization_name,
        org_type=payload.org_type.value,
        gstin=payload.gstin,
        contact_person=payload.contact_person,
        verification_status="PENDING",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return BulkBuyerProfileResponse.model_validate(profile)


def update_profile(
    db: Session, user_id: UUID, payload: BulkBuyerProfileUpdate
) -> BulkBuyerProfileResponse:
    profile = _require_profile(db, user_id)
    updates = payload.model_dump(exclude_unset=True)
    if "org_type" in updates and updates["org_type"] is not None:
        updates["org_type"] = updates["org_type"].value
    for field, value in updates.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return BulkBuyerProfileResponse.model_validate(profile)


def get_profile(db: Session, user_id: UUID) -> BulkBuyerProfileResponse:
    profile = _require_profile(db, user_id)
    return BulkBuyerProfileResponse.model_validate(profile)


def _completion_steps(db: Session, profile: BulkBuyerProfile) -> tuple[bool, ...]:
    org_filled = bool(profile.organization_name.strip()) and bool(profile.org_type)
    buyer_profile = _has_buyer_profile(db, profile.user_id)
    gstin_provided = bool(profile.gstin and profile.gstin.strip())
    return (org_filled, buyer_profile, gstin_provided)


def _recommended_listings(db: Session, limit: int = 5) -> list[RecommendedListing]:
    rows = db.execute(
        select(CropListing, Crop)
        .join(Crop, Crop.id == CropListing.crop_id)
        .where(CropListing.status == "PUBLISHED")
        .order_by(CropListing.published_at.desc())
        .limit(limit)
    ).all()
    result: list[RecommendedListing] = []
    for listing, crop in rows:
        farmer = listing.farmer
        result.append(
            RecommendedListing(
                listing_id=listing.id,
                title=listing.title,
                crop_name=crop.name,
                grade=listing.grade,
                unit=listing.unit,
                available_quantity=listing.available_quantity,
                unit_price=listing.unit_price,
                currency=listing.currency,
                state=listing.state,
                district=listing.district,
                supplier_name=farmer.full_name if farmer else "Farmer",
            )
        )
    return result


def get_dashboard(db: Session, user: User) -> BulkBuyerDashboardResponse:
    profile = _require_profile(db, user.id)
    buyer_profile_id: UUID | None = db.scalar(
        select(BuyerProfile.id).where(BuyerProfile.user_id == user.id)
    )
    buyer_exists = buyer_profile_id is not None

    pending_orders = 0
    completed_orders = 0
    total_spend = Decimal("0")
    shipments = 0
    if buyer_profile_id is not None:
        pending_orders = (
            db.scalar(
                select(func.count(Order.id)).where(
                    Order.buyer_id == buyer_profile_id,
                    Order.status.in_(ORDER_OPEN_STATUSES),
                )
            )
            or 0
        )
        completed_orders = (
            db.scalar(
                select(func.count(Order.id)).where(
                    Order.buyer_id == buyer_profile_id, Order.status == "COMPLETED"
                )
            )
            or 0
        )
        total_spend = (
            db.scalar(
                select(func.coalesce(func.sum(Order.total_amount), 0)).where(
                    Order.buyer_id == buyer_profile_id, Order.status == "COMPLETED"
                )
            )
            or Decimal("0")
        )
        shipments = (
            db.scalar(
                select(func.count(Delivery.id)).where(
                    Delivery.order_id.in_(select(Order.id).where(Order.buyer_id == buyer_profile_id)),
                    Delivery.status == IN_TRANSIT,
                )
            )
            or 0
        )

    active_contracts = (
        db.scalar(
            select(func.count(Contract.id)).where(
                Contract.buyer_id == user.id,
                Contract.status.in_(CONTRACT_ACTIVE_STATUSES),
            )
        )
        or 0
    )
    demands_count = (
        db.scalar(
            select(func.count(BuyerDemand.id)).where(
                BuyerDemand.buyer_id == buyer_profile_id
            )
        )
        or 0
    ) if buyer_profile_id is not None else 0
    marketplace_listings = (
        db.scalar(select(func.count(CropListing.id)).where(CropListing.status == "PUBLISHED"))
        or 0
    )
    trust = db.scalar(select(TrustScore).where(TrustScore.user_id == user.id))

    steps = _completion_steps(db, profile)
    percent = round(sum(1 for step in steps if step) * 100 / len(steps)) if steps else 0

    return BulkBuyerDashboardResponse(
        verification_status=profile.verification_status,
        profile_completion_percent=percent,
        buyer_profile_exists=buyer_exists,
        pending_orders_count=pending_orders,
        active_contracts_count=active_contracts,
        completed_orders_count=completed_orders,
        total_spend=total_spend,
        demands_count=demands_count,
        in_transit_shipments=shipments,
        marketplace_listings_count=marketplace_listings,
        sourcing_spotlight=_recommended_listings(db),
        trust_score=Decimal(trust.score) if trust else Decimal("0"),
        trust_band=trust.score_band if trust else "NEW",
    )