"""Add location and live tracking columns for Stage P+ logistics.

Introduces explicit pickup/destination coordinates and addresses, current vehicle
coordinates, remaining distance, demo GPS flag on shipments, updated_by on
tracking_events, and expands check constraints for statuses and event types.

Revises: 20260911_0022
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260911_0023"
down_revision: str | None = "20260911_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_SHIPMENT_STATUSES = (
    "ORDER_PLACED",
    "LOGISTICS_PENDING",
    "ASSIGNED",
    "PICKUP_SCHEDULED",
    "PICKED_UP",
    "IN_TRANSIT",
    "NEAR_DESTINATION",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "DELAYED",
    "FAILED_DELIVERY",
)

NEW_TRACKING_EVENT_TYPES = (
    "ORDER_PLACED",
    "LOGISTICS_PENDING",
    "ASSIGNED",
    "PICKUP_SCHEDULED",
    "PICKUP",
    "IN_TRANSIT",
    "CHECKPOINT",
    "ETA_UPDATE",
    "NEAR_DESTINATION",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "DELAYED",
    "FAILED_DELIVERY",
)


def upgrade() -> None:
    with op.batch_alter_table(
        "shipments",
        recreate="always",
        table_args=(
            sa.CheckConstraint(
                f"status IN ({','.join(f'{s!r}' for s in NEW_SHIPMENT_STATUSES)})",
                name="ck_shipments_status_valid",
            ),
        ),
    ) as batch_op:
        batch_op.drop_constraint("ck_shipments_status_valid", type_="check")
        batch_op.add_column(sa.Column("pickup_location", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("pickup_latitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("pickup_longitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("destination_location", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("destination_latitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("destination_longitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("current_latitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("current_longitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("distance_remaining_km", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("is_demo_gps", sa.Boolean(), server_default=sa.text("0"), nullable=False))

    with op.batch_alter_table(
        "tracking_events",
        recreate="always",
        table_args=(
            sa.CheckConstraint(
                f"event_type IN ({','.join(f'{t!r}' for t in NEW_TRACKING_EVENT_TYPES)})",
                name="ck_tracking_events_type_valid",
            ),
        ),
    ) as batch_op:
        batch_op.drop_constraint("ck_tracking_events_type_valid", type_="check")
        batch_op.add_column(sa.Column("updated_by", sa.String(length=120), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tracking_events", recreate="always") as batch_op:
        batch_op.drop_column("updated_by")

    with op.batch_alter_table("shipments", recreate="always") as batch_op:
        batch_op.drop_column("is_demo_gps")
        batch_op.drop_column("distance_remaining_km")
        batch_op.drop_column("current_longitude")
        batch_op.drop_column("current_latitude")
        batch_op.drop_column("destination_longitude")
        batch_op.drop_column("destination_latitude")
        batch_op.drop_column("destination_location")
        batch_op.drop_column("pickup_longitude")
        batch_op.drop_column("pickup_latitude")
        batch_op.drop_column("pickup_location")
