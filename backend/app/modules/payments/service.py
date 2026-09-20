"""Phase 12 - Payment service.

Implements the advance + balance payment workflow on top of a pluggable
payment provider (mock in this phase). No real money is moved; provider
credentials are always read from environment configuration.

Workflow:
1. Order is ACCEPTED -> buyer creates an ADVANCE intent for ``advance_percent``
   of the total.
2. Once the provider confirms the advance, the order auto-confirms
   (ACCEPTED -> CONFIRMED, actor SYSTEM).
3. After quality confirmation (QUALITY_CHECK/COMPLETED) the buyer creates a
   BALANCE intent for the remaining amount. On capture a settlement is
   released and a payout is created for the farmer.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.marketplace import Order
from app.db.models.people import BuyerProfile, ConsumerProfile, FarmerProfile, User
from app.db.models.transaction import Payment, Payout, Refund, Settlement
from app.integrations.payment import get_payment_provider
from app.modules.escrow import service as escrow_service
from app.modules.notifications import service as notifications_service
from app.modules.orders import service as orders_service
from app.modules.payments.schemas import (
    PaymentIntentCreate,
    PaymentResponse,
    WebhookEvent,
    WebhookResponse,
)

# Consumer (B2C) orders are paid in full once accepted — no advance/escrow steps.
B2C_PAYABLE_STATUSES = (
    "ACCEPTED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "QUALITY_CHECK",
)


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _get_payment(db: Session, payment_id: UUID) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise _not_found("Payment not found")
    return payment


def _get_order(db: Session, order_id: UUID) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise _not_found("Order not found")
    return order


def _require_party(db: Session, user: User, order: Order) -> None:
    if not (_is_purchaser(db, user, order) or _is_farmer(db, user, order) or user.role == "ADMIN"):
        raise _not_found("Order not found")


def _is_purchaser(db: Session, user: User, order: Order) -> bool:
    """Whether the user is the purchasing party (BuyerProfile for B2B, ConsumerProfile for B2C)."""
    if user.role == "BUYER":
        profile = db.scalar(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        return profile is not None and profile.id == order.buyer_id
    if user.role == "CONSUMER":
        if order.order_type != "B2C":
            return False
        profile = db.scalar(select(ConsumerProfile).where(ConsumerProfile.user_id == user.id))
        return profile is not None and profile.id == order.consumer_id
    return False


def _is_farmer(db: Session, user: User, order: Order) -> bool:
    if user.role != "FARMER":
        return False
    profile = db.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    return profile is not None and profile.id == order.farmer_id


def _paid_advance(db: Session, order: Order) -> Decimal:
    return (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.order_id == order.id,
                Payment.operation == "ADVANCE",
                Payment.status.in_(["PAID", "SETTLED"]),
            )
        )
        or Decimal("0")
    )


def _advance_amount(order: Order) -> Decimal:
    percent = get_settings().payment_advance_percent
    return _money(order.total_amount * Decimal(str(percent)) / Decimal("100"))


def _balance_due(db: Session, order: Order) -> Decimal:
    paid = _paid_advance(db, order)
    return _money(order.total_amount - paid)


def _response(db: Session, payment: Payment) -> PaymentResponse:
    return PaymentResponse(
        id=str(payment.id),
        order_id=str(payment.order_id),
        payer_id=str(payment.payer_id),
        operation=payment.operation,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        provider=payment.provider,
        provider_reference=payment.provider_reference,
        provider_event_id=payment.provider_event_id,
        idempotency_key=payment.idempotency_key,
        failure_code=payment.failure_code,
        checkout_url=payment.checkout_url,
        refunded_amount=payment.refunded_amount,
        processed_at=payment.processed_at,
        created_at=payment.created_at,
    )


def create_intent(
    db: Session, user: User, payload: PaymentIntentCreate
) -> PaymentResponse:
    if user.role not in ("BUYER", "CONSUMER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only buyers or consumers can initiate payments",
        )
    order = _get_order(db, payload.order_id)
    if not _is_purchaser(db, user, order):
        raise _not_found("Order not found")

    operation = payload.operation

    if order.order_type == "B2C":
        if operation != "BALANCE":
            raise _bad_request("Consumer orders are settled with a single full payment")
        if order.status not in B2C_PAYABLE_STATUSES:
            raise _conflict("Payment becomes payable once the order is accepted")
        amount = _balance_due(db, order)
        if amount <= 0:
            raise _bad_request("There is no remaining balance due for this order")
        existing_paid = db.scalar(
            select(Payment).where(
                Payment.order_id == order.id,
                Payment.operation == "BALANCE",
                Payment.status.in_(["PAID", "SETTLED"]),
            )
        )
        if existing_paid is not None:
            raise _conflict("Order has already been paid")
    elif operation == "ADVANCE":
        if order.status != "ACCEPTED":
            raise _conflict("Advance payment is only due while the order is ACCEPTED")
        amount = _advance_amount(order)
        if amount <= 0:
            raise _bad_request("No advance is due for this order")
        existing_paid = db.scalar(
            select(Payment).where(
                Payment.order_id == order.id,
                Payment.operation == "ADVANCE",
                Payment.status.in_(["PAID", "SETTLED"]),
            )
        )
        if existing_paid is not None:
            raise _conflict("Advance has already been paid for this order")
    else:
        if order.status not in ("QUALITY_CHECK", "COMPLETED"):
            raise _conflict(
                "Remaining balance becomes payable only after quality confirmation"
            )
        amount = _balance_due(db, order)
        if amount <= 0:
            raise _bad_request("There is no remaining balance due for this order")
        existing_paid = db.scalar(
            select(Payment).where(
                Payment.order_id == order.id,
                Payment.operation == "BALANCE",
                Payment.status.in_(["PAID", "SETTLED"]),
            )
        )
        if existing_paid is not None:
            raise _conflict("Remaining balance has already been paid")

    idempotency_key = payload.idempotency_key or secrets.token_hex(12)
    existing = db.scalar(
        select(Payment).where(
            Payment.operation == operation,
            Payment.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        return _response(db, existing)

    pending = db.scalar(
        select(Payment)
        .where(
            Payment.order_id == order.id,
            Payment.operation == operation,
            Payment.status.in_(["PENDING", "AUTHORIZED"]),
        )
        .order_by(Payment.created_at.desc())
    )
    if pending is not None:
        return _response(db, pending)

    provider = get_payment_provider()
    receipt = provider.create_intent(
        amount=amount, currency=order.currency, reference=str(order.id)
    )
    payment = Payment(
        order_id=order.id,
        payer_id=user.id,
        operation=operation,
        amount=amount,
        currency=order.currency,
        status="PENDING",
        provider=provider.provider_name,
        provider_reference=receipt.provider_reference,
        idempotency_key=idempotency_key,
        checkout_url=receipt.checkout_url,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return _response(db, payment)


def _apply_capture(db: Session, payment: Payment, event_id: str) -> None:
    if payment.status in ("PAID", "SETTLED"):
        return
    now = datetime.now(timezone.utc)
    payment.status = "PAID"
    payment.provider_event_id = event_id
    payment.processed_at = now
    order = _get_order(db, payment.order_id)
    _notify_payment_received(db, order, payment)
    if order.order_type == "B2C":
        if payment.operation != "BALANCE":
            return
        orders_service.confirm_by_advance_payment(db, order)
        _release_settlement(db, order, payment)
        return
    escrow_service.add_deposit(db, order, payment.amount)
    if payment.operation == "ADVANCE":
        orders_service.confirm_by_advance_payment(db, order)
    else:
        _release_settlement(db, order, payment)


def _notify_payment_received(db: Session, order: Order, payment: Payment) -> None:
    """In-app notify the farmer when an advance or balance payment is captured."""
    try:
        farmer = db.get(FarmerProfile, order.farmer_id)
        if farmer is None:
            return
        notifications_service.emit(
            db,
            "payment_received",
            user_id=farmer.user_id,
            amount=f"{payment.amount:.2f}" if payment.amount is not None else "0.00",
            order=order.public_order_number,
        )
    except Exception:  # pragma: no cover - best effort, never break payment capture
        pass


def _release_settlement(db: Session, order: Order, balance_payment: Payment) -> None:
    existing = db.scalar(select(Settlement).where(Settlement.order_id == order.id))
    if existing is not None:
        return
    now = datetime.now(timezone.utc)
    fee_percent = get_settings().payment_fee_percent
    fee_amount = _money(order.total_amount * Decimal(str(fee_percent)) / Decimal("100"))
    net_amount = _money(order.total_amount - fee_amount)

    settlement = Settlement(
        order_id=order.id,
        gross_amount=order.total_amount,
        fee_amount=fee_amount,
        net_amount=net_amount,
        currency=order.currency,
        status="RELEASED",
        eligible_at=now,
        released_at=now,
    )
    db.add(settlement)
    db.flush()

    provider = get_payment_provider()
    receipt = provider.transfer(
        amount=net_amount, currency=order.currency, destination_ref=str(order.farmer_id)
    )
    db.add(
        Payout(
            settlement_id=settlement.id,
            farmer_id=order.farmer_id,
            amount=net_amount,
            currency=order.currency,
            status=receipt.status,
            provider_reference=receipt.provider_reference,
        )
    )
    db.flush()
    balance_payment.status = "SETTLED"
    _notify_settlement(db, order, settlement)


def _notify_settlement(db: Session, order: Order, settlement: Settlement) -> None:
    """In-app notify the farmer when a settlement is released."""
    try:
        farmer = db.get(FarmerProfile, order.farmer_id)
        if farmer is None:
            return
        notifications_service.emit(
            db,
            "settlement",
            user_id=farmer.user_id,
            amount=f"{settlement.net_amount:.2f}" if settlement.net_amount is not None else "0.00",
            order=order.public_order_number,
        )
    except Exception:  # pragma: no cover - best effort, never break settlement
        pass


def confirm_payment(db: Session, user: User, payment_id: UUID) -> PaymentResponse:
    payment = _get_payment(db, payment_id)
    order = _get_order(db, payment.order_id)
    if not (_is_purchaser(db, user, order) or user.role == "ADMIN"):
        raise _not_found("Payment not found")
    if payment.status in ("PAID", "SETTLED"):
        raise _conflict("Payment has already been captured")
    if payment.status == "FAILED":
        raise _conflict("Payment failed; create a new intent")

    provider = get_payment_provider()
    confirmation = provider.confirm_capture(
        provider_reference=payment.provider_reference or str(payment.id),
        amount=payment.amount,
        currency=payment.currency,
    )
    now = datetime.now(timezone.utc)
    payment.provider_event_id = confirmation.provider_event_id
    payment.processed_at = now
    if confirmation.status == "PAID":
        _apply_capture(db, payment, confirmation.provider_event_id)
    else:
        payment.status = "FAILED"
        payment.failure_code = confirmation.failure_code
    db.commit()
    db.refresh(payment)
    return _response(db, payment)


def handle_webhook(
    db: Session, provider_name: str, payload: WebhookEvent, signature: str | None
) -> WebhookResponse:
    settings = get_settings()
    if provider_name != "mock":
        raise _bad_request(f"Unknown payment provider: {provider_name}")
    if settings.payment_webhook_secret:
        provided = signature or ""
        if not secrets.compare_digest(provided, settings.payment_webhook_secret):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing webhook signature",
            )
    elif settings.app_env not in ("development", "test"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Payment webhooks require a configured PAYMENT_WEBHOOK_SECRET "
                "in non-development environments"
            ),
        )

    event = payload.event
    if event == "payment.captured":
        payment = db.scalar(
            select(Payment).where(Payment.provider_reference == payload.reference)
        )
        if payment is None:
            raise _not_found("Payment reference not found")
        if payment.provider_event_id == payload.event_id:
            db.commit()
            return WebhookResponse(ok=True, event_id=payload.event_id, duplicate=True)
        _apply_capture(db, payment, payload.event_id)
    elif event == "payment.failed":
        payment = db.scalar(
            select(Payment).where(Payment.provider_reference == payload.reference)
        )
        if payment is None:
            raise _not_found("Payment reference not found")
        if payment.provider_event_id == payload.event_id:
            db.commit()
            return WebhookResponse(ok=True, event_id=payload.event_id, duplicate=True)
        payment.status = "FAILED"
        payment.failure_code = payload.status or "PAYMENT_DECLINED"
        payment.processed_at = datetime.now(timezone.utc)
    elif event == "refund.processed":
        refund = db.scalar(
            select(Refund).where(Refund.provider_reference == payload.reference)
        )
        if refund is None:
            raise _not_found("Refund reference not found")
        if refund.status == "SETTLED":
            db.commit()
            return WebhookResponse(ok=True, event_id=payload.event_id, duplicate=True)
        refund.status = "SETTLED"
        payment = db.get(Payment, refund.payment_id)
        if payment is not None:
            payment.refunded_amount = (payment.refunded_amount or Decimal("0")) + refund.amount
            payment.status = (
                "PARTIALLY_REFUNDED"
                if payment.refunded_amount < payment.amount
                else "REFUNDED"
            )
    elif event == "payout.completed":
        payout = db.scalar(
            select(Payout).where(Payout.provider_reference == payload.reference)
        )
        if payout is None:
            raise _not_found("Payout reference not found")
        if payout.status == "SETTLED":
            db.commit()
            return WebhookResponse(ok=True, event_id=payload.event_id, duplicate=True)
        payout.status = "SETTLED"
    else:
        raise _bad_request(f"Unsupported webhook event: {event}")

    db.commit()
    return WebhookResponse(ok=True, event_id=payload.event_id, duplicate=False)


def refund_payment(
    db: Session,
    user: User,
    payment_id: UUID,
    amount: Decimal | None,
    reason: str | None,
    dispute_id: UUID | None,
) -> Refund:
    """Execute a refund against a captured payment.

    Refunds are never auto-approved: only an ADMIN can execute one (typically
    after an approved dispute review), and the issuing dispute may be recorded
    for the audit trail.
    """
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin can approve and execute a refund",
        )
    payment = _get_payment(db, payment_id)
    if payment.status not in ("PAID", "PARTIALLY_REFUNDED"):
        raise _conflict("Only captured payments can be refunded")

    already_refunded = payment.refunded_amount or Decimal("0")
    remaining = payment.amount - already_refunded
    refund_amount = amount if amount is not None else remaining
    if refund_amount <= 0 or refund_amount > remaining:
        raise _bad_request("Refund amount exceeds the refundable balance")

    refund = Refund(
        payment_id=payment.id,
        dispute_id=dispute_id,
        amount=refund_amount,
        currency=payment.currency,
        status="PROCESSING",
        reason=reason,
    )
    db.add(refund)
    db.flush()

    provider = get_payment_provider()
    receipt = provider.refund(
        provider_reference=payment.provider_reference or str(payment.id),
        amount=refund_amount,
        currency=payment.currency,
    )
    refund.status = "SETTLED"
    refund.provider_reference = receipt.provider_reference

    payment.refunded_amount = _money((already_refunded or Decimal("0")) + refund_amount)
    payment.status = (
        "PARTIALLY_REFUNDED" if payment.refunded_amount < payment.amount else "REFUNDED"
    )
    db.commit()
    db.refresh(refund)
    _notify_refund(db, payment, refund_amount)
    order = db.get(Order, payment.order_id)
    if order is not None:
        escrow_service.deduct_refund(db, order, refund_amount)
        db.commit()
    return refund


def _notify_refund(db: Session, payment: Payment, refund_amount: Decimal) -> None:
    """In-app notify the paying buyer when a refund is processed."""
    try:
        buyer_user = db.get(User, payment.payer_id)
        order = db.get(Order, payment.order_id)
        if buyer_user is None:
            return
        notifications_service.emit(
            db,
            "refund",
            user_id=buyer_user.id,
            amount=f"{refund_amount:.2f}",
            order=order.public_order_number if order else "order",
        )
    except Exception:  # pragma: no cover - best effort, never break refund flow
        pass


def list_order_payments(db: Session, user: User, order_id: UUID) -> list[PaymentResponse]:
    order = _get_order(db, order_id)
    _require_party(db, user, order)
    payments = db.scalars(
        select(Payment)
        .where(Payment.order_id == order.id)
        .order_by(Payment.created_at.desc())
    ).all()
    return [_response(db, payment) for payment in payments]


def list_my_payments(db: Session, user: User) -> list[PaymentResponse]:
    payments = db.scalars(
        select(Payment).where(Payment.payer_id == user.id).order_by(Payment.created_at.desc())
    ).all()
    return [_response(db, payment) for payment in payments]


def get_order_settlement(db: Session, user: User, order_id: UUID) -> Settlement:
    order = _get_order(db, order_id)
    _require_party(db, user, order)
    settlement = db.scalar(select(Settlement).where(Settlement.order_id == order.id))
    if settlement is None:
        raise _not_found("No settlement has been created for this order yet")
    return settlement