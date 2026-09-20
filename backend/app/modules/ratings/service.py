"""Two-way ratings and reviews for completed orders.

Only the two parties of a COMPLETED order may review each other, each exactly once.
Every valid review updates the reviewee's trust score through the trust engine.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.marketplace import Order
from app.db.models.people import BuyerProfile, ConsumerProfile, FarmerProfile, User
from app.db.models.social import Rating
from app.modules.notifications import service as notifications_service
from app.modules.ratings.schemas import (
    OrderRatingResponse,
    RatingCreate,
    RatingOut,
    UserRatingSummary,
)
from app.modules.trust import service as trust_service


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _get_order(db: Session, order_id: UUID) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise _not_found("Order not found")
    return order


def _parties(
    db: Session, order: Order
) -> tuple[FarmerProfile | None, BuyerProfile | ConsumerProfile | None]:
    farmer = db.get(FarmerProfile, order.farmer_id) if order.farmer_id else None
    if order.order_type == "B2C":
        consumer = db.get(ConsumerProfile, order.consumer_id) if order.consumer_id else None
        return farmer, consumer
    buyer = db.get(BuyerProfile, order.buyer_id) if order.buyer_id else None
    return farmer, buyer


def _role_of(db: Session, order: Order, user: User) -> tuple[bool, bool]:
    """Return (is_farmer, is_buyer) for the user on this order."""
    farmer, buyer = _parties(db, order)
    return bool(farmer and farmer.user_id == user.id), bool(buyer and buyer.user_id == user.id)


def _display_name(user: User | None, db: Session) -> str:
    if user is None:
        return "User"
    if user.role == "FARMER" and user.farmer_profile is not None:
        profile = db.get(FarmerProfile, user.farmer_profile.id)
        return profile.full_name if profile and profile.full_name else user.phone_e164
    if user.role == "BUYER" and user.buyer_profile is not None:
        profile = db.get(BuyerProfile, user.buyer_profile.id)
        return profile.full_name if profile and profile.full_name else user.phone_e164
    if user.role == "CONSUMER":
        return user.email or user.phone_e164 or "A consumer"
    return user.phone_e164


def _rating_out(db: Session, rating: Rating) -> RatingOut:
    rater = db.get(User, rating.rater_id)
    reviewee = db.get(User, rating.rated_user_id)
    return RatingOut(
        id=rating.id,
        order_id=rating.order_id,
        rating=rating.score,
        comment=rating.comment,
        reviewer_id=rating.rater_id,
        reviewer_name=_display_name(rater, db),
        reviewer_role=str(rater.role) if rater else "USER",
        reviewee_id=rating.rated_user_id,
        reviewee_name=_display_name(reviewee, db),
        created_at=rating.created_at,
    )


def create_rating(db: Session, user: User, payload: RatingCreate) -> RatingOut:
    order = _get_order(db, payload.order_id)
    is_farmer, is_buyer = _role_of(db, order, user)
    if not (is_farmer or is_buyer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer or farmer on this order can submit a review",
        )
    if order.status != "COMPLETED":
        raise _conflict("Reviews are only allowed once the order is completed")

    farmer, buyer = _parties(db, order)
    if not farmer or not buyer:
        raise _not_found("Order not found")
    reviewee_user_id = buyer.user_id if is_farmer else farmer.user_id

    existing = db.scalar(
        select(Rating).where(
            Rating.order_id == order.id,
            Rating.rater_id == user.id,
            Rating.rated_user_id == reviewee_user_id,
        )
    )
    if existing is not None:
        raise _conflict("You have already reviewed this order")

    rating = Rating(
        order_id=order.id,
        rater_id=user.id,
        rated_user_id=reviewee_user_id,
        score=payload.rating,
        comment=payload.comment,
    )
    db.add(rating)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise _conflict("You have already reviewed this order") from exc

    reviewee = db.get(User, reviewee_user_id)
    if reviewee is not None:
        trust_service.maintain(db, reviewee, changed_by=user)
    db.commit()
    db.refresh(rating)

    notifications_service.emit(
        db,
        "new_review",
        user_id=reviewee_user_id,
        reviewer_name="Farmer" if is_farmer else "Buyer",
        rating=str(payload.rating),
        order=order.public_order_number,
        changed_by=user,
    )
    db.commit()
    return _rating_out(db, rating)


def order_rating_state(db: Session, user: User, order_id: UUID) -> OrderRatingResponse:
    order = _get_order(db, order_id)
    is_farmer, is_buyer = _role_of(db, order, user)
    if not (is_farmer or is_buyer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer or farmer on this order can view its reviews",
        )
    farmer, buyer = _parties(db, order)
    if not farmer or not buyer:
        raise _not_found("Order not found")

    my_user_id = user.id
    counterpart_user_id = buyer.user_id if is_farmer else farmer.user_id
    my_rating = db.scalar(
        select(Rating).where(Rating.order_id == order.id, Rating.rater_id == my_user_id)
    )
    counterpart_rating = db.scalar(
        select(Rating).where(Rating.order_id == order.id, Rating.rater_id == counterpart_user_id)
    )
    return OrderRatingResponse(
        order_id=order.id,
        status=order.status,
        can_rate=order.status == "COMPLETED" and my_rating is None,
        my_rating=_rating_out(db, my_rating) if my_rating else None,
        counterpart_rating=_rating_out(db, counterpart_rating) if counterpart_rating else None,
    )


def user_rating_summary(db: Session, user_id: UUID) -> UserRatingSummary:
    avg = db.scalar(
        select(func.avg(Rating.score)).where(Rating.rated_user_id == user_id)
    )
    count = db.scalar(select(func.count(Rating.id)).where(Rating.rated_user_id == user_id)) or 0
    history = db.scalars(
        select(Rating)
        .where(Rating.rated_user_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(20)
    ).all()
    return UserRatingSummary(
        user_id=user_id,
        average_rating=Decimal(str(round(float(avg), 2))) if avg is not None else None,
        rating_count=count,
        history=[_rating_out(db, rating) for rating in history],
    )