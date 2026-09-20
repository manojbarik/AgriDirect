"""Phase 11 - Negotiation and Order Management.

Evolves orders into negotiation-capable orders with the Phase 11 status set,
and adds order negotiation messages plus a status event audit trail.

Revises: 20260906_0005
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260906_0006"
down_revision: str | None = "20260906_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PHASE11_STATUSES = (
    "PENDING",
    "ACCEPTED",
    "REJECTED",
    "NEGOTIATING",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "QUALITY_CHECK",
    "COMPLETED",
    "DISPUTED",
    "CANCELLED",
)
_STATUS_LIST = ", ".join(map(repr, PHASE11_STATUSES))

LEGACY_TO_PHASE11 = {
    "PENDING_PAYMENT": "PENDING",
    "ADVANCE_PAID": "ACCEPTED",
    "CONFIRMED": "CONFIRMED",
    "PREPARING": "PREPARING",
    "IN_TRANSIT": "IN_TRANSIT",
    "DELIVERED": "DELIVERED",
    "QUALITY_CONFIRMED": "QUALITY_CHECK",
    "DISPUTED": "DISPUTED",
    "SETTLED": "COMPLETED",
    "CANCELLED": "CANCELLED",
}
PHASE11_TO_LEGACY = {
    "PENDING": "PENDING_PAYMENT",
    "ACCEPTED": "ADVANCE_PAID",
    "REJECTED": "CANCELLED",
    "NEGOTIATING": "PENDING_PAYMENT",
    "CONFIRMED": "CONFIRMED",
    "PREPARING": "PREPARING",
    "READY_FOR_PICKUP": "PREPARING",
    "IN_TRANSIT": "IN_TRANSIT",
    "DELIVERED": "DELIVERED",
    "QUALITY_CHECK": "DELIVERED",
    "COMPLETED": "SETTLED",
    "DISPUTED": "DISPUTED",
    "CANCELLED": "CANCELLED",
}


def uuid_column() -> sa.Column:
    return sa.Column("id", sa.Uuid(), primary_key=True)


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    _map_legacy_statuses(LEGACY_TO_PHASE11)
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_constraint("ck_orders_status_valid", type_="check")
        batch_op.alter_column(
            "status",
            server_default=sa.text("'PENDING'"),
            existing_type=sa.String(length=30),
            existing_nullable=False,
        )
        batch_op.add_column(sa.Column("listing_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("crop_id", sa.Uuid(), nullable=True))
        batch_op.add_column(
            sa.Column("unit", sa.String(length=30), nullable=False, server_default="kg")
        )
        batch_op.add_column(
            sa.Column("requested_quantity", sa.Numeric(precision=14, scale=3), nullable=False, server_default="0")
        )
        batch_op.add_column(
            sa.Column("requested_price", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0")
        )
        batch_op.add_column(sa.Column("requested_delivery_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("pending_offer_action", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("pending_offer_by_role", sa.String(length=30), nullable=True))
        batch_op.add_column(
            sa.Column("pending_offer_quantity", sa.Numeric(precision=14, scale=3), nullable=True)
        )
        batch_op.add_column(sa.Column("pending_offer_unit", sa.String(length=30), nullable=True))
        batch_op.add_column(
            sa.Column("pending_offer_price", sa.Numeric(precision=14, scale=2), nullable=True)
        )
        batch_op.add_column(sa.Column("pending_offer_delivery_date", sa.Date(), nullable=True))
        batch_op.add_column(
            sa.Column("agreed_quantity", sa.Numeric(precision=14, scale=3), nullable=True)
        )
        batch_op.add_column(sa.Column("agreed_unit", sa.String(length=30), nullable=True))
        batch_op.add_column(
            sa.Column("agreed_price", sa.Numeric(precision=14, scale=2), nullable=True)
        )
        batch_op.add_column(sa.Column("agreed_delivery_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("disputed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_check_constraint(
            "ck_orders_status_valid", f"status IN ({_STATUS_LIST})"
        )
        batch_op.create_foreign_key(
            "fk_orders_listing_id_crop_listings",
            "crop_listings",
            ["listing_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            "fk_orders_crop_id_crops",
            "crops",
            ["crop_id"],
            ["id"],
            ondelete="RESTRICT",
        )

    op.create_table(
        "order_negotiation_messages",
        uuid_column(),
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("from_role", sa.String(length=30), nullable=False),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=False),
        sa.Column("price", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("delivery_date", sa.Date()),
        sa.Column("note", sa.Text()),
        *timestamps(),
        sa.CheckConstraint("from_role IN ('BUYER', 'FARMER')", name="ck_order_negotiation_from_role_valid"),
        sa.CheckConstraint(
            "action IN ('REQUEST', 'COUNTER', 'ACCEPT', 'REJECT')",
            name="ck_order_negotiation_action_valid",
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_order_negotiation_order_created",
        "order_negotiation_messages",
        ["order_id", "created_at"],
    )

    op.create_table(
        "order_status_events",
        uuid_column(),
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("from_status", sa.String(length=30)),
        sa.Column("to_status", sa.String(length=30), nullable=False),
        sa.Column("changed_by_role", sa.String(length=30), nullable=False),
        sa.Column("note", sa.Text()),
        *timestamps(),
        sa.CheckConstraint(
            "changed_by_role IN ('BUYER', 'FARMER', 'SYSTEM')",
            name="ck_order_status_events_role_valid",
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_order_status_events_order_created", "order_status_events", ["order_id", "created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_order_status_events_order_created", table_name="order_status_events")
    op.drop_table("order_status_events")
    op.drop_index("ix_order_negotiation_order_created", table_name="order_negotiation_messages")
    op.drop_table("order_negotiation_messages")

    op.drop_constraint("fk_orders_crop_id_crops", "orders", type_="foreignkey")
    op.drop_constraint("fk_orders_listing_id_crop_listings", "orders", type_="foreignkey")
    op.drop_constraint("ck_orders_status_valid", "orders", type_="check")

    _map_legacy_statuses(PHASE11_TO_LEGACY)
    op.drop_column("orders", "disputed_at")
    op.drop_column("orders", "cancelled_at")
    op.drop_column("orders", "completed_at")
    op.drop_column("orders", "agreed_delivery_date")
    op.drop_column("orders", "agreed_price")
    op.drop_column("orders", "agreed_unit")
    op.drop_column("orders", "agreed_quantity")
    op.drop_column("orders", "pending_offer_delivery_date")
    op.drop_column("orders", "pending_offer_price")
    op.drop_column("orders", "pending_offer_unit")
    op.drop_column("orders", "pending_offer_quantity")
    op.drop_column("orders", "pending_offer_by_role")
    op.drop_column("orders", "pending_offer_action")
    op.drop_column("orders", "requested_delivery_date")
    op.drop_column("orders", "requested_price")
    op.drop_column("orders", "requested_quantity")
    op.drop_column("orders", "unit")
    op.drop_column("orders", "crop_id")
    op.drop_column("orders", "listing_id")

    op.alter_column(
        "orders",
        "status",
        server_default=sa.text("'PENDING_PAYMENT'"),
        existing_type=sa.String(length=30),
        existing_nullable=False,
    )
    op.create_check_constraint(
        "ck_orders_status_valid",
        "orders",
        "status IN ('PENDING_PAYMENT', 'ADVANCE_PAID', 'CONFIRMED', 'PREPARING', 'IN_TRANSIT', "
        "'DELIVERED', 'QUALITY_CONFIRMED', 'DISPUTED', 'SETTLED', 'CANCELLED')",
    )


def _add_order_columns() -> None:
    op.add_column("orders", sa.Column("listing_id", sa.Uuid(), nullable=True))
    op.add_column("orders", sa.Column("crop_id", sa.Uuid(), nullable=True))
    op.add_column(
        "orders", sa.Column("unit", sa.String(length=30), nullable=False, server_default="kg")
    )
    op.add_column(
        "orders",
        sa.Column("requested_quantity", sa.Numeric(precision=14, scale=3), nullable=False, server_default="0"),
    )
    op.add_column(
        "orders",
        sa.Column("requested_price", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
    )
    op.add_column("orders", sa.Column("requested_delivery_date", sa.Date(), nullable=True))
    op.add_column("orders", sa.Column("pending_offer_action", sa.String(length=30), nullable=True))
    op.add_column("orders", sa.Column("pending_offer_by_role", sa.String(length=30), nullable=True))
    op.add_column(
        "orders", sa.Column("pending_offer_quantity", sa.Numeric(precision=14, scale=3), nullable=True)
    )
    op.add_column("orders", sa.Column("pending_offer_unit", sa.String(length=30), nullable=True))
    op.add_column(
        "orders", sa.Column("pending_offer_price", sa.Numeric(precision=14, scale=2), nullable=True)
    )
    op.add_column("orders", sa.Column("pending_offer_delivery_date", sa.Date(), nullable=True))
    op.add_column(
        "orders", sa.Column("agreed_quantity", sa.Numeric(precision=14, scale=3), nullable=True)
    )
    op.add_column("orders", sa.Column("agreed_unit", sa.String(length=30), nullable=True))
    op.add_column(
        "orders", sa.Column("agreed_price", sa.Numeric(precision=14, scale=2), nullable=True)
    )
    op.add_column("orders", sa.Column("agreed_delivery_date", sa.Date(), nullable=True))
    op.add_column("orders", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("disputed_at", sa.DateTime(timezone=True), nullable=True))


def _map_legacy_statuses(mapping: dict[str, str]) -> None:
    for old, new in mapping.items():
        op.execute(f"UPDATE orders SET status = '{new}' WHERE status = '{old}'")