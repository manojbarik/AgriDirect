"""Escrow ledger service.

Keeps a visible escrow account per order on top of the existing payment
capture/refund flow. Deposits from captured payments move money into the
account; refunds move held money back to the buyer; releasing the escrow
happens only when the buyer confirms quality (order COMPLETED).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Order
from app.db.models.people import BuyerProfile, FarmerProfile
from app.db.models.transaction import EscrowAccount

MONEY = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def add_deposit(db: Session, order: Order, amount: Decimal) -> None:
    """Record a captured payment deposit for an order into its escrow account."""
    amount = _money(amount)
    account = db.scalar(select(EscrowAccount).where(EscrowAccount.order_id == order.id))
    if account is not None and account.status in ("RELEASED", "PARTIAL_RELEASE", "CLOSED"):
        return
    if account is None:
        farmer = db.get(FarmerProfile, order.farmer_id)
        buyer = db.get(BuyerProfile, order.buyer_id)
        account = EscrowAccount(
            order_id=order.id,
            buyer_id=buyer.user_id if buyer else order.buyer_id,
            farmer_id=farmer.user_id if farmer else order.farmer_id,
            currency=order.currency,
            status="OPEN",
        )
        db.add(account)
    now = datetime.now(timezone.utc)
    account.amount_deposited = _money((account.amount_deposited or Decimal("0")) + amount)
    account.amount_held = _money((account.amount_held or Decimal("0")) + amount)
    if account.deposited_at is None:
        account.deposited_at = now
    account.status = "FUNDED"
    db.flush()


def deduct_refund(db: Session, order: Order, amount: Decimal) -> None:
    """Shift held escrow money back to the buyer when a refund is processed."""
    amount = _money(amount)
    account = db.scalar(select(EscrowAccount).where(EscrowAccount.order_id == order.id))
    if account is None or account.status in ("RELEASED", "CLOSED"):
        return
    account.amount_held = _money(max(Decimal("0"), (account.amount_held or Decimal("0")) - amount))
    account.amount_refunded = _money((account.amount_refunded or Decimal("0")) + amount)
    if account.amount_held <= 0:
        account.status = "REFUNDED"
    elif account.amount_refunded > 0:
        account.status = "PARTIAL_RELEASE"
    db.flush()


def release_escrow(db: Session, order: Order) -> None:
    """Release held escrow money to the farmer once the order is COMPLETED."""
    if order.status != "COMPLETED":
        return
    account = db.scalar(select(EscrowAccount).where(EscrowAccount.order_id == order.id))
    if account is None or account.status in ("RELEASED", "CLOSED"):
        return
    held = account.amount_held or Decimal("0")
    now = datetime.now(timezone.utc)
    account.amount_released = _money((account.amount_released or Decimal("0")) + held)
    account.amount_held = Decimal("0")
    account.released_at = now
    account.status = (
        "PARTIAL_RELEASE" if (account.amount_refunded or Decimal("0")) > 0 else "RELEASED"
    )
    db.flush()


def get_order_escrow(db: Session, order_id: UUID) -> EscrowAccount:
    account = db.scalar(select(EscrowAccount).where(EscrowAccount.order_id == order_id))
    if account is None:
        raise _not_found("No escrow account found for this order")
    return account


def get_my_escrows(db: Session, user: object) -> list[EscrowAccount]:
    stmt = select(EscrowAccount)
    if user.role == "FARMER":
        profile = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
        if profile is None:
            return []
        stmt = stmt.where(EscrowAccount.farmer_id == user.id)
    elif user.role == "BUYER":
        profile = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        if profile is None:
            return []
        stmt = stmt.where(EscrowAccount.buyer_id == user.id)
    else:
        return []
    return db.scalars(stmt.order_by(EscrowAccount.created_at.desc())).all()


def list_admin_escrows(
    db: Session, status_filter: str | None, page: int, page_size: int
) -> list[EscrowAccount]:
    stmt = select(EscrowAccount)
    if status_filter:
        stmt = stmt.where(EscrowAccount.status == status_filter)
    return db.scalars(
        stmt.order_by(EscrowAccount.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()