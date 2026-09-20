from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Crop, CropListing
from app.db.models.people import Farm, FarmerProfile
from app.db.models.social import Rating, TrustScore
from app.modules.marketplace.schemas import (
    MarketplaceFarmerProfileResponse,
    MarketplaceFarmSummary,
    MarketplaceListingResponse,
    MarketplaceListingsPage,
    MarketplaceLocationItem,
)

SORTABLE_FIELDS = ("newest", "price_asc", "price_desc", "quantity_desc", "harvest_date", "state")


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _listing_response(db: Session, listing: CropListing) -> MarketplaceListingResponse:
    crop = db.get(Crop, listing.crop_id)
    farmer = db.get(FarmerProfile, listing.farmer_id) if listing.farmer_id else None
    farm = db.get(Farm, listing.farm_id) if listing.farm_id else None
    return MarketplaceListingResponse(
        id=listing.id,
        farmer_id=listing.farmer_id,
        farm_id=listing.farm_id,
        crop_id=listing.crop_id,
        crop_name=crop.name if crop else None,
        crop_variety=crop.variety if crop else None,
        category=crop.category if crop else None,
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
        farmer_name=farmer.full_name if farmer else None,
        farmer_verification_status=farmer.verification_status if farmer else None,
        farm_name=farm.name if farm else None,
    )


def search_listings(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    crop_id: UUID | None = None,
    state: str | None = None,
    district: str | None = None,
    grade: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
) -> MarketplaceListingsPage:
    stmt = (
        select(CropListing)
        .join(Crop, Crop.id == CropListing.crop_id)
        .join(FarmerProfile, FarmerProfile.id == CropListing.farmer_id)
        .where(CropListing.status == "PUBLISHED", CropListing.available_quantity > 0)
    )
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                CropListing.title.ilike(pattern),
                CropListing.description.ilike(pattern),
                Crop.name.ilike(pattern),
                Crop.variety.ilike(pattern),
                FarmerProfile.full_name.ilike(pattern),
            )
        )
    if category:
        stmt = stmt.where(Crop.category.ilike(f"%{category}%"))
    if crop_id is not None:
        stmt = stmt.where(CropListing.crop_id == crop_id)
    if state:
        stmt = stmt.where(CropListing.state == state)
    if district:
        stmt = stmt.where(CropListing.district == district)
    if grade:
        stmt = stmt.where(CropListing.grade.ilike(f"%{grade}%"))
    if min_price is not None:
        stmt = stmt.where(CropListing.unit_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(CropListing.unit_price <= max_price)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    if sort not in SORTABLE_FIELDS:
        status_code = getattr(
            status, "HTTP_422_UNPROCESSABLE_CONTENT", status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(
            status_code=status_code,
            detail=f"sort must be one of: {', '.join(SORTABLE_FIELDS)}",
        )

    order_by = {
        "newest": CropListing.published_at.desc(),
        "price_asc": CropListing.unit_price.asc(),
        "price_desc": CropListing.unit_price.desc(),
        "quantity_desc": CropListing.available_quantity.desc(),
        "harvest_date": (
            CropListing.available_until.asc().nullslast(),
            CropListing.published_at.desc(),
        ),
        "state": (CropListing.state.asc(), CropListing.published_at.desc()),
    }[sort]

    items = db.scalars(
        stmt.order_by(order_by).offset((page - 1) * page_size).limit(page_size)
    ).all()
    pages = (total + page_size - 1) // page_size if total else 0
    return MarketplaceListingsPage(
        items=[_listing_response(db, listing) for listing in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def get_listing(db: Session, listing_id: UUID) -> MarketplaceListingResponse:
    listing = db.get(CropListing, listing_id)
    if listing is None or listing.status != "PUBLISHED":
        raise _not_found("Listing not found")
    return _listing_response(db, listing)


def list_locations(db: Session) -> list[MarketplaceLocationItem]:
    rows = db.execute(
        select(CropListing.state, CropListing.district)
        .where(CropListing.status == "PUBLISHED", CropListing.available_quantity > 0)
        .distinct()
        .order_by(CropListing.state.asc(), CropListing.district.asc())
    ).all()
    return [MarketplaceLocationItem(state=row[0], district=row[1]) for row in rows]


def get_farmer_profile(db: Session, farmer_id: UUID) -> MarketplaceFarmerProfileResponse:
    farmer = db.get(FarmerProfile, farmer_id)
    if farmer is None:
        raise _not_found("Farmer not found")
    farms = db.scalars(
        select(Farm).where(Farm.farmer_id == farmer.id).order_by(Farm.created_at.asc())
    ).all()
    active_listings = (
        db.scalar(
            select(func.count(CropListing.id)).where(
                CropListing.farmer_id == farmer.id,
                CropListing.status == "PUBLISHED",
                CropListing.available_quantity > 0,
            )
        )
        or 0
    )
    trust = db.scalar(select(TrustScore).where(TrustScore.user_id == farmer.user_id))
    rating_avg = db.scalar(
        select(func.avg(Rating.score)).where(Rating.rated_user_id == farmer.user_id)
    )
    return MarketplaceFarmerProfileResponse(
        id=farmer.id,
        user_id=farmer.user_id,
        full_name=farmer.full_name,
        verification_status=farmer.verification_status,
        preferred_language=farmer.preferred_language,
        farms=[MarketplaceFarmSummary.model_validate(farm) for farm in farms],
        active_listings_count=active_listings,
        trust_score=Decimal(trust.score) if trust else Decimal("0"),
        trust_band=trust.score_band if trust else "NEW",
        rating_avg=(Decimal(str(round(float(rating_avg), 2))) if rating_avg is not None else None),
    )


def list_crop_catalog(db: Session, q: str | None = None) -> list[Crop]:
    stmt = select(Crop).order_by(Crop.name.asc(), Crop.variety.asc())
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Crop.name.ilike(pattern),
                Crop.variety.ilike(pattern),
                Crop.category.ilike(pattern),
            )
        )
    return db.scalars(stmt).all()
