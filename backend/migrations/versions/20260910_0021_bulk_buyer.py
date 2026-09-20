"""Add BULK_BUYER role and bulk_buyer_profiles table.

Introduces the enterprise/FPO bulk-buyer role with an organization profile
(org identity, GSTIN, contact person, verification status) while widening
the users.role check constraint to include 'BULK_BUYER'.

Revises: 20260908_0020
Create Date: 2026-09-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260910_0021"
down_revision: str | None = "20260908_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def _role_checks_to_drop() -> list[str]:
    """Base names of existing users.role CHECK constraints for batch drops.

    SQLite does not reliably persist constraint names and the naming
    convention is applied twice (once at table create, again inside batch
    recreate), so the stored name can be ``ck_users_role_valid`` or
    ``ck_users_ck_users_role_valid`` depending on DB lineage. Reflect the
    stored name and strip the ``ck_users_`` prefix so the batch drop resolves
    to the constraint that actually exists.
    """
    insp = sa.inspect(op.get_bind())
    stored = [
        c["name"] for c in insp.get_check_constraints("users") if c["name"] and "role" in c["name"]
    ]
    prefix = "ck_users_"
    return [n[len(prefix):] if n.startswith(prefix) else n for n in stored]


def _widen_role_constraint() -> None:
    role_checks = _role_checks_to_drop()
    with op.batch_alter_table("users", recreate="auto") as batch_op:
        for name in role_checks:
            batch_op.drop_constraint(name, type_="check")
        batch_op.create_check_constraint(
            "role_valid",
            "role IN ('FARMER','BUYER','ADMIN','CONSUMER','LOGISTICS','BULK_BUYER')",
        )


def upgrade() -> None:
    _widen_role_constraint()

    op.create_table(
        "bulk_buyer_profiles",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("organization_name", sa.String(length=200), nullable=False),
        sa.Column("org_type", sa.String(length=40), nullable=False, server_default="OTHER"),
        sa.Column("gstin", sa.String(length=20)),
        sa.Column("contact_person", sa.String(length=160)),
        sa.Column(
            "verification_status",
            sa.String(length=30),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_bulk_buyer_profiles_user_id"),
        sa.CheckConstraint(
            "org_type IN ('FPO','CO_OPERATIVE','PROCESSOR','WHOLESALER','EXPORTER','RETAIL_CHAIN','OTHER')",
            name="org_type_valid",
        ),
        sa.CheckConstraint(
            "verification_status IN ('PENDING','VERIFIED','REJECTED')",
            name="verification_status_valid",
        ),
    )
    op.create_index(
        "ix_bulk_buyer_profiles_verification_status",
        "bulk_buyer_profiles",
        ["verification_status"],
    )


def downgrade() -> None:
    op.drop_index("ix_bulk_buyer_profiles_verification_status", table_name="bulk_buyer_profiles")
    op.drop_table("bulk_buyer_profiles")

    with op.batch_alter_table("users", recreate="auto") as batch_op:
        for name in _role_checks_to_drop():
            batch_op.drop_constraint(name, type_="check")
        batch_op.create_check_constraint(
            "role_valid",
            "role IN ('FARMER','BUYER','ADMIN','CONSUMER','LOGISTICS')",
        )