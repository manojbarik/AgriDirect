"""Add shipments and tracking_events tables for Stage P logistics tracking.

Ships carry an order from an origin waypoint snapshot to a destination, with a
live tracking event feed. ``tracking_events`` records each immutable checkpoint
(pickup, ETA updates, GPS checkpoints, delivery).

Revises: 20260908_0019
Create Date: 2026-09-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260908_0020"
down_revision: str | None = "20260908_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "shipments",
        sa.Column("id", PostgresUUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", PostgresUUID(as_uuid=True), nullable=False),
        sa.Column("provider_user_id", PostgresUUID(as_uuid=True), nullable=False),
        sa.Column("driver_name", sa.String(length=120)),
        sa.Column("vehicle_label", sa.String(length=60)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="ASSIGNED"),
        sa.Column("waypoints", sa.JSON, nullable=False),
        sa.Column("current_stop_index", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_stops", sa.Integer, nullable=False, server_default="0"),
        sa.Column("eta_minutes", sa.Integer),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["provider_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("order_id", name="uq_shipments_order_id"),
        sa.CheckConstraint(
            "status IN ('ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')",
            name="ck_shipments_status_valid",
        ),
    )
    op.create_index(
        "ix_shipments_provider_status_created",
        "shipments",
        ["provider_user_id", "status", "created_at"],
    )
    op.create_index("ix_shipments_order_id", "shipments", ["order_id"])

    op.create_table(
        "tracking_events",
        sa.Column("id", PostgresUUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", PostgresUUID(as_uuid=True), nullable=False),
        sa.Column("sequence", sa.Integer, nullable=False, server_default="0"),
        sa.Column("event_type", sa.String(length=30), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("latitude", sa.Float),
        sa.Column("longitude", sa.Float),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "event_type IN ('ASSIGNED', 'PICKUP', 'CHECKPOINT', 'ETA_UPDATE', 'DELIVERED')",
            name="ck_tracking_events_type_valid",
        ),
    )
    op.create_index(
        "ix_tracking_events_shipment_sequence", "tracking_events", ["shipment_id", "sequence"]
    )


def downgrade() -> None:
    op.drop_index("ix_tracking_events_shipment_sequence", table_name="tracking_events")
    op.drop_table("tracking_events")
    op.drop_index("ix_shipments_order_id", table_name="shipments")
    op.drop_index("ix_shipments_provider_status_created", table_name="shipments")
    op.drop_table("shipments")