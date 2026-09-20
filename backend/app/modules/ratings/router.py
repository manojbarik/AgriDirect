from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles
from app.modules.ratings import service
from app.modules.ratings.schemas import (
    OrderRatingResponse,
    RatingCreate,
    RatingOut,
    UserRatingSummary,
)

router = APIRouter(prefix="/ratings", tags=["ratings"])

PartyDependency = require_roles("BUYER", "CONSUMER", "FARMER", "BULK_BUYER")


@router.post(
    "",
    response_model=RatingOut,
    status_code=201,
    summary="Rate the other party on a completed order (BUYER or FARMER)",
)
def create_rating(
    payload: RatingCreate,
    _user: User = Depends(PartyDependency),
    db: Session = Depends(get_db),
) -> RatingOut:
    return service.create_rating(db, _user, payload)


@router.get(
    "/orders/{order_id}",
    response_model=OrderRatingResponse,
    summary="Rating state for one order (party only)",
)
def order_rating_state(
    order_id: UUID,
    _user: User = Depends(PartyDependency),
    db: Session = Depends(get_db),
) -> OrderRatingResponse:
    return service.order_rating_state(db, _user, order_id)


@router.get(
    "/users/{user_id}",
    response_model=UserRatingSummary,
    summary="Average rating and public review history for a user",
)
def user_rating_summary(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> UserRatingSummary:
    return service.user_rating_summary(db, user_id)