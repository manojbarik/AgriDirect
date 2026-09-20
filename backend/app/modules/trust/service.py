"""Trust score service: computes, stores, and serves transparent trust scores."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.marketplace import CropListing, Order
from app.db.models.people import BuyerProfile, FarmerProfile, User
from app.db.models.social import Rating, TrustScore, TrustScoreHistory
from app.modules.trust import engine
from app.modules.trust.schemas import (
    PublicFarmerTrustSnapshot,
    PublicTopFarmer,
    PublicTrustOverview,
    TrustScoreAdminItem,
    TrustScoreDetail,
    TrustScoreHistoryEntry,
)

LIMITS_NOTE = (
    "This score is an informational trust signal. It is computed only from "
    "measurable transaction factors - never from sensitive attributes - and it "
    "is never the sole basis for an irreversible decision."
)

HISTORY_INITIAL = "INITIAL"
HISTORY_RECALCULATED = "RECALCULATED"
HISTORY_ADMIN = "ADMIN_RECALCULATED"


def _require_scored_role(user: User) -> None:
    if user.role not in ("FARMER", "BUYER"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trust scores are calculated only for FARMER and BUYER accounts",
        )


def _full_name(db: Session, user: User) -> str | None:
    if user.role == "FARMER":
        profile = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
        return profile.full_name if profile is not None else None
    if user.role == "BUYER":
        profile = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        return profile.full_name if profile is not None else None
    return None


def calculate(db: Session, user: User) -> engine.TrustComputation:
    _require_scored_role(user)
    if user.role == "FARMER":
        profile = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
        if profile is None:
            # Never match real rows: isolated profile so a fresh account scores NEW/zero.
            profile = FarmerProfile(
                id=uuid4(), user_id=user.id, full_name="Farmer", verification_status="NONE"
            )
        return engine.compute_farmer_factors(db, profile)
    profile = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
    if profile is None:
        profile = BuyerProfile(
            id=uuid4(),
            user_id=user.id,
            full_name="Buyer",
            verification_status="NONE",
            payment_verification_status="NONE",
        )
    return engine.compute_buyer_factors(db, profile, user)


def _write_history(
    db: Session,
    computation: engine.TrustComputation,
    user: User,
    *,
    reason: str,
    changed_by: User | None,
) -> None:
    db.add(
        TrustScoreHistory(
            user_id=user.id,
            score=computation.score,
            score_band=computation.band,
            calculation_version=computation.calculation_version,
            reason=reason,
            breakdown=engine.dumps(computation),
            changed_by_id=changed_by.id if changed_by is not None else None,
            changed_by_role=changed_by.role if changed_by is not None else user.role,
            created_at=datetime.now(timezone.utc),
        )
    )


def _prune_history(db: Session, user: User) -> None:
    limit = max(1, get_settings().trust_history_limit)
    stored_ids = db.scalars(
        select(TrustScoreHistory.id)
        .where(TrustScoreHistory.user_id == user.id)
        .order_by(TrustScoreHistory.created_at.desc())
    ).all()
    for history_id in stored_ids[limit:]:
        db.execute(delete(TrustScoreHistory).where(TrustScoreHistory.id == history_id))


def maintain(
    db: Session,
    user: User,
    *,
    changed_by: User | None = None,
    force: bool = False,
) -> engine.TrustComputation:
    """Compute the current score, upsert the stored row, and record history.

    A history row is written whenever the stored score is created, whenever the
    computed score changes, or when an administrator forces a recalculation.
    """
    computation = calculate(db, user)

    stored = db.scalar(select(TrustScore).where(TrustScore.user_id == user.id))
    score_changed = stored is None or float(stored.score) != float(computation.score)

    if stored is None:
        stored = TrustScore(
            user_id=user.id,
            score=computation.score,
            score_band=computation.band,
            calculation_version=computation.calculation_version,
            contributing_factors=engine.dumps(computation),
            calculated_at=datetime.now(timezone.utc),
        )
        db.add(stored)
        created = True
    else:
        created = False
        stored.score = computation.score
        stored.score_band = computation.band
        stored.calculation_version = computation.calculation_version
        stored.contributing_factors = engine.dumps(computation)
        stored.calculated_at = datetime.now(timezone.utc)

    reason = HISTORY_INITIAL if created else HISTORY_ADMIN if force else HISTORY_RECALCULATED
    if created or score_changed or force:
        _write_history(db, computation, user, reason=reason, changed_by=changed_by)

    db.flush()
    _prune_history(db, user)
    db.commit()
    return computation


def get_history(db: Session, user_id: UUID, limit: int | None = None) -> list[TrustScoreHistoryEntry]:
    statement = (
        select(TrustScoreHistory)
        .where(TrustScoreHistory.user_id == user_id)
        .order_by(TrustScoreHistory.created_at.desc())
    )
    if limit is not None:
        statement = statement.limit(limit)
    return [TrustScoreHistoryEntry.model_validate(row) for row in db.scalars(statement).all()]


def get_scored_user(db: Session, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if user is None or user.role not in ("FARMER", "BUYER"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trust score not found for this user",
        )
    return user


def build_detail(db: Session, user: User, *, changed_by: User | None = None, force: bool = False) -> TrustScoreDetail:
    computation = maintain(db, user, changed_by=changed_by, force=force)
    return TrustScoreDetail(
        user_id=user.id,
        role=user.role,
        full_name=_full_name(db, user),
        score=computation.score,
        score_band=computation.band,
        calculation_version=computation.calculation_version,
        calculated_at=datetime.now(timezone.utc),
        components=[
            {
                "key": component.key,
                "label": component.label,
                "points": component.points,
                "max_points": component.max_points,
                "factors": [
                    {
                        "key": factor.key,
                        "label": factor.label,
                        "component": factor.component,
                        "value": factor.value,
                        "points": factor.points,
                        "max_points": factor.max_points,
                        "detail": factor.detail,
                        "kind": factor.kind,
                    }
                    for factor in component.factors
                ],
            }
            for component in computation.components
        ],
        why=computation.why,
        concerns=computation.concerns,
        history=get_history(db, user.id, limit=get_settings().trust_history_limit),
        limits_note=LIMITS_NOTE,
    )


def list_trust_scores(
    db: Session,
    *,
    role: str | None = None,
    recalculate: bool = False,
    changed_by: User | None = None,
) -> list[TrustScoreAdminItem]:
    statement = select(User).where(User.role.in_(("FARMER", "BUYER")))
    if role in ("FARMER", "BUYER"):
        statement = statement.where(User.role == role)
    statement = statement.order_by(User.created_at)
    items: list[TrustScoreAdminItem] = []
    for user in db.scalars(statement).all():
        if recalculate:
            maintain(db, user, changed_by=changed_by)
        stored = db.scalar(select(TrustScore).where(TrustScore.user_id == user.id))
        items.append(
            TrustScoreAdminItem(
                user_id=user.id,
                role=user.role,
                full_name=_full_name(db, user),
                score=stored.score if stored is not None else 0,
                score_band=stored.score_band if stored is not None else "NEW",
                calculation_version=(
                    stored.calculation_version if stored is not None else "NOT_CALCULATED"
                ),
                calculated_at=stored.calculated_at if stored is not None else None,
            )
        )
    return items


def public_overview(db: Session) -> PublicTrustOverview:
    """Aggregate, non-sensitive trust stats for the anonymous landing page."""
    from app.db.models.people import Farm

    total_farmers = db.scalar(select(func.count(FarmerProfile.id))) or 0
    total_buyers = db.scalar(select(func.count(BuyerProfile.id))) or 0
    avg_raw = db.scalar(select(func.avg(TrustScore.score)))
    avg_score = Decimal(str(round(float(avg_raw), 1))) if avg_raw is not None else None
    bands = {"high": 0, "medium": 0, "low": 0}
    for score in db.scalars(select(TrustScore.score)).all():
        value = float(score)
        if value >= 75:
            bands["high"] += 1
        elif value >= 50:
            bands["medium"] += 1
        else:
            bands["low"] += 1

    top_farmers: list[PublicTopFarmer] = []
    rows = db.execute(
        select(FarmerProfile, TrustScore.score)
        .join(User, User.id == FarmerProfile.user_id)
        .join(TrustScore, TrustScore.user_id == User.id)
        .order_by(TrustScore.score.desc(), FarmerProfile.created_at.asc())
        .limit(6)
    ).all()
    for profile, score in rows:
        listings = (
            db.scalar(
                select(func.count(CropListing.id)).where(CropListing.farmer_id == profile.id)
            )
            or 0
        )
        farm = db.scalar(
            select(Farm)
            .where(Farm.farmer_id == profile.id)
            .order_by(Farm.created_at.asc())
        )
        top_farmers.append(
            PublicTopFarmer(
                full_name=profile.full_name,
                score=Decimal(str(score)),
                state=farm.state if farm else None,
                listing_count=listings,
            )
        )
    return PublicTrustOverview(
        total_farmers=total_farmers,
        total_buyers=total_buyers,
        avg_score=avg_score,
        bands=bands,
        top_farmers=top_farmers,
    )


def public_farmer_snapshot(db: Session, farmer_profile_id: UUID) -> PublicFarmerTrustSnapshot:
    """Non-sensitive public trust snapshot for one farmer profile."""
    profile = db.get(FarmerProfile, farmer_profile_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found",
        )
    stored = db.scalar(select(TrustScore).where(TrustScore.user_id == profile.user_id))
    rating_avg = db.scalar(
        select(func.avg(Rating.score)).where(Rating.rated_user_id == profile.user_id)
    )
    completed = (
        db.scalar(
            select(func.count(Order.id)).where(
                Order.farmer_id == profile.id, Order.status == "COMPLETED"
            )
        )
        or 0
    )
    active_listings = (
        db.scalar(
            select(func.count(CropListing.id)).where(
                CropListing.farmer_id == profile.id,
                CropListing.status == "PUBLISHED",
                CropListing.available_quantity > 0,
            )
        )
        or 0
    )
    return PublicFarmerTrustSnapshot(
        farmer_profile_id=profile.id,
        farmer_id=profile.user_id,
        full_name=profile.full_name,
        verification_status=profile.verification_status,
        score=Decimal(str(stored.score)) if stored is not None else Decimal("0"),
        score_band=stored.score_band if stored is not None else "NEW",
        rating_avg=(
            Decimal(str(round(float(rating_avg), 2))) if rating_avg is not None else None
        ),
        completed_orders=completed,
        active_listings_count=active_listings,
    )