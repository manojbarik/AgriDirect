"""Phase 18 - Admin dashboard: sanitized AI prediction audit table.

Revises: 20260906_0010
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0011"
down_revision: str | None = "20260906_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "ai_predictions",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("prediction_type", sa.String(length=30), nullable=False),
        sa.Column("user_id", _uuid_type()),
        sa.Column("crop_id", _uuid_type()),
        sa.Column("location", sa.String(length=120)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_ai_predictions_type_created",
        "ai_predictions",
        ["prediction_type", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_ai_predictions_type_created", table_name="ai_predictions")
    op.drop_table("ai_predictions")