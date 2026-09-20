from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles
from app.modules.trust import service
from app.modules.trust.schemas import (
    PublicFarmerTrustSnapshot,
    PublicTrustOverview,
    TrustScoreAdminItem,
    TrustScoreDetail,
)

router = APIRouter(tags=["trust"])

PUBLIC_TRUST_LIMITER = rate_limit(limit=30, window_seconds=60, bucket="trust_public")


@router.get(
    "/trust-score/me",
    response_model=TrustScoreDetail,
    summary="Return your current transparent trust score with the factor breakdown",
)
def trust_score_me(
    current_user: User = Depends(require_roles("FARMER", "BUYER", "BULK_BUYER")),
    db: Session = Depends(get_db),
) -> TrustScoreDetail:
    return service.build_detail(db, current_user)


@router.get(
    "/admin/trust-scores",
    response_model=list[TrustScoreAdminItem],
    summary="List trust scores for all farmers and buyers (ADMIN only)",
)
def admin_trust_scores(
    role: str | None = Query(default=None, pattern="^(FARMER|BUYER)$"),
    recalculate: bool = Query(default=False),
    admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[TrustScoreAdminItem]:
    return service.list_trust_scores(
        db, role=role, recalculate=recalculate, changed_by=admin
    )


@router.get(
    "/admin/trust-scores/{user_id}",
    response_model=TrustScoreDetail,
    summary="Return a user's trust score breakdown (ADMIN only)",
)
def admin_trust_score_detail(
    user_id: UUID,
    admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> TrustScoreDetail:
    user = service.get_scored_user(db, user_id)
    return service.build_detail(db, user, changed_by=admin)


@router.post(
    "/admin/trust-scores/{user_id}/recalculate",
    response_model=TrustScoreDetail,
    summary="Force a full recalculation of a user's trust score (ADMIN only)",
)
def admin_trust_score_recalculate(
    user_id: UUID,
    admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> TrustScoreDetail:
    user = service.get_scored_user(db, user_id)
    return service.build_detail(db, user, changed_by=admin, force=True)


@router.get(
    "/public/trust/overview",
    response_model=PublicTrustOverview,
    summary="Auth-free platform trust overview for the landing page",
)
def public_trust_overview(
    _: None = Depends(PUBLIC_TRUST_LIMITER),
    db: Session = Depends(get_db),
) -> PublicTrustOverview:
    return service.public_overview(db)


@router.get(
    "/public/trust/farmer/{farmer_profile_id}",
    response_model=PublicFarmerTrustSnapshot,
    summary="Auth-free public trust snapshot for a farmer profile",
)
def public_farmer_trust(
    farmer_profile_id: UUID,
    _: None = Depends(PUBLIC_TRUST_LIMITER),
    db: Session = Depends(get_db),
) -> PublicFarmerTrustSnapshot:
    return service.public_farmer_snapshot(db, farmer_profile_id)