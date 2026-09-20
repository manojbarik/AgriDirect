"""Farm notes table.

Revises: 20260906_0015
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0016"
down_revision: str | None = "20260906_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "farm_notes",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("farmer_id", _uuid_type(), nullable=False),
        sa.Column("crop", sa.String(length=120), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("note_date", sa.Date(), nullable=False),
        sa.Column("note_time", sa.Time()),
        sa.Column("harvest_info", sa.String(length=255)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["farmer_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_farm_notes_farmer_date", "farm_notes", ["farmer_id", "note_date"])


def downgrade() -> None:
    op.drop_index("ix_farm_notes_farmer_date", table_name="farm_notes")
    op.drop_table("farm_notes")
