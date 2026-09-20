"""Direct contracts: sign a fixed agreement between a buyer and a farmer.

Contracts bypass marketplace negotiation: a buyer proposes terms against a
published listing, the farmer accepts or counters, and a single order is
eventually created from the accepted contract.

Revises: 20260906_0012
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0013"
down_revision: str | None = "20260906_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "contracts",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("contract_number", sa.String(length=20), nullable=False),
        sa.Column("listing_id", _uuid_type()),
        sa.Column("farmer_id", _uuid_type(), nullable=False),
        sa.Column("buyer_id", _uuid_type(), nullable=False),
        sa.Column("crop_id", _uuid_type()),
        sa.Column("quantity_kg", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("agreed_price_per_kg", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("total_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column(
            "payment_terms",
            sa.Text(),
            nullable=False,
            server_default="20% advance, balance on delivery confirmation",
        ),
        sa.Column("delivery_deadline", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("terms_text", sa.Text()),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("order_id", _uuid_type()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["listing_id"], ["crop_listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["farmer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["buyer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("contract_number", name="uq_contracts_contract_number"),
        sa.CheckConstraint(
            "status IN ('PENDING','COUNTERED','ACCEPTED','ACTIVE','COMPLETED','CANCELLED','EXPIRED')",
            name="ck_contracts_status_valid",
        ),
    )
    op.create_index("ix_contracts_farmer_status", "contracts", ["farmer_id", "status"])
    op.create_index("ix_contracts_buyer_status", "contracts", ["buyer_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_contracts_buyer_status", table_name="contracts")
    op.drop_index("ix_contracts_farmer_status", table_name="contracts")
    op.drop_table("contracts")