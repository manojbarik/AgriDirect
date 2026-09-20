from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.marketplace import Order
    from app.db.models.people import User

SHIPMENT_STATUSES = (
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
TRACKING_EVENT_TYPES = (
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


class Shipment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A delivery assignment owned by a logistics partner.

    ``waypoints`` is a JSON snapshot of the ordered route stops built when the
    shipment is assigned (origin -> destination plus any intermediate stops).
    The live position, ``current_stop_index``, walks an expanded synthetic list
    of positions (each segment is padded with two checkpoints) so clients can
    render a moving vehicle even with just two real waypoints.
    """

    __tablename__ = "shipments"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({','.join(f'{s!r}' for s in SHIPMENT_STATUSES)})",
            name="ck_shipments_status_valid",
        ),
        Index("ix_shipments_provider_status_created", "provider_user_id", "status", "created_at"),
        Index("ix_shipments_order_id", "order_id"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    provider_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    driver_name: Mapped[str | None] = mapped_column(String(120))
    vehicle_label: Mapped[str | None] = mapped_column(String(60))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ASSIGNED")
    waypoints: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    current_stop_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_stops: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    eta_minutes: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    pickup_location: Mapped[str | None] = mapped_column(String(200))
    pickup_latitude: Mapped[float | None] = mapped_column(Float)
    pickup_longitude: Mapped[float | None] = mapped_column(Float)
    destination_location: Mapped[str | None] = mapped_column(String(200))
    destination_latitude: Mapped[float | None] = mapped_column(Float)
    destination_longitude: Mapped[float | None] = mapped_column(Float)
    current_latitude: Mapped[float | None] = mapped_column(Float)
    current_longitude: Mapped[float | None] = mapped_column(Float)
    distance_remaining_km: Mapped[float | None] = mapped_column(Float)
    is_demo_gps: Mapped[bool] = mapped_column(default=False)

    order: Mapped["Order"] = relationship(back_populates="shipments")
    provider: Mapped["User"] = relationship()
    events: Mapped[list["TrackingEvent"]] = relationship(
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="TrackingEvent.sequence.asc()",
    )


class TrackingEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One immutable checkpoint on a shipment's live tracking feed."""

    __tablename__ = "tracking_events"
    __table_args__ = (
        CheckConstraint(
            f"event_type IN ({','.join(f'{t!r}' for t in TRACKING_EVENT_TYPES)})",
            name="ck_tracking_events_type_valid",
        ),
        Index("ix_tracking_events_shipment_sequence", "shipment_id", "sequence"),
    )

    shipment_id: Mapped[UUID] = mapped_column(
        ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(120))

    shipment: Mapped[Shipment] = relationship(back_populates="events")