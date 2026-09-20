"""Direct contract service.

A contract is a fixed agreement between a buyer and a farmer that bypasses
marketplace negotiation. A buyer proposes terms against a published listing,
the farmer accepts or counters, and once accepted the buyer can create a
single order from it (guarded to happen only once).
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Contract, CropListing, Order
from app.db.models.people import User
from app.modules.contracts.schemas import (
    ContractCounter,
    ContractCreate,
    ContractResponse,
)
from app.modules.identity.security import coerce_utc
from app.modules.orders import service as orders_service
from app.modules.orders.schemas import OrderCreate

NEGOTIABLE_STATUSES = ("PENDING", "COUNTERED")
EXPIRABLE_STATUSES = ("PENDING", "COUNTERED")


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_contract(db: Session, contract_id: UUID) -> Contract:
    contract = db.get(Contract, contract_id)
    if contract is None:
        raise _not_found("Contract not found")
    return contract


def _require_owner(contract: Contract, user: User) -> None:
    if user.role == "ADMIN":
        return
    if user.role in ("FARMER", "BUYER", "BULK_BUYER") and user.id in (contract.farmer_id, contract.buyer_id):
        return
    raise _not_found("Contract not found")


def _auto_expire(db: Session, contract: Contract) -> None:
    now = _now()
    if (
        contract.status in EXPIRABLE_STATUSES
        and contract.expires_at is not None
        and coerce_utc(contract.expires_at) <= now
    ):
        contract.status = "EXPIRED"
        db.flush()


def _sync_completed_order(db: Session, contract: Contract) -> None:
    if contract.status != "ACTIVE" or contract.order_id is None:
        return
    order = db.get(Order, contract.order_id)
    if order is not None and order.status == "COMPLETED" and contract.completed_at is None:
        contract.status = "COMPLETED"
        contract.completed_at = _now()
        db.flush()


def _response(contract: Contract) -> ContractResponse:
    return ContractResponse(
        id=contract.id,
        contract_number=contract.contract_number,
        listing_id=contract.listing_id,
        farmer_id=contract.farmer_id,
        buyer_id=contract.buyer_id,
        crop_id=contract.crop_id,
        quantity_kg=contract.quantity_kg,
        agreed_price_per_kg=contract.agreed_price_per_kg,
        total_amount=contract.total_amount,
        currency=contract.currency,
        payment_terms=contract.payment_terms,
        delivery_deadline=contract.delivery_deadline,
        status=contract.status,
        expires_at=contract.expires_at,
        terms_text=contract.terms_text,
        accepted_at=contract.accepted_at,
        completed_at=contract.completed_at,
        order_id=contract.order_id,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
    )


def create_contract(db: Session, user: User, payload: ContractCreate) -> ContractResponse:
    if user.role not in ("BUYER", "BULK_BUYER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only buyers can create direct contracts",
        )
    listing = db.get(CropListing, payload.listing_id)
    if listing is None or listing.status != "PUBLISHED":
        raise _bad_request("Listing is not available for a contract")
    farmer = db.get(User, listing.farmer.user_id) if listing.farmer else None
    if farmer is None:
        raise _bad_request("Listing has no farmer to contract with")
    total = _money(payload.agreed_price_per_kg * payload.quantity_kg)
    now = _now()
    contract = Contract(
        contract_number=f"C-{secrets.token_hex(3).upper()}",
        listing_id=listing.id,
        farmer_id=farmer.id,
        buyer_id=user.id,
        crop_id=listing.crop_id,
        quantity_kg=payload.quantity_kg,
        agreed_price_per_kg=payload.agreed_price_per_kg,
        total_amount=total,
        currency=payload.currency,
        payment_terms=payload.payment_terms,
        delivery_deadline=payload.delivery_deadline,
        status="PENDING",
        expires_at=now + timedelta(hours=72),
        terms_text=payload.terms_text,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return _response(contract)


def list_contracts(
    db: Session, user: User, status_filter: str | None, page: int, page_size: int
) -> list[ContractResponse]:
    stmt = select(Contract)
    if user.role == "FARMER":
        stmt = stmt.where(Contract.farmer_id == user.id)
    elif user.role in ("BUYER", "BULK_BUYER"):
        stmt = stmt.where(Contract.buyer_id == user.id)
    else:
        return []
    if status_filter:
        stmt = stmt.where(Contract.status == status_filter)
    contracts = db.scalars(
        stmt.order_by(Contract.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    for contract in contracts:
        _auto_expire(db, contract)
        _sync_completed_order(db, contract)
    if contracts:
        db.commit()
    return [_response(contract) for contract in contracts]


def get_contract(db: Session, user: User, contract_id: UUID) -> ContractResponse:
    contract = _get_contract(db, contract_id)
    _require_owner(contract, user)
    _auto_expire(db, contract)
    _sync_completed_order(db, contract)
    db.commit()
    db.refresh(contract)
    return _response(contract)


def accept_contract(db: Session, user: User, contract_id: UUID) -> ContractResponse:
    if user.role != "FARMER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the farmer can accept a contract",
        )
    contract = _get_contract(db, contract_id)
    _require_owner(contract, user)
    if user.id != contract.farmer_id:
        raise _not_found("Contract not found")
    _auto_expire(db, contract)
    if contract.status not in NEGOTIABLE_STATUSES:
        raise _conflict(f"Contract in {contract.status} status cannot be accepted")
    contract.status = "ACCEPTED"
    contract.accepted_at = _now()
    db.commit()
    db.refresh(contract)
    return _response(contract)


def counter_contract(
    db: Session, user: User, contract_id: UUID, payload: ContractCounter
) -> ContractResponse:
    if user.role not in ("FARMER", "BUYER", "BULK_BUYER"):
        raise _conflict("Only a contract party can counter")
    contract = _get_contract(db, contract_id)
    _require_owner(contract, user)
    if user.id not in (contract.farmer_id, contract.buyer_id):
        raise _not_found("Contract not found")
    _auto_expire(db, contract)
    if contract.status not in NEGOTIABLE_STATUSES:
        raise _conflict(f"Contract in {contract.status} status cannot be countered")
    min_expiry = max(_now(), coerce_utc(contract.expires_at) if contract.expires_at else _now())
    if payload.expires_at <= min_expiry:
        raise _bad_request("A counter must extend the expiry deadline into the future")
    contract.quantity_kg = payload.quantity_kg
    contract.agreed_price_per_kg = payload.agreed_price_per_kg
    contract.total_amount = _money(payload.agreed_price_per_kg * payload.quantity_kg)
    if payload.payment_terms:
        contract.payment_terms = payload.payment_terms
    if payload.delivery_deadline is not None:
        contract.delivery_deadline = payload.delivery_deadline
    if payload.terms_text is not None:
        contract.terms_text = payload.terms_text
    contract.expires_at = payload.expires_at
    contract.status = "COUNTERED"
    db.commit()
    db.refresh(contract)
    return _response(contract)


def reject_contract(db: Session, user: User, contract_id: UUID) -> ContractResponse:
    if user.role != "FARMER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the farmer can reject a contract",
        )
    contract = _get_contract(db, contract_id)
    _require_owner(contract, user)
    if user.id != contract.farmer_id:
        raise _not_found("Contract not found")
    _auto_expire(db, contract)
    if contract.status not in NEGOTIABLE_STATUSES:
        raise _conflict(f"Contract in {contract.status} status cannot be rejected")
    contract.status = "CANCELLED"
    db.commit()
    db.refresh(contract)
    return _response(contract)


def cancel_contract(db: Session, user: User, contract_id: UUID) -> ContractResponse:
    contract = _get_contract(db, contract_id)
    _require_owner(contract, user)
    if user.id != contract.buyer_id:
        raise _not_found("Contract not found")
    _auto_expire(db, contract)
    if contract.status not in NEGOTIABLE_STATUSES:
        raise _conflict(f"Contract in {contract.status} status cannot be cancelled")
    contract.status = "CANCELLED"
    db.commit()
    db.refresh(contract)
    return _response(contract)


def expire_contract(db: Session, user: User, contract_id: UUID) -> ContractResponse:
    contract = _get_contract(db, contract_id)
    _require_owner(contract, user)
    if contract.status not in EXPIRABLE_STATUSES:
        raise _conflict(f"Contract in {contract.status} status cannot be expired")
    if contract.expires_at is None or coerce_utc(contract.expires_at) > _now():
        raise _conflict("Contract has not expired yet")
    contract.status = "EXPIRED"
    db.commit()
    db.refresh(contract)
    return _response(contract)


def create_order_from_contract(
    db: Session, user: User, contract_id: UUID
) -> ContractResponse:
    if user.role not in ("BUYER", "BULK_BUYER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer can create an order from a contract",
        )
    contract = _get_contract(db, contract_id)
    _require_owner(contract, user)
    if user.id != contract.buyer_id:
        raise _not_found("Contract not found")
    if contract.order_id is not None:
        raise _conflict("An order has already been created for this contract")
    if contract.status != "ACCEPTED":
        raise _conflict("Contract must be ACCEPTED before an order can be created")

    listing = db.get(CropListing, contract.listing_id) if contract.listing_id else None
    if listing is None or listing.status != "PUBLISHED":
        raise _conflict("The underlying listing is no longer available")

    order_payload = OrderCreate(
        listing_id=listing.id,
        quantity=contract.quantity_kg,
        unit="kg",
        price=contract.agreed_price_per_kg,
        currency=contract.currency,
        delivery_date=contract.delivery_deadline.date()
        if contract.delivery_deadline is not None
        else listing.available_until or _now().date(),
        note=f"Direct contract {contract.contract_number}",
        delivery_address_summary="Direct contract delivery",
    )
    order = orders_service.create_order(db, user, order_payload)
    order_id = UUID(order.id)
    contract.order_id = order_id
    contract.status = "ACTIVE"
    order_model = db.get(Order, order_id)
    if order_model is not None:
        order_model.source_type = "DIRECT_CONTRACT"
    db.commit()
    db.refresh(contract)
    return _response(contract)