"""Add password_hash column to users for password-based authentication.

Revision ID: 20260906_0003
Revises: 20260906_0002
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260906_0003"
down_revision: str | None = "20260906_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=128)))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
