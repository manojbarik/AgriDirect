"""Add FPO, CONSUMER, LOGISTICS roles and their profile tables.

Revises: 20260906_0013
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0014"
down_revision: str | None = "20260906_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
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

    op.create_table(
        "consumer_profiles",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("state", sa.String(length=100)),
        sa.Column("district", sa.String(length=100)),
        sa.Column("preferred_language", sa.String(length=20)),
        sa.Column("dietary_preference", sa.String(length=100)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_consumer_profiles_user_id"),
    )
    op.create_index("ix_consumer_profiles_user_id", "consumer_profiles", ["user_id"])

    op.create_table(
        "logistics_partner_profiles",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("company_name", sa.String(length=200), nullable=False),
        sa.Column("vehicle_count", sa.Integer),
        sa.Column("service_area", sa.String(length=100)),
        sa.Column("district", sa.String(length=100)),
        sa.Column("contact_city", sa.String(length=100)),
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
        sa.UniqueConstraint("user_id", name="uq_logistics_partner_profiles_user_id"),
        sa.CheckConstraint(
            "verification_status IN ('PENDING','VERIFIED','REJECTED')",
            name="logistics_verification_status_valid",
        ),
    )
    op.create_index(
        "ix_logistics_partner_profiles_verification_status",
        "logistics_partner_profiles",
        ["verification_status"],
    )


def downgrade() -> None:
    op.drop_index("ix_logistics_partner_profiles_verification_status", table_name="logistics_partner_profiles")
    op.drop_table("logistics_partner_profiles")
    op.drop_index("ix_consumer_profiles_user_id", table_name="consumer_profiles")
    op.drop_table("consumer_profiles")
    op.drop_index("ix_fpo_profiles_verification_status", table_name="fpo_profiles")
    op.drop_table("fpo_profiles")
    role_checks = _role_checks_to_drop()
    with op.batch_alter_table("users", recreate="auto") as batch_op:
        for name in role_checks:
            batch_op.drop_constraint(name, type_="check")
        batch_op.create_check_constraint(
            "role_valid",
            "role IN ('FARMER','BUYER','ADMIN')",
        )
