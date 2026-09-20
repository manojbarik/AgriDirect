from uuid import UUID

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles
from app.modules.payments import service
from app.modules.payments.schemas import (
    PaymentIntentCreate,
    PaymentResponse,
    RefundCreate,
    RefundResponse,
    SettlementResponse,
    WebhookEvent,
    WebhookResponse,
)

router = APIRouter(prefix="/payments", tags=["payments"])

PartyDependency = require_roles("BUYER", "CONSUMER", "FARMER", "ADMIN", "BULK_BUYER")
PurchaserDependency = require_roles("BUYER", "CONSUMER", "BULK_BUYER")
PayerDependency = require_roles("BUYER", "CONSUMER", "ADMIN", "BULK_BUYER")
AdminDependency = require_roles("ADMIN")


def _refund_response(refund) -> RefundResponse:
    return RefundResponse(
        id=str(refund.id),
        payment_id=str(refund.payment_id),
        amount=refund.amount,
        currency=refund.currency,
        status=refund.status,
        provider_reference=refund.provider_reference,
        reason=refund.reason,
        created_at=refund.created_at,
    )


def _settlement_response(settlement) -> SettlementResponse:
    return SettlementResponse(
        id=str(settlement.id),
        order_id=str(settlement.order_id),
        gross_amount=settlement.gross_amount,
        fee_amount=settlement.fee_amount,
        net_amount=settlement.net_amount,
        currency=settlement.currency,
        status=settlement.status,
        eligible_at=settlement.eligible_at,
        released_at=settlement.released_at,
        payouts=[
            {
                "id": str(payout.id),
                "amount": payout.amount,
                "currency": payout.currency,
                "status": payout.status,
                "provider_reference": payout.provider_reference,
                "created_at": payout.created_at,
            }
            for payout in settlement.payouts
        ],
    )


@router.post(
    "/intents",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an advance or balance payment intent (idempotent)",
)
def create_payment_intent(
    payload: PaymentIntentCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(PurchaserDependency),
) -> PaymentResponse:
    return service.create_intent(db, _user, payload)


@router.post(
    "/{payment_id}/confirm",
    response_model=PaymentResponse,
    summary="Confirm a payment in the sandbox provider (simulates webhook capture)",
)
def confirm_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PayerDependency),
) -> PaymentResponse:
    return service.confirm_payment(db, _user, payment_id)


@router.post(
    "/webhook/{provider}",
    response_model=WebhookResponse,
    include_in_schema=True,
    summary="Provider webhook endpoint (signature-verified, idempotent by event_id)",
)
def payment_webhook(
    provider: str,
    payload: WebhookEvent,
    x_webhook_signature: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> WebhookResponse:
    return service.handle_webhook(db, provider, payload, x_webhook_signature)


@router.post(
    "/{payment_id}/refund",
    response_model=RefundResponse,
    summary="Refund a captured payment (admin authorized; never auto-approved)",
)
def refund_payment(
    payment_id: UUID,
    payload: RefundCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(AdminDependency),
) -> RefundResponse:
    refund = service.refund_payment(
        db, _user, payment_id, payload.amount, payload.reason, payload.dispute_id
    )
    return _refund_response(refund)


@router.get(
    "/orders/{order_id}",
    response_model=list[PaymentResponse],
    summary="List payment transactions for an order (parties or admin)",
)
def order_payments(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[PaymentResponse]:
    return service.list_order_payments(db, _user, order_id)


@router.get(
    "/orders/{order_id}/settlement",
    response_model=SettlementResponse,
    summary="Get the settlement and payout status for an order",
)
def order_settlement(
    order_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> SettlementResponse:
    settlement = service.get_order_settlement(db, _user, order_id)
    return _settlement_response(settlement)


@router.get(
    "",
    response_model=list[PaymentResponse],
    summary="List payments I have made",
)
def my_payments(
    db: Session = Depends(get_db),
    _user: User = Depends(PurchaserDependency),
) -> list[PaymentResponse]:
    return service.list_my_payments(db, _user)