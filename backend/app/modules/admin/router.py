from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.people import BuyerProfile, FarmerProfile, User
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles
from app.modules.notifications import service as notifications_service

router = APIRouter(prefix="/admin", tags=["admin"])


def _count_users(db: Session, *criteria: object) -> int:
    statement = select(func.count(User.id))
    for criterion in criteria:
        statement = statement.where(criterion)
    return db.scalar(statement) or 0


@router.get(
    "/overview",
    summary="Return administrative user statistics (ADMIN only)",
)
def admin_overview(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    total = _count_users(db)
    active = _count_users(db, User.status == "ACTIVE")
    pending = _count_users(db, User.status == "PENDING")
    farmers = _count_users(db, User.role == "FARMER")
    buyers = _count_users(db, User.role == "BUYER")
    bulk_buyers = _count_users(db, User.role == "BULK_BUYER")
    admins = _count_users(db, User.role == "ADMIN")
    return {
        "total_users": total,
        "active_users": active,
        "pending_users": pending,
        "farmers": farmers,
        "buyers": buyers,
        "bulk_buyers": bulk_buyers,
        "admins": admins,
    }


def _farmer_queue_item(profile: FarmerProfile, user: User) -> dict[str, object]:
    return {
        "profile_id": str(profile.id),
        "user_id": str(user.id),
        "phone_e164": user.phone_e164,
        "full_name": profile.full_name,
        "verification_status": profile.verification_status,
        "created_at": profile.created_at,
    }


@router.get(
    "/farmers",
    summary="Return the farmer verification queue (ADMIN only)",
)
def admin_farmers(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, object]]:
    rows = db.execute(
        select(FarmerProfile, User).join(User, User.id == FarmerProfile.user_id)
    ).all()
    return [_farmer_queue_item(profile, user) for profile, user in rows]


def _set_verification_status(
    db: Session, profile_id: UUID, new_status: str, _admin: User
) -> dict[str, object]:
    profile = db.get(FarmerProfile, profile_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )
    profile.verification_status = new_status
    db.commit()
    user = db.get(User, profile.user_id)
    if new_status == "VERIFIED" and user is not None:
        notifications_service.emit(
            db, "verification", user_id=user.id, role=user.role, changed_by=_admin
        )
        db.commit()
    db.refresh(profile)
    return _farmer_queue_item(profile, user)


@router.post(
    "/farmers/{profile_id}/verify",
    summary="Set a farmer profile to VERIFIED (mock; ADMIN only)",
)
def admin_verify_farmer(
    profile_id: UUID,
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return _set_verification_status(db, profile_id, "VERIFIED", _admin)


@router.post(
    "/farmers/{profile_id}/reject",
    summary="Set a farmer profile to REJECTED (mock; ADMIN only)",
)
def admin_reject_farmer(
    profile_id: UUID,
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return _set_verification_status(db, profile_id, "REJECTED", _admin)


def _buyer_queue_item(profile: BuyerProfile, user: User) -> dict[str, object]:
    return {
        "profile_id": str(profile.id),
        "user_id": str(user.id),
        "phone_e164": user.phone_e164,
        "full_name": profile.full_name,
        "buyer_type": profile.buyer_type,
        "business_name": profile.business_name,
        "verification_status": profile.verification_status,
        "payment_verification_status": profile.payment_verification_status,
        "created_at": profile.created_at,
    }


@router.get(
    "/buyers",
    summary="Return the buyer verification queue (ADMIN only)",
)
def admin_buyers(
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict[str, object]]:
    rows = db.execute(select(BuyerProfile, User).join(User, User.id == BuyerProfile.user_id)).all()
    return [_buyer_queue_item(profile, user) for profile, user in rows]


def _get_buyer_profile(db: Session, profile_id: UUID) -> BuyerProfile:
    profile = db.get(BuyerProfile, profile_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found",
        )
    return profile


def _set_buyer_status(
    db: Session, profile_id: UUID, field: str, new_status: str
) -> dict[str, object]:
    profile = _get_buyer_profile(db, profile_id)
    setattr(profile, field, new_status)
    db.commit()
    user = db.get(User, profile.user_id)
    if new_status == "VERIFIED" and user is not None:
        notifications_service.emit(
            db, "verification", user_id=user.id, role=user.role
        )
        db.commit()
    db.refresh(profile)
    return _buyer_queue_item(profile, user)


@router.post(
    "/buyers/{profile_id}/verify",
    summary="Set a buyer identity to VERIFIED (mock; ADMIN only)",
)
def admin_verify_buyer(
    profile_id: UUID,
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return _set_buyer_status(db, profile_id, "verification_status", "VERIFIED")


@router.post(
    "/buyers/{profile_id}/reject",
    summary="Set a buyer identity to REJECTED (mock; ADMIN only)",
)
def admin_reject_buyer(
    profile_id: UUID,
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return _set_buyer_status(db, profile_id, "verification_status", "REJECTED")


@router.post(
    "/buyers/{profile_id}/payment/verify",
    summary="Set a buyer's payment verification to VERIFIED (mock; ADMIN only)",
)
def admin_verify_buyer_payment(
    profile_id: UUID,
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return _set_buyer_status(db, profile_id, "payment_verification_status", "VERIFIED")


@router.post(
    "/buyers/{profile_id}/payment/reject",
    summary="Set a buyer's payment verification to REJECTED (mock; ADMIN only)",
)
def admin_reject_buyer_payment(
    profile_id: UUID,
    _admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    return _set_buyer_status(db, profile_id, "payment_verification_status", "REJECTED")
