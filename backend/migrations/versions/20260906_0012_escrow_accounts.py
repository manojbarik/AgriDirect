"""Escrow ledger: explicit escrow account per order.

Records how much of the buyer's money is deposited, held, released to the
farmer, and refunded back to the buyer on top of the existing payment capture
and refund flows.

Revises: 20260906_0011
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0012"
down_revision: str | None = "20260906_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "escrow_accounts",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("order_id", _uuid_type(), nullable=False),
        sa.Column("buyer_id", _uuid_type(), nullable=False),
        sa.Column("farmer_id", _uuid_type(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column(
            "amount_deposited",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "amount_held",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "amount_released",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "amount_refunded",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="OPEN"),
        sa.Column("deposited_at", sa.DateTime(timezone=True)),
        sa.Column("released_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["farmer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("order_id", name="uq_escrow_accounts_order_id"),
        sa.CheckConstraint(
            "status IN ('OPEN','FUNDED','RELEASED','PARTIAL_RELEASE','REFUNDED','CLOSED')",
            name="ck_escrow_accounts_status_valid",
        ),
        sa.CheckConstraint("amount_deposited >= 0", name="ck_escrow_deposited_non_negative"),
        sa.CheckConstraint("amount_held >= 0", name="ck_escrow_held_non_negative"),
        sa.CheckConstraint("amount_released >= 0", name="ck_escrow_released_non_negative"),
        sa.CheckConstraint("amount_refunded >= 0", name="ck_escrow_refunded_non_negative"),
    )
    op.create_index("ix_escrow_accounts_order_id", "escrow_accounts", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_escrow_accounts_order_id", table_name="escrow_accounts")
    op.drop_table("escrow_accounts")