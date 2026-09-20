"""Phase 14 - Delivery, Receipt, and Dispute Management.

Orders:
- New terminal statuses REFUNDED and REPLACED for dispute outcomes.
- Delivery tracking columns: quality confirmation deadline (set on DELIVERED),
  buyer receipt confirmation timestamp, pre-dispute status (so a rejected
  dispute can restore the order), refunded/replaced timestamps.

Disputes:
- Enriches the disputes table with a human admin decision column and a
  controlled status set (OPEN -> UNDER_REVIEW -> REFUND_APPROVED /
  REPLACEMENT_APPROVED / REJECTED -> CLOSED).
- Adds a dispute_status_events audit table recording who performed each
  status change, when, the reason, and the previous/new status for
  disputes, refunds, and replacements.

Revises: 20260906_0007
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0008"
down_revision: str | None = "20260906_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ORDER_STATUSES = (
    "PENDING",
    "ACCEPTED",
    "REJECTED",
    "NEGOTIATING",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "QUALITY_CHECK",
    "COMPLETED",
    "DISPUTED",
    "REFUNDED",
    "REPLACED",
    "CANCELLED",
)
_ORDER_STATUS_LIST = ", ".join(map(repr, ORDER_STATUSES))

DISPUTE_STATUSES = (
    "OPEN",
    "UNDER_REVIEW",
    "REFUND_APPROVED",
    "REPLACEMENT_APPROVED",
    "REJECTED",
    "CLOSED",
)
_DISPUTE_STATUS_LIST = ", ".join(map(repr, DISPUTE_STATUSES))


def _sanitize_order_statuses() -> None:
    op.execute(
        sa.text(
            f"UPDATE orders SET status = 'COMPLETED' "
            f"WHERE status NOT IN ({_ORDER_STATUS_LIST})"
        )
    )


def _sanitize_dispute_statuses() -> None:
    op.execute(
        sa.text(
            f"UPDATE disputes SET status = 'OPEN' "
            f"WHERE status NOT IN ({_DISPUTE_STATUS_LIST})"
        )
    )


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    _sanitize_order_statuses()
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(
            sa.Column("quality_confirmation_deadline", sa.DateTime(timezone=True))
        )
        batch_op.add_column(sa.Column("receipt_confirmed_at", sa.DateTime(timezone=True)))
        batch_op.add_column(sa.Column("refunded_at", sa.DateTime(timezone=True)))
        batch_op.add_column(sa.Column("replaced_at", sa.DateTime(timezone=True)))
        batch_op.add_column(sa.Column("pre_dispute_status", sa.String(length=30)))
        batch_op.drop_constraint("ck_orders_status_valid", type_="check")
        batch_op.create_check_constraint(
            "ck_orders_status_valid", f"status IN ({_ORDER_STATUS_LIST})"
        )

    _sanitize_dispute_statuses()
    with op.batch_alter_table("disputes") as batch_op:
        batch_op.add_column(sa.Column("resolution", sa.String(length=30)))
        batch_op.create_check_constraint(
            "ck_disputes_status_valid", f"status IN ({_DISPUTE_STATUS_LIST})"
        )
        batch_op.create_check_constraint(
            "ck_disputes_resolution_valid",
            "resolution IS NULL OR resolution IN ('REFUND','REPLACEMENT','REJECTED')",
        )

    op.create_table(
        "dispute_status_events",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("dispute_id", _uuid_type(), nullable=False),
        sa.Column("entity_type", sa.String(length=30), nullable=False),
        sa.Column("entity_id", sa.String(length=80)),
        sa.Column("from_status", sa.String(length=30)),
        sa.Column("to_status", sa.String(length=30), nullable=False),
        sa.Column("changed_by_id", _uuid_type()),
        sa.Column("changed_by_role", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "entity_type IN ('DISPUTE','REFUND','REPLACEMENT')",
            name="ck_dispute_events_entity_type_valid",
        ),
        sa.ForeignKeyConstraint(["changed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_dispute_events_dispute_created",
        "dispute_status_events",
        ["dispute_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_dispute_events_dispute_created", table_name="dispute_status_events")
    op.drop_table("dispute_status_events")

    op.drop_constraint("ck_disputes_resolution_valid", "disputes", type_="check")
    op.drop_constraint("ck_disputes_status_valid", "disputes", type_="check")
    op.drop_column("disputes", "resolution")

    op.drop_constraint("ck_orders_status_valid", "orders", type_="check")
    op.create_check_constraint(
        "ck_orders_status_valid",
        "orders",
        "status IN ('PENDING','ACCEPTED','REJECTED','NEGOTIATING','CONFIRMED',"
        "'PREPARING','READY_FOR_PICKUP','IN_TRANSIT','DELIVERED','QUALITY_CHECK',"
        "'COMPLETED','DISPUTED','CANCELLED')",
    )
    op.drop_column("orders", "pre_dispute_status")
    op.drop_column("orders", "replaced_at")
    op.drop_column("orders", "refunded_at")
    op.drop_column("orders", "receipt_confirmed_at")
    op.drop_column("orders", "quality_confirmation_deadline")