"""Livestock service layer."""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models.livestock import LivestockListing
from app.db.models.people import User
from app.modules.livestock.schemas import (
    LivestockCreate,
    LivestockResponse,
    LivestockUpdate,
)


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livestock listing not found")


def _forbidden() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to modify this listing",
    )


def to_response(listing: LivestockListing) -> LivestockResponse:
    seller_name = None
    seller_phone = listing.contact_phone
    if listing.seller:
        if listing.seller.farmer_profile:
            seller_name = listing.seller.farmer_profile.full_name
        elif getattr(listing.seller, "buyer_profile", None):
            seller_name = listing.seller.buyer_profile.full_name
        elif getattr(listing.seller, "bulk_buyer_profile", None):
            seller_name = listing.seller.bulk_buyer_profile.company_name
        if not seller_phone:
            seller_phone = listing.seller.phone_e164

    return LivestockResponse(
        id=listing.id,
        seller_id=listing.seller_id,
        title=listing.title,
        category=listing.category,
        breed=listing.breed,
        age_months=listing.age_months,
        health_status=listing.health_status,
        price=listing.price,
        location=listing.location,
        quantity=listing.quantity,
        description=listing.description,
        availability_status=listing.availability_status,
        contact_phone=seller_phone,
        image_url=listing.image_url,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        seller_name=seller_name,
        seller_phone=seller_phone,
    )


def list_listings(
    db: Session,
    category: str | None = None,
    health_status: str | None = None,
    availability_status: str | None = None,
    search: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[LivestockListing]:
    stmt = (
        select(LivestockListing)
        .options(
            joinedload(LivestockListing.seller).joinedload(User.farmer_profile),
            joinedload(LivestockListing.seller).joinedload(User.buyer_profile),
        )
        .order_by(LivestockListing.created_at.desc())
    )

    if category:
        stmt = stmt.where(LivestockListing.category == category.upper())
    if health_status:
        stmt = stmt.where(LivestockListing.health_status == health_status.upper())
    if availability_status:
        stmt = stmt.where(LivestockListing.availability_status == availability_status.upper())
    else:
        # Default to showing available
        stmt = stmt.where(LivestockListing.availability_status == "AVAILABLE")

    if min_price is not None:
        stmt = stmt.where(LivestockListing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(LivestockListing.price <= max_price)

    if search:
        search_filter = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                LivestockListing.title.ilike(search_filter),
                LivestockListing.breed.ilike(search_filter),
                LivestockListing.location.ilike(search_filter),
                LivestockListing.description.ilike(search_filter),
            )
        )

    return list(db.scalars(stmt.limit(limit).offset(offset)).unique().all())


def list_my_listings(db: Session, seller_id: UUID) -> list[LivestockListing]:
    stmt = (
        select(LivestockListing)
        .options(
            joinedload(LivestockListing.seller).joinedload(User.farmer_profile),
            joinedload(LivestockListing.seller).joinedload(User.buyer_profile),
        )
        .where(LivestockListing.seller_id == seller_id)
        .order_by(LivestockListing.created_at.desc())
    )
    return list(db.scalars(stmt).unique().all())


def get_listing(db: Session, listing_id: UUID) -> LivestockListing:
    stmt = (
        select(LivestockListing)
        .options(
            joinedload(LivestockListing.seller).joinedload(User.farmer_profile),
            joinedload(LivestockListing.seller).joinedload(User.buyer_profile),
        )
        .where(LivestockListing.id == listing_id)
    )
    listing = db.scalar(stmt)
    if not listing:
        raise _not_found()
    return listing


def create_listing(
    db: Session, seller_id: UUID, payload: LivestockCreate
) -> LivestockListing:
    data = payload.model_dump()
    listing = LivestockListing(seller_id=seller_id, **data)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return get_listing(db, listing.id)


def update_listing(
    db: Session,
    user_id: UUID,
    is_admin: bool,
    listing_id: UUID,
    payload: LivestockUpdate,
) -> LivestockListing:
    listing = get_listing(db, listing_id)
    if not is_admin and listing.seller_id != user_id:
        raise _forbidden()

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)

    db.commit()
    db.refresh(listing)
    return get_listing(db, listing.id)


def delete_listing(
    db: Session, user_id: UUID, is_admin: bool, listing_id: UUID
) -> None:
    listing = get_listing(db, listing_id)
    if not is_admin and listing.seller_id != user_id:
        raise _forbidden()

    db.delete(listing)
    db.commit()
