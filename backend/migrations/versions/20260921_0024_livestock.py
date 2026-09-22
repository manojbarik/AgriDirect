"""Livestock listings marketplace table.

Revises: 20260911_0023
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260921_0024"
down_revision: str | None = "20260911_0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "livestock_listings",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("seller_id", _uuid_type(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False, server_default="OTHER"),
        sa.Column("breed", sa.String(length=100), nullable=False),
        sa.Column("age_months", sa.Integer(), nullable=True),
        sa.Column("health_status", sa.String(length=20), nullable=False, server_default="HEALTHY"),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("availability_status", sa.String(length=20), nullable=False, server_default="AVAILABLE"),
        sa.Column("contact_phone", sa.String(length=20), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "category IN ('CATTLE','BUFFALO','GOAT','SHEEP','POULTRY','OTHER')",
            name="ck_livestock_category_valid",
        ),
        sa.CheckConstraint(
            "health_status IN ('HEALTHY','NEEDS_CHECK','UNDER_TREATMENT')",
            name="ck_livestock_health_valid",
        ),
        sa.CheckConstraint(
            "availability_status IN ('AVAILABLE','SOLD','RESERVED')",
            name="ck_livestock_availability_valid",
        ),
        sa.CheckConstraint("price > 0", name="ck_livestock_price_positive"),
        sa.CheckConstraint("quantity >= 1", name="ck_livestock_qty_positive"),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_livestock_category", "livestock_listings", ["category"])
    op.create_index("ix_livestock_seller", "livestock_listings", ["seller_id"])
    op.create_index("ix_livestock_availability", "livestock_listings", ["availability_status"])


def downgrade() -> None:
    op.drop_index("ix_livestock_availability", table_name="livestock_listings")
    op.drop_index("ix_livestock_seller", table_name="livestock_listings")
    op.drop_index("ix_livestock_category", table_name="livestock_listings")
    op.drop_table("livestock_listings")
