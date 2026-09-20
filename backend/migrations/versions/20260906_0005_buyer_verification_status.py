"""Alter buyer_profiles verification statuses to the buyer lifecycle states.

Revises: 20260906_0004
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260906_0005"
down_revision: str | None = "20260906_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE buyer_profiles SET verification_status = 'PENDING' WHERE verification_status = 'NOT_STARTED'"
    )
    op.execute(
        "UPDATE buyer_profiles SET payment_verification_status = 'PENDING' WHERE payment_verification_status = 'NOT_STARTED'"
    )
    with op.batch_alter_table("buyer_profiles") as batch_op:
        batch_op.alter_column(
            "verification_status",
            server_default=sa.text("'PENDING'"),
            existing_type=sa.String(length=30),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "payment_verification_status",
            server_default=sa.text("'PENDING'"),
            existing_type=sa.String(length=30),
            existing_nullable=False,
        )
        batch_op.create_check_constraint(
            "verification_status_valid",
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
        )
        batch_op.create_check_constraint(
            "payment_verification_status_valid",
            "payment_verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
        )
        batch_op.create_check_constraint(
            "buyer_type_valid",
            "buyer_type IN ('INDIVIDUAL', 'RESTAURANT', 'HOTEL_HOSTEL', 'RETAILER', 'WHOLESALER', 'BUSINESS')",
        )


def downgrade() -> None:
    op.drop_constraint(
        "ck_buyer_profiles_buyer_type_valid",
        "buyer_profiles",
        type_="check",
    )
    op.drop_constraint(
        "ck_buyer_profiles_payment_verification_status_valid",
        "buyer_profiles",
        type_="check",
    )
    op.drop_constraint(
        "ck_buyer_profiles_verification_status_valid",
        "buyer_profiles",
        type_="check",
    )
    op.alter_column(
        "buyer_profiles",
        "verification_status",
        server_default=sa.text("'NOT_STARTED'"),
        existing_type=sa.String(length=30),
        existing_nullable=False,
    )
    op.alter_column(
        "buyer_profiles",
        "payment_verification_status",
        server_default=sa.text("'NOT_STARTED'"),
        existing_type=sa.String(length=30),
        existing_nullable=False,
    )
