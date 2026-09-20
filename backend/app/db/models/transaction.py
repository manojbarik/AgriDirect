from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.marketplace import CropBatch, Order
    from app.db.models.people import FarmerProfile, User


class Payment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="amount_non_negative"),
        CheckConstraint(
            "status IN ('PENDING','AUTHORIZED','PAID','FAILED','REFUNDED',"
            "'PARTIALLY_REFUNDED','SETTLED')",
            name="ck_payments_status_valid",
        ),
        CheckConstraint(
            "operation IN ('ADVANCE','BALANCE')",
            name="ck_payments_operation_valid",
        ),
        Index("ix_payments_order_status", "order_id", "status"),
        Index("ix_payments_provider_event_id", "provider_event_id"),
        UniqueConstraint("operation", "idempotency_key", name="uq_payments_operation_idempotency"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    payer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    operation: Mapped[str] = mapped_column(String(30), nullable=False, default="ADVANCE")
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    provider: Mapped[str | None] = mapped_column(String(80))
    provider_reference: Mapped[str | None] = mapped_column(String(255))
    provider_event_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    failure_code: Mapped[str | None] = mapped_column(String(80))
    checkout_url: Mapped[str | None] = mapped_column(String(500))
    refunded_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped["Order"] = relationship(back_populates="payments")
    payer: Mapped["User"] = relationship()


class QualityCheck(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quality_checks"
    __table_args__ = (
        CheckConstraint("result IN ('PASS','PROBLEM')", name="ck_quality_checks_result_valid"),
        CheckConstraint("quantity_received IS NULL OR quantity_received >= 0", name="ck_quality_checks_quantity_received_non_negative"),
        CheckConstraint("damaged_quantity IS NULL OR damaged_quantity >= 0", name="ck_quality_checks_damaged_quantity_non_negative"),
        Index("ix_quality_checks_batch_result", "batch_id", "result"),
    )

    batch_id: Mapped[UUID] = mapped_column(
        ForeignKey("crop_batches.id", ondelete="CASCADE"), nullable=False
    )
    inspector_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    result: Mapped[str] = mapped_column(String(30), nullable=False)
    quality_grade: Mapped[str | None] = mapped_column(String(30))
    quantity_received: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    damaged_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    notes: Mapped[str | None] = mapped_column(Text)
    quality_data: Mapped[str | None] = mapped_column(Text)
    evidence_reference: Mapped[str | None] = mapped_column(String(500))
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    batch: Mapped["CropBatch"] = relationship(back_populates="quality_checks")
    inspector: Mapped["User | None"] = relationship()


class Dispute(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "disputes"
    DISPUTE_STATUSES = (
        "OPEN",
        "UNDER_REVIEW",
        "REFUND_APPROVED",
        "REPLACEMENT_APPROVED",
        "REJECTED",
        "CLOSED",
    )
    RESOLUTIONS = ("REFUND", "REPLACEMENT", "REJECTED")
    __table_args__ = (
        CheckConstraint(
            f"status IN ({','.join(f'{s!r}' for s in DISPUTE_STATUSES)})",
            name="ck_disputes_status_valid",
        ),
        CheckConstraint(
            "resolution IS NULL OR resolution IN ('REFUND','REPLACEMENT','REJECTED')",
            name="ck_disputes_resolution_valid",
        ),
        Index("ix_disputes_queue", "status", "deadline"),
        Index("ix_disputes_order_id", "order_id"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    opened_by_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requested_resolution: Mapped[str | None] = mapped_column(String(80))
    resolution: Mapped[str | None] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPEN")
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped["Order"] = relationship(back_populates="disputes")
    opened_by: Mapped["User"] = relationship(back_populates="disputes_opened")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="dispute")
    replacements: Mapped[list["Replacement"]] = relationship(back_populates="dispute")
    events: Mapped[list["DisputeStatusEvent"]] = relationship(
        back_populates="dispute",
        cascade="all, delete-orphan",
        order_by="DisputeStatusEvent.created_at.asc()",
    )


class DisputeStatusEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Audit trail for dispute, refund, and replacement status changes.

    Records who performed the action, when it happened, the optional reason,
    and the previous/new status of the tracked entity.
    """

    __tablename__ = "dispute_status_events"
    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('DISPUTE','REFUND','REPLACEMENT')",
            name="ck_dispute_events_entity_type_valid",
        ),
        Index("ix_dispute_events_dispute_created", "dispute_id", "created_at"),
    )

    dispute_id: Mapped[UUID] = mapped_column(
        ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(80))
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    changed_by_role: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)

    dispute: Mapped[Dispute] = relationship(back_populates="events")
    changed_by: Mapped["User | None"] = relationship()


class Refund(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "refunds"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        Index("ix_refunds_payment_status", "payment_id", "status"),
    )

    payment_id: Mapped[UUID] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False
    )
    dispute_id: Mapped[UUID | None] = mapped_column(ForeignKey("disputes.id", ondelete="SET NULL"))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    provider_reference: Mapped[str | None] = mapped_column(String(255), unique=True)
    reason: Mapped[str | None] = mapped_column(String(255))

    payment: Mapped[Payment] = relationship()
    dispute: Mapped["Dispute | None"] = relationship(back_populates="refunds")


class Replacement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "replacements"
    __table_args__ = (Index("ix_replacements_dispute_status", "dispute_id", "status"),)

    dispute_id: Mapped[UUID] = mapped_column(
        ForeignKey("disputes.id", ondelete="RESTRICT"), nullable=False
    )
    replacement_order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="REQUESTED")
    reason: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    dispute: Mapped["Dispute"] = relationship(back_populates="replacements")
    replacement_order: Mapped["Order | None"] = relationship(foreign_keys=[replacement_order_id])


class Settlement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "settlements"
    __table_args__ = (
        CheckConstraint("gross_amount >= 0", name="gross_amount_non_negative"),
        CheckConstraint("fee_amount >= 0", name="fee_amount_non_negative"),
        CheckConstraint("net_amount >= 0", name="net_amount_non_negative"),
        Index("ix_settlements_order_status", "order_id", "status"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    eligible_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped["Order"] = relationship()
    payouts: Mapped[list["Payout"]] = relationship(back_populates="settlement")


class EscrowAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "escrow_accounts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN','FUNDED','RELEASED','PARTIAL_RELEASE','REFUNDED','CLOSED')",
            name="ck_escrow_accounts_status_valid",
        ),
        CheckConstraint("amount_deposited >= 0", name="ck_escrow_deposited_non_negative"),
        CheckConstraint("amount_held >= 0", name="ck_escrow_held_non_negative"),
        CheckConstraint("amount_released >= 0", name="ck_escrow_released_non_negative"),
        CheckConstraint("amount_refunded >= 0", name="ck_escrow_refunded_non_negative"),
        Index("ix_escrow_accounts_order_id", "order_id"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    buyer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    amount_deposited: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    amount_held: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    amount_released: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    amount_refunded: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPEN")
    deposited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped["Order"] = relationship()


class Payout(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payouts"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        Index("ix_payouts_settlement_status", "settlement_id", "status"),
    )

    settlement_id: Mapped[UUID] = mapped_column(
        ForeignKey("settlements.id", ondelete="RESTRICT"), nullable=False
    )
    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("farmer_profiles.id", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    provider_reference: Mapped[str | None] = mapped_column(String(255), unique=True)

    settlement: Mapped[Settlement] = relationship(back_populates="payouts")
    farmer: Mapped["FarmerProfile"] = relationship()
