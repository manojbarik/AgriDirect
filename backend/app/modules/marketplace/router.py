from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.farmer.schemas import CropCatalogItem
from app.modules.marketplace import service
from app.modules.marketplace.schemas import (
    MarketplaceFarmerProfileResponse,
    MarketplaceListingResponse,
    MarketplaceListingsPage,
    MarketplaceLocationItem,
)

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


def crop_catalog_item(crop) -> CropCatalogItem:
    return CropCatalogItem(
        id=crop.id,
        name=crop.name,
        variety=crop.variety,
        category=crop.category,
        default_unit=crop.default_unit,
    )


@router.get(
    "/crops",
    response_model=list[CropCatalogItem],
    summary="Return the crop catalog, optionally filtered by search term",
)
def list_crop_catalog(
    q: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
) -> list[CropCatalogItem]:
    return [crop_catalog_item(crop) for crop in service.list_crop_catalog(db, q)]


@router.get(
    "/locations",
    response_model=list[MarketplaceLocationItem],
    summary="Return distinct states/districts that currently have published listings",
)
def list_marketplace_locations(db: Session = Depends(get_db)) -> list[MarketplaceLocationItem]:
    return service.list_locations(db)


@router.get(
    "/listings",
    response_model=MarketplaceListingsPage,
    summary="Search published crop listings with filters, sorting, and pagination",
)
def search_marketplace_listings(
    q: str | None = Query(default=None, max_length=120),
    category: str | None = Query(default=None, max_length=100),
    crop_id: UUID | None = None,
    state: str | None = Query(default=None, max_length=100),
    district: str | None = Query(default=None, max_length=100),
    grade: str | None = Query(default=None, max_length=80),
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    sort: str = Query(default="newest"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> MarketplaceListingsPage:
    return service.search_listings(
        db,
        q=q,
        category=category,
        crop_id=crop_id,
        state=state,
        district=district,
        grade=grade,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/listings/{listing_id}",
    response_model=MarketplaceListingResponse,
    summary="Return one published listing with farmer and farm context",
)
def get_marketplace_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> MarketplaceListingResponse:
    return service.get_listing(db, listing_id)


@router.get(
    "/farmers/{farmer_id}",
    response_model=MarketplaceFarmerProfileResponse,
    summary="Return a public farmer profile with farms and marketplace stats",
)
def get_marketplace_farmer(
    farmer_id: UUID,
    db: Session = Depends(get_db),
) -> MarketplaceFarmerProfileResponse:
    return service.get_farmer_profile(db, farmer_id)
