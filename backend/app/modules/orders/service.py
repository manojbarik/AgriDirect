"""Order and negotiation service with an explicit, validated status state machine."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.marketplace import (
    Crop,
    CropBatch,
    CropListing,
    Order,
    OrderItem,
    OrderNegotiationMessage,
    OrderStatusEvent,
)
from app.db.models.people import BuyerProfile, ConsumerProfile, FarmerProfile, User
from app.modules.escrow import service as escrow_service
from app.modules.notifications import service as notifications_service
from app.modules.orders.schemas import (
    CounterOfferCreate,
    OrderCreate,
    OrderDetailResponse,
    OrderNegotiationMessageResponse,
    OrderStatusEventResponse,
    OrderSummaryResponse,
)

NEGOTIATION_ACTIONS = ("REQUEST", "COUNTER")

PURCHASER_ROLES = ("BUYER", "CONSUMER")

# Consumer (B2C) orders are personal purchases and are capped at a small size.
CONSUMER_MAX_ORDER_UNITS = Decimal("25")

# Allowed status transitions. Values are the statuses reachable from the key.
ORDER_TRANSITIONS: dict[str, set[str]] = {
    "PENDING": {"NEGOTIATING", "ACCEPTED", "REJECTED", "CANCELLED"},
    "NEGOTIATING": {"NEGOTIATING", "ACCEPTED", "REJECTED", "CANCELLED"},
    "ACCEPTED": {"CONFIRMED", "DISPUTED", "CANCELLED"},
    "CONFIRMED": {"PREPARING", "DISPUTED", "CANCELLED"},
    "PREPARING": {"READY_FOR_PICKUP", "DISPUTED", "CANCELLED"},
    "READY_FOR_PICKUP": {"IN_TRANSIT", "DISPUTED", "CANCELLED"},
    "IN_TRANSIT": {"DELIVERED", "DISPUTED"},
    "DELIVERED": {"QUALITY_CHECK", "DISPUTED"},
    "QUALITY_CHECK": {"COMPLETED", "DISPUTED"},
    "DISPUTED": {"REFUNDED", "REPLACED"},
    "REJECTED": set(),
    "CANCELLED": set(),
    "COMPLETED": set(),
    "REFUNDED": set(),
    "REPLACED": set(),
}

# Role required to perform a specific transition. Omitted transitions allow either party.
TRANSITION_ACTORS: dict[tuple[str, str], str] = {
    ("ACCEPTED", "CONFIRMED"): "BUYER",
    ("CONFIRMED", "PREPARING"): "FARMER",
    ("PREPARING", "READY_FOR_PICKUP"): "FARMER",
    ("READY_FOR_PICKUP", "IN_TRANSIT"): "FARMER",
    ("IN_TRANSIT", "DELIVERED"): "FARMER",
    ("DELIVERED", "QUALITY_CHECK"): "BUYER",
    ("QUALITY_CHECK", "COMPLETED"): "BUYER",
    # Dispute outcomes are applied only by the system after an admin decision.
    ("DISPUTED", "REFUNDED"): "SYSTEM",
    ("DISPUTED", "REPLACED"): "SYSTEM",
}

DISPUTABLE_STATUSES = {
    "ACCEPTED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "QUALITY_CHECK",
}
CANCELLABLE_STATUSES = {"PENDING", "NEGOTIATING", "ACCEPTED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"}


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _require_profile(
    db: Session, user: User
) -> tuple[BuyerProfile | None, ConsumerProfile | None, FarmerProfile | None]:
    buyer = None
    consumer = None
    farmer = None
    if user.role in ("BUYER", "BULK_BUYER"):
        buyer = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        if buyer is None:
            raise _not_found("Complete your buyer profile before continuing")
    if user.role == "CONSUMER":
        consumer = db.scalar(select(ConsumerProfile).where(ConsumerProfile.user_id == user.id))
        if consumer is None:
            raise _not_found("Complete your consumer profile before continuing")
    if user.role == "FARMER":
        farmer = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
        if farmer is None:
            raise _not_found("Complete your farmer profile before continuing")
    actor_role = user.role
    if actor_role not in ("BUYER", "CONSUMER", "FARMER", "BULK_BUYER"):
        raise _bad_request(f"Role {actor_role} cannot manage orders")
    return buyer, consumer, farmer


def _get_order(db: Session, order_id: UUID) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise _not_found("Order not found")
    return order


def _purchaser_of(db: Session, order: Order) -> BuyerProfile | ConsumerProfile | None:
    if order.order_type == "B2C":
        return db.get(ConsumerProfile, order.consumer_id) if order.consumer_id else None
    return db.get(BuyerProfile, order.buyer_id) if order.buyer_id else None


def _purchaser_user_id(order: Order) -> UUID | None:
    if order.order_type == "B2C":
        return order.consumer.user_id if order.consumer else None
    return order.buyer.user_id if order.buyer else None


def _purchaser_name(db: Session, order: Order) -> str:
    if order.order_type == "B2C":
        consumer = order.consumer
        if consumer is not None:
            return consumer.user.email or consumer.user.phone_e164 or "A consumer"
        return "A consumer"
    buyer = order.buyer
    return buyer.full_name if buyer and buyer.full_name else "A buyer"


def _require_owner(
    order: Order,
    buyer: BuyerProfile | None,
    consumer: ConsumerProfile | None,
    farmer: FarmerProfile | None,
) -> None:
    if farmer is not None and order.farmer_id == farmer.id:
        return
    if buyer is not None and order.buyer_id == buyer.id:
        return
    if (
        buyer is None
        and consumer is not None
        and order.order_type == "B2C"
        and order.consumer_id == consumer.id
    ):
        return
    raise _not_found("Order not found")


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _notify_order_status_change(db: Session, order: Order, to_status: str) -> None:
    """Emit in-app notifications for user-visible lifecycle events (best effort)."""
    try:
        purchaser_user_id = _purchaser_user_id(order)
        farmer = db.get(FarmerProfile, order.farmer_id) if order.farmer_id else None
        order_ref = order.public_order_number
        if to_status in ("READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED") and purchaser_user_id is not None:
            notifications_service.emit(
                db,
                "delivery_update",
                user_id=purchaser_user_id,
                order=order_ref,
                status=to_status,
            )
        if to_status in ("QUALITY_CHECK", "COMPLETED") and farmer is not None:
            notifications_service.emit(
                db,
                "quality_confirmation",
                user_id=farmer.user_id,
                order=order_ref,
            )
        db.flush()
    except Exception:  # pragma: no cover - best effort, never break a status transition
        pass


def _transition(
    db: Session,
    order: Order,
    to_status: str,
    actor_role: str,
    note: str | None,
) -> None:
    allowed = ORDER_TRANSITIONS.get(order.status, set())
    if to_status not in allowed:
        raise _conflict(f"Invalid status transition from {order.status} to {to_status}")

    required_role = TRANSITION_ACTORS.get((order.status, to_status))
    gate_role = "BUYER" if actor_role == "CONSUMER" else actor_role
    if (
        required_role is not None
        and required_role != gate_role
        and actor_role != "SYSTEM"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only {required_role} can transition {order.status} -> {to_status}",
        )

    now = datetime.now(timezone.utc)
    event = OrderStatusEvent(
        order_id=order.id,
        from_status=order.status,
        to_status=to_status,
        changed_by_role=actor_role,
        note=note,
    )
    db.add(event)
    order.status = to_status

    if to_status == "CONFIRMED":
        order.expected_delivery_date = order.agreed_delivery_date
    elif to_status == "PREPARING":
        _ensure_batch(db, order)
    elif to_status == "DELIVERED":
        order.delivered_at = now
        order.quality_confirmation_deadline = datetime.now(timezone.utc) + timedelta(
            days=get_settings().quality_confirmation_days
        )
    elif to_status == "QUALITY_CHECK":
        order.receipt_confirmed_at = now
    elif to_status == "COMPLETED":
        order.completed_at = now
        escrow_service.release_escrow(db, order)
    elif to_status == "CANCELLED":
        order.cancelled_at = now
    elif to_status == "DISPUTED":
        order.disputed_at = now
    elif to_status == "REFUNDED":
        order.refunded_at = now
    elif to_status == "REPLACED":
        order.replaced_at = now

    _notify_order_status_change(db, order, to_status)


def apply_status_transition(
    db: Session, order: Order, to_status: str, actor_role: str, note: str | None
) -> None:
    """Public wrapper used by other modules (payments, batches) to drive the state machine."""
    _transition(db, order, to_status, actor_role, note)


def _ensure_batch(db: Session, order: Order) -> None:
    """Associate a crop batch with the order once preparation begins."""
    existing = db.scalar(select(CropBatch).where(CropBatch.order_id == order.id))
    if existing is not None:
        return
    quantity = order.agreed_quantity or order.requested_quantity
    db.add(
        CropBatch(
            order_id=order.id,
            listing_id=order.listing_id,
            crop_id=order.crop_id,
            farmer_id=order.farmer_id,
            batch_code=f"BATCH-{order.public_order_number}",
            prepared_quantity=quantity,
            status="PREPARING",
            preparation_status="PREPARING",
        )
    )


def confirm_by_advance_payment(db: Session, order: Order) -> None:
    """Advance payment received: move an accepted order forward to confirmed (SYSTEM)."""
    if order.status == "ACCEPTED":
        apply_status_transition(
            db, order, "CONFIRMED", "SYSTEM", note="Advance payment received"
        )


def _sync_item_to_agreed(db: Session, order: Order) -> None:
    if order.agreed_quantity is None or order.agreed_price is None:
        return
    order.total_amount = _money(order.agreed_price * order.agreed_quantity)
    item = order.items[0] if order.items else None
    if item is not None:
        item.quantity = order.agreed_quantity
        item.unit = order.agreed_unit or order.unit
        item.unit_price = order.agreed_price
        item.line_total = _money(order.agreed_price * order.agreed_quantity)


def create_order(db: Session, user: User, payload: OrderCreate) -> OrderDetailResponse:
    buyer, consumer, _ = _require_profile(db, user)
    if buyer is None and consumer is None:
        raise _not_found("Buyer or consumer profile required to create an order")
    listing = db.get(CropListing, payload.listing_id)
    if listing is None or listing.status != "PUBLISHED":
        raise _bad_request("Listing is not available for purchase")
    if listing.available_quantity < payload.quantity:
        raise _bad_request(
            f"Requested quantity exceeds available quantity ({listing.available_quantity} {listing.unit})"
        )
    if buyer is not None and listing.farmer_id == buyer.id:
        raise _bad_request("You cannot buy from your own listing")
    crop = db.get(Crop, listing.crop_id)
    if crop is None:
        raise _not_found("Crop not found")

    order_type = "B2C" if consumer is not None else "B2B"
    purchaser_role = "CONSUMER" if consumer is not None else "BUYER"
    if consumer is not None and payload.quantity > CONSUMER_MAX_ORDER_UNITS:
        raise _bad_request(
            f"Consumer orders are limited to {CONSUMER_MAX_ORDER_UNITS} {payload.unit}"
        )

    quantity = payload.quantity
    price = payload.price
    total = _money(price * quantity)

    order = Order(
        public_order_number=f"ORD-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}",
        farmer_id=listing.farmer_id,
        order_type=order_type,
        buyer_id=buyer.id if buyer else None,
        consumer_id=consumer.id if consumer else None,
        listing_id=listing.id,
        crop_id=listing.crop_id,
        source_type="NEGOTIATION",
        status="PENDING",
        total_amount=total,
        currency=payload.currency,
        unit=payload.unit,
        requested_quantity=quantity,
        requested_price=price,
        requested_delivery_date=payload.delivery_date,
        pending_offer_action="REQUEST",
        pending_offer_by_role=purchaser_role,
        pending_offer_quantity=quantity,
        pending_offer_unit=payload.unit,
        pending_offer_price=price,
        pending_offer_delivery_date=payload.delivery_date,
        delivery_address_snapshot=payload.delivery_address_summary,
        expected_delivery_date=payload.delivery_date,
    )
    db.add(order)
    db.flush()

    db.add(
        OrderItem(
            order_id=order.id,
            listing_id=listing.id,
            crop_id=listing.crop_id,
            quantity=quantity,
            unit=payload.unit,
            unit_price=price,
            line_total=total,
            grade_snapshot=listing.grade,
        )
    )
    db.add(
        OrderNegotiationMessage(
            order_id=order.id,
            from_role=purchaser_role,
            action="REQUEST",
            quantity=quantity,
            unit=payload.unit,
            price=price,
            delivery_date=payload.delivery_date,
            note=payload.note,
        )
    )
    db.add(
        OrderStatusEvent(
            order_id=order.id,
            from_status=None,
            to_status="PENDING",
            changed_by_role=purchaser_role,
            note="Purchase request created",
        )
    )
    db.commit()
    db.refresh(order)
    _notify_new_order(db, order, crop.name)
    return _detail_response(db, order, user.role)


def _notify_new_order(
    db: Session, order: Order, crop_name: str
) -> None:
    """In-app notify the farmer about an incoming order request (best effort)."""
    try:
        farmer = db.get(FarmerProfile, order.farmer_id)
        if farmer is None:
            return
        notifications_service.emit(
            db,
            "order_request",
            user_id=farmer.user_id,
            buyer_name=_purchaser_name(db, order),
            quantity=order.requested_quantity,
            unit=order.unit,
            crop=crop_name,
            order=order.public_order_number,
        )
        db.commit()
    except Exception:  # pragma: no cover - best effort, never break order creation
        pass


def list_orders(
    db: Session, user: User, status_filter: str | None
) -> list[OrderSummaryResponse]:
    buyer, consumer, farmer = _require_profile(db, user)
    stmt = select(Order)
    if farmer is not None:
        stmt = stmt.where(Order.farmer_id == farmer.id)
    elif consumer is not None:
        stmt = stmt.where(Order.order_type == "B2C", Order.consumer_id == consumer.id)
    elif buyer is not None:
        stmt = stmt.where(Order.buyer_id == buyer.id)
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    orders = db.scalars(stmt.order_by(Order.created_at.desc())).all()
    return [_summary_response(db, order, user.role) for order in orders]


def get_order(db: Session, user: User, order_id: UUID) -> OrderDetailResponse:
    buyer, consumer, farmer = _require_profile(db, user)
    order = _get_order(db, order_id)
    _require_owner(order, buyer, consumer, farmer)
    return _detail_response(db, order, user.role)


def _pending_offer(order: Order) -> tuple[str, int]:
    if order.pending_offer_action not in NEGOTIATION_ACTIONS or order.pending_offer_by_role is None:
        return "", 0
    return order.pending_offer_by_role, order.pending_offer_action


def _require_respondable(order: Order, actor_role: str) -> None:
    offer_by, _ = _pending_offer(order)
    if not offer_by:
        raise _conflict("There is no pending offer to respond to")
    if offer_by == actor_role:
        raise _conflict("You cannot respond to your own offer")


def accept_offer(db: Session, user: User, order_id: UUID) -> OrderDetailResponse:
    buyer, consumer, farmer = _require_profile(db, user)
    order = _get_order(db, order_id)
    _require_owner(order, buyer, consumer, farmer)
    _require_respondable(order, user.role)

    order.agreed_quantity = order.pending_offer_quantity
    order.agreed_unit = order.pending_offer_unit or order.unit
    order.agreed_price = order.pending_offer_price
    order.agreed_delivery_date = order.pending_offer_delivery_date
    _sync_item_to_agreed(db, order)

    db.add(
        OrderNegotiationMessage(
            order_id=order.id,
            from_role=user.role,
            action="ACCEPT",
            quantity=order.agreed_quantity,
            unit=order.agreed_unit,
            price=order.agreed_price,
            delivery_date=order.pending_offer_delivery_date,
            note=None,
        )
    )
    _transition(db, order, "ACCEPTED", user.role, note="Offer accepted")
    db.commit()
    db.refresh(order)
    _notify_order_accepted(db, order)
    return _detail_response(db, order, user.role)


def _notify_order_accepted(db: Session, order: Order) -> None:
    """In-app notify the purchaser that the farmer accepted the order (best effort)."""
    try:
        purchaser_user_id = _purchaser_user_id(order)
        farmer = db.get(FarmerProfile, order.farmer_id)
        crop = db.get(Crop, order.crop_id) if order.crop_id else None
        if purchaser_user_id is None:
            return
        notifications_service.emit(
            db,
            "order_accepted",
            user_id=purchaser_user_id,
            farmer_name=(farmer.full_name or "The farmer") if farmer else "The farmer",
            quantity=order.agreed_quantity or order.requested_quantity,
            unit=order.agreed_unit or order.unit,
            crop=crop.name if crop else "produce",
            order=order.public_order_number,
        )
        db.commit()
    except Exception:  # pragma: no cover - best effort, never break accept flow
        pass


def reject_offer(db: Session, user: User, order_id: UUID) -> OrderDetailResponse:
    buyer, consumer, farmer = _require_profile(db, user)
    order = _get_order(db, order_id)
    _require_owner(order, buyer, consumer, farmer)
    _require_respondable(order, user.role)

    db.add(
        OrderNegotiationMessage(
            order_id=order.id,
            from_role=user.role,
            action="REJECT",
            quantity=order.pending_offer_quantity,
            unit=order.pending_offer_unit or order.unit,
            price=order.pending_offer_price,
            delivery_date=order.pending_offer_delivery_date,
            note=None,
        )
    )
    _transition(db, order, "REJECTED", user.role, note="Offer rejected")
    db.commit()
    db.refresh(order)
    return _detail_response(db, order, user.role)


def counter_offer(
    db: Session, user: User, order_id: UUID, payload: CounterOfferCreate
) -> OrderDetailResponse:
    buyer, consumer, farmer = _require_profile(db, user)
    order = _get_order(db, order_id)
    _require_owner(order, buyer, consumer, farmer)
    _require_respondable(order, user.role)

    db.add(
        OrderNegotiationMessage(
            order_id=order.id,
            from_role=user.role,
            action="COUNTER",
            quantity=payload.quantity,
            unit=payload.unit,
            price=payload.price,
            delivery_date=payload.delivery_date,
            note=payload.note,
        )
    )
    order.pending_offer_action = "COUNTER"
    order.pending_offer_by_role = user.role
    order.pending_offer_quantity = payload.quantity
    order.pending_offer_unit = payload.unit
    order.pending_offer_price = payload.price
    order.pending_offer_delivery_date = payload.delivery_date
    _transition(db, order, "NEGOTIATING", user.role, note=f"Counter-offer from {user.role}")
    db.commit()
    db.refresh(order)
    return _detail_response(db, order, user.role)


def update_order_status(
    db: Session, user: User, order_id: UUID, next_status: str
) -> OrderDetailResponse:
    buyer, consumer, farmer = _require_profile(db, user)
    order = _get_order(db, order_id)
    _require_owner(order, buyer, consumer, farmer)
    _transition(db, order, next_status, user.role, note=f"Manual transition to {next_status}")
    db.commit()
    db.refresh(order)
    return _detail_response(db, order, user.role)


def cancel_order(db: Session, user: User, order_id: UUID) -> OrderDetailResponse:
    buyer, consumer, farmer = _require_profile(db, user)
    order = _get_order(db, order_id)
    _require_owner(order, buyer, consumer, farmer)
    _transition(db, order, "CANCELLED", user.role, note=f"Cancelled by {user.role}")
    db.commit()
    db.refresh(order)
    return _detail_response(db, order, user.role)


def _dispute_entry(db: Session, order: Order, actor_role: str, note: str) -> None:
    """Move a disputable order into DISPUTED, remembering where it came from."""
    if order.pre_dispute_status is None:
        order.pre_dispute_status = order.status
    _transition(db, order, "DISPUTED", actor_role, note=note)


def mark_order_disputed(db: Session, order: Order, note: str) -> None:
    """Public wrapper: move a disputable order into DISPUTED (used by the disputes module).

    Records the order's pre-dispute status so an admin REJECT decision can
    restore it via restore_from_dispute.
    """
    _dispute_entry(db, order, "BUYER", note)


def restore_from_dispute(db: Session, order: Order, reason: str) -> None:
    """Restore the order to its pre-dispute status (admin rejected the dispute).

    The order status event is recorded with the SYSTEM role (the admin's
    identity stays in the dispute audit trail), with an explicit audit note.
    """
    previous = order.status
    restored = order.pre_dispute_status or "ACCEPTED"
    if restored not in ORDER_TRANSITIONS or restored == "DISPUTED":
        restored = "ACCEPTED"
    db.add(
        OrderStatusEvent(
            order_id=order.id,
            from_status=previous,
            to_status=restored,
            changed_by_role="SYSTEM",
            note=reason,
        )
    )
    order.status = restored
    order.pre_dispute_status = None
    order.disputed_at = None


def _allowed_actions(order: Order, actor_role: str) -> list[str]:
    role = "BUYER" if actor_role == "CONSUMER" else actor_role
    actions: list[str] = []
    if order.status in ("PENDING", "NEGOTIATING"):
        if (
            order.pending_offer_action in NEGOTIATION_ACTIONS
            and order.pending_offer_by_role
            and order.pending_offer_by_role != actor_role
        ):
            actions.extend(["accept", "reject", "counter"])
        actions.append("cancel")

    if order.status == "ACCEPTED" and role == "BUYER":
        actions.append("confirm")

    fulfill: dict[str, tuple[str, str]] = {
        "CONFIRMED": ("prepare", "FARMER"),
        "PREPARING": ("ready_for_pickup", "FARMER"),
        "READY_FOR_PICKUP": ("in_transit", "FARMER"),
        "IN_TRANSIT": ("deliver", "FARMER"),
        "DELIVERED": ("quality_check", "BUYER"),
        "QUALITY_CHECK": ("complete", "BUYER"),
    }
    if order.status in fulfill:
        action, required_role = fulfill[order.status]
        if role == required_role:
            actions.append(action)

    if order.status in CANCELLABLE_STATUSES:
        actions.append("cancel")
    if order.status in DISPUTABLE_STATUSES and actor_role == "BUYER":
        actions.append("dispute")
    return list(dict.fromkeys(actions))


def _message_response(message: OrderNegotiationMessage) -> OrderNegotiationMessageResponse:
    return OrderNegotiationMessageResponse(
        id=str(message.id),
        from_role=message.from_role,
        action=message.action,
        quantity=message.quantity,
        unit=message.unit,
        price=message.price,
        delivery_date=message.delivery_date,
        note=message.note,
        created_at=message.created_at,
    )


def _event_response(event: OrderStatusEvent) -> OrderStatusEventResponse:
    return OrderStatusEventResponse(
        id=str(event.id),
        from_status=event.from_status,
        to_status=event.to_status,
        changed_by_role=event.changed_by_role,
        note=event.note,
        created_at=event.created_at,
    )


def _summary_response(db: Session, order: Order, actor_role: str) -> OrderSummaryResponse:
    crop = db.get(Crop, order.crop_id) if order.crop_id else None
    listing = db.get(CropListing, order.listing_id) if order.listing_id else None
    farmer = db.get(FarmerProfile, order.farmer_id) if order.farmer_id else None
    return OrderSummaryResponse(
        id=str(order.id),
        public_order_number=order.public_order_number,
        status=order.status,
        order_type=order.order_type,
        my_role=actor_role,
        next_allowed_actions=_allowed_actions(order, actor_role),
        crop_name=crop.name if crop else None,
        crop_variety=crop.variety if crop else None,
        listing_title=listing.title if listing else None,
        farmer_name=farmer.full_name if farmer else "",
        buyer_name=_purchaser_name(db, order),
        unit=order.unit,
        requested_quantity=order.requested_quantity,
        requested_price=order.requested_price,
        pending_offer_action=order.pending_offer_action,
        pending_offer_by_role=order.pending_offer_by_role,
        agreed_quantity=order.agreed_quantity,
        agreed_price=order.agreed_price,
        total_amount=order.total_amount,
        created_at=order.created_at,
    )


def _detail_response(db: Session, order: Order, actor_role: str) -> OrderDetailResponse:
    summary = _summary_response(db, order, actor_role)
    return OrderDetailResponse(
        **summary.model_dump(),
        listing_id=str(order.listing_id) if order.listing_id else None,
        crop_id=str(order.crop_id) if order.crop_id else None,
        buyer_id=str(order.buyer_id) if order.buyer_id else None,
        consumer_id=str(order.consumer_id) if order.consumer_id else None,
        farmer_id=str(order.farmer_id),
        currency=order.currency,
        requested_delivery_date=order.requested_delivery_date,
        pending_offer_quantity=order.pending_offer_quantity,
        pending_offer_unit=order.pending_offer_unit,
        pending_offer_price=order.pending_offer_price,
        pending_offer_delivery_date=order.pending_offer_delivery_date,
        agreed_unit=order.agreed_unit,
        agreed_delivery_date=order.agreed_delivery_date,
        delivery_address_summary=order.delivery_address_snapshot,
        negotiation_messages=[_message_response(m) for m in order.negotiation_messages],
        status_events=[_event_response(e) for e in order.status_events],
        delivered_at=order.delivered_at,
        quality_confirmation_deadline=order.quality_confirmation_deadline,
        receipt_confirmed_at=order.receipt_confirmed_at,
        completed_at=order.completed_at,
        cancelled_at=order.cancelled_at,
        disputed_at=order.disputed_at,
        refunded_at=order.refunded_at,
        replaced_at=order.replaced_at,
        pre_dispute_status=order.pre_dispute_status,
        updated_at=order.updated_at,
    )