"""Phase 16 - Two-way ratings and reviews: add comment column to ratings.

Revises: 20260906_0009
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260906_0010"
down_revision: str | None = "20260906_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ratings", sa.Column("comment", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("ratings", "comment")