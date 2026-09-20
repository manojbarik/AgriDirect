"""Phase 15 - Trust Score Engine history.

Adds an append-only trust_score_history table that snapshots every change to
a user's transparent, factor-based trust score (reason for the change, the
full factor breakdown, and the acting administrator when one triggered the
recalculation).

Revises: 20260906_0008
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0009"
down_revision: str | None = "20260906_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "trust_score_history",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("score_band", sa.String(length=30), nullable=False),
        sa.Column("calculation_version", sa.String(length=40), nullable=False),
        sa.Column("reason", sa.String(length=40), nullable=False),
        sa.Column("breakdown", sa.Text()),
        sa.Column("changed_by_id", _uuid_type()),
        sa.Column("changed_by_role", sa.String(length=30)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["changed_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_trust_score_history_user_created",
        "trust_score_history",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_trust_score_history_user_created", table_name="trust_score_history")
    op.drop_table("trust_score_history")