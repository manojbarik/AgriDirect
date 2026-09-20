from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Order
from app.db.models.people import BuyerProfile, FarmerProfile, User
from app.db.session import get_db
from app.modules.escrow import service
from app.modules.escrow.schemas import EscrowResponse
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/escrow", tags=["escrow"])

OrderPartyDependency = require_roles("BUYER", "FARMER", "ADMIN", "BULK_BUYER")
PartyDependency = require_roles("BUYER", "FARMER", "BULK_BUYER")
AdminDependency = require_roles("ADMIN")


def _response(account) -> EscrowResponse:
    return EscrowResponse(
        id=account.id,
        order_id=account.order_id,
        buyer_id=account.buyer_id,
        farmer_id=account.farmer_id,
        currency=account.currency,
        amount_deposited=account.amount_deposited,
        amount_held=account.amount_held,
        amount_released=account.amount_released,
        amount_refunded=account.amount_refunded,
        status=account.status,
        deposited_at=account.deposited_at,
        released_at=account.released_at,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


def _get_order(db: Session, order_id: UUID) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _require_party(db: Session, user: User, order: Order) -> None:
    if user.role == "ADMIN":
        return
    buyer = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
    farmer = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    is_buyer = buyer is not None and buyer.id == order.buyer_id
    is_farmer = farmer is not None and farmer.id == order.farmer_id
    if not (is_buyer or is_farmer):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No escrow account found for this order",
        )


@router.get(
    "/orders/{order_id}",
    response_model=EscrowResponse,
    summary="Get the escrow account for an order (parties or admin)",
)
def order_escrow(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderPartyDependency),
) -> EscrowResponse:
    order = _get_order(db, order_id)
    _require_party(db, _user, order)
    return _response(service.get_order_escrow(db, order_id))


@router.get(
    "/me",
    response_model=list[EscrowResponse],
    summary="List escrow accounts where I am the farmer or the buyer",
)
def my_escrows(
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[EscrowResponse]:
    return [_response(account) for account in service.get_my_escrows(db, _user)]


admin_router = APIRouter(prefix="/admin", tags=["escrow-admin"])


@admin_router.get(
    "/escrow",
    response_model=list[EscrowResponse],
    summary="List all escrow accounts (ADMIN only)",
)
def admin_escrows(
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(AdminDependency),
) -> list[EscrowResponse]:
    return [
        _response(account)
        for account in service.list_admin_escrows(db, status_filter, page, page_size)
    ]