"""Add QR identifier for crop batches.

Introduces crop_batches.qr_identifier, a unique traceability token rendered as
a QR identifier on batch detail for farm-to-buyer traceability.

Revises: 20260910_0021
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260911_0022"
down_revision: str | None = "20260910_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("crop_batches", recreate="auto") as batch_op:
        batch_op.add_column(
            sa.Column(
                "qr_identifier",
                sa.String(length=160),
                nullable=True,
                unique=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("crop_batches", recreate="auto") as batch_op:
        batch_op.drop_index("ix_crop_batches_qr_identifier")
        batch_op.drop_column("qr_identifier")