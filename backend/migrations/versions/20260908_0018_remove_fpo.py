"""Remove FPO role and fpo_profiles table.

Reassigns existing FPO users to BUYER (FPO functioned as an aggregation
body in the marketplace) before narrowing the users.role check constraint
and dropping the fpo_profiles table.

Revises: 20260906_0017
Create Date: 2026-09-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260908_0018"
down_revision: str | None = "20260906_0017"
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


def _burn_role_constraint() -> None:
    role_checks = _role_checks_to_drop()
    with op.batch_alter_table("users", recreate="auto") as batch_op:
        for name in role_checks:
            batch_op.drop_constraint(name, type_="check")
        batch_op.create_check_constraint(
            "role_valid",
            "role IN ('FARMER','BUYER','ADMIN','CONSUMER','LOGISTICS')",
        )


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'BUYER' WHERE role = 'FPO'")

    _burn_role_constraint()

    op.drop_index("ix_fpo_profiles_verification_status", table_name="fpo_profiles")
    op.drop_table("fpo_profiles")


def downgrade() -> None:
    role_checks = _role_checks_to_drop()
    with op.batch_alter_table("users", recreate="auto") as batch_op:
        for name in role_checks:
            batch_op.drop_constraint(name, type_="check")
        batch_op.create_check_constraint(
            "role_valid",
            "role IN ('FARMER','BUYER','ADMIN','FPO','CONSUMER','LOGISTICS')",
        )

    op.create_table(
        "fpo_profiles",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("fpo_registration_number", sa.String(length=80), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=False),
        sa.Column("district", sa.String(length=100)),
        sa.Column("member_count", sa.Integer),
        sa.Column("description", sa.Text()),
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
        sa.UniqueConstraint("user_id", name="uq_fpo_profiles_user_id"),
        sa.UniqueConstraint("fpo_registration_number", name="uq_fpo_profiles_registration_number"),
        sa.CheckConstraint(
            "verification_status IN ('PENDING','VERIFIED','REJECTED')",
            name="fpo_verification_status_valid",
        ),
    )
    op.create_index("ix_fpo_profiles_verification_status", "fpo_profiles", ["verification_status"])