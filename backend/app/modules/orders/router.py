from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles
from app.modules.orders import service
from app.modules.orders.schemas import (
    CounterOfferCreate,
    OrderCreate,
    OrderDetailResponse,
    OrderStatusUpdate,
    OrderSummaryResponse,
)

router = APIRouter(prefix="/orders", tags=["orders"])

OrderDependency = require_roles("BUYER", "CONSUMER", "FARMER", "BULK_BUYER")


@router.post(
    "",
    response_model=OrderDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Buyer sends a purchase request for a listing",
)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> OrderDetailResponse:
    if _user.role not in ("BUYER", "CONSUMER", "BULK_BUYER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only buyers, bulk buyers, or consumers can create purchase requests",
        )
    return service.create_order(db, _user, payload)


@router.get(
    "",
    response_model=list[OrderSummaryResponse],
    summary="List orders the current user is party to",
)
def list_orders(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> list[OrderSummaryResponse]:
    return service.list_orders(db, _user, status_filter)


@router.get(
    "/{order_id}",
    response_model=OrderDetailResponse,
    summary="Get order details and full negotiation history",
)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> OrderDetailResponse:
    return service.get_order(db, _user, order_id)


@router.post(
    "/{order_id}/accept",
    response_model=OrderDetailResponse,
    summary="Accept the current pending offer (buyer or farmer)",
)
def accept_offer(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> OrderDetailResponse:
    return service.accept_offer(db, _user, order_id)


@router.post(
    "/{order_id}/reject",
    response_model=OrderDetailResponse,
    summary="Reject the current pending offer",
)
def reject_offer(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> OrderDetailResponse:
    return service.reject_offer(db, _user, order_id)


@router.post(
    "/{order_id}/counter",
    response_model=OrderDetailResponse,
    summary="Submit a counter-offer to the current pending offer",
)
def counter_offer(
    order_id: UUID,
    payload: CounterOfferCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> OrderDetailResponse:
    return service.counter_offer(db, _user, order_id, payload)


@router.post(
    "/{order_id}/status",
    response_model=OrderDetailResponse,
    summary="Transition the order to a specific fulfillment status (confirm, prepare, deliver, etc.)",
)
def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> OrderDetailResponse:
    return service.update_order_status(db, _user, order_id, payload.status)


@router.post(
    "/{order_id}/cancel",
    response_model=OrderDetailResponse,
    summary="Cancel the order",
)
def cancel_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(OrderDependency),
) -> OrderDetailResponse:
    return service.cancel_order(db, _user, order_id)