"""Alter farmer_profiles verification_status to the farmer lifecycle states.

Revises: 20260906_0003
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260906_0004"
down_revision: str | None = "20260906_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE farmer_profiles SET verification_status = 'PENDING' WHERE verification_status = 'NOT_STARTED'"
    )
    with op.batch_alter_table("farmer_profiles") as batch_op:
        batch_op.alter_column(
            "verification_status",
            server_default=sa.text("'PENDING'"),
            existing_type=sa.String(length=30),
            existing_nullable=False,
        )
        batch_op.create_check_constraint(
            "verification_status_valid",
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
        )


def downgrade() -> None:
    op.drop_constraint(
        "ck_farmer_profiles_verification_status_valid",
        "farmer_profiles",
        type_="check",
    )
    op.alter_column(
        "farmer_profiles",
        "verification_status",
        server_default=sa.text("'NOT_STARTED'"),
        existing_type=sa.String(length=30),
        existing_nullable=False,
    )
