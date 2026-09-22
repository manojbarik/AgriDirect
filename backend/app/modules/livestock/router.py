"""Livestock API router."""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity.dependencies import get_current_user, require_roles
from app.modules.livestock import service
from app.modules.livestock.schemas import (
    LivestockCreate,
    LivestockResponse,
    LivestockUpdate,
)

router = APIRouter(prefix="/livestock", tags=["livestock"])


@router.get("", response_model=list[LivestockResponse], summary="List livestock listings")
def list_listings(
    category: str | None = Query(None, description="Category filter (CATTLE, BUFFALO, etc.)"),
    health_status: str | None = Query(None, description="Health status filter"),
    availability_status: str | None = Query(None, description="Availability filter"),
    search: str | None = Query(None, description="Search keyword across title, breed, location"),
    min_price: Decimal | None = Query(None, ge=0, description="Minimum price"),
    max_price: Decimal | None = Query(None, ge=0, description="Maximum price"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[LivestockResponse]:
    items = service.list_listings(
        db,
        category=category,
        health_status=health_status,
        availability_status=availability_status,
        search=search,
        min_price=min_price,
        max_price=max_price,
        limit=limit,
        offset=offset,
    )
    return [service.to_response(item) for item in items]


@router.get("/my", response_model=list[LivestockResponse], summary="List my livestock listings")
def list_my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LivestockResponse]:
    items = service.list_my_listings(db, current_user.id)
    return [service.to_response(item) for item in items]


@router.get("/{listing_id}", response_model=LivestockResponse, summary="Get livestock listing details")
def get_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> LivestockResponse:
    item = service.get_listing(db, listing_id)
    return service.to_response(item)


@router.post(
    "",
    response_model=LivestockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new livestock listing",
)
def create_listing(
    payload: LivestockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("FARMER", "ADMIN")),
) -> LivestockResponse:
    listing = service.create_listing(db, current_user.id, payload)
    return service.to_response(listing)


@router.put("/{listing_id}", response_model=LivestockResponse, summary="Update livestock listing")
def update_listing(
    listing_id: UUID,
    payload: LivestockUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LivestockResponse:
    is_admin = current_user.role == "ADMIN"
    listing = service.update_listing(db, current_user.id, is_admin, listing_id, payload)
    return service.to_response(listing)


@router.delete(
    "/{listing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete livestock listing",
)
def delete_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    is_admin = current_user.role == "ADMIN"
    service.delete_listing(db, current_user.id, is_admin, listing_id)
