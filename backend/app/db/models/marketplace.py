from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.logistics import Shipment
    from app.db.models.people import BuyerProfile, ConsumerProfile, Farm, FarmerProfile
    from app.db.models.transaction import Dispute, Payment, QualityCheck


class Contract(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "contracts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING','COUNTERED','ACCEPTED','ACTIVE','COMPLETED','CANCELLED','EXPIRED')",
            name="ck_contracts_status_valid",
        ),
        Index("ix_contracts_farmer_status", "farmer_id", "status"),
        Index("ix_contracts_buyer_status", "buyer_id", "status"),
    )

    contract_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    listing_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crop_listings.id", ondelete="SET NULL")
    )
    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    buyer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    crop_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crops.id", ondelete="SET NULL")
    )
    quantity_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    agreed_price_per_kg: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    payment_terms: Mapped[str] = mapped_column(Text, nullable=False, default="20% advance, balance on delivery confirmation")
    delivery_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    terms_text: Mapped[str | None] = mapped_column(Text)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL")
    )

    order: Mapped["Order | None"] = relationship(foreign_keys=[order_id])


class Crop(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "crops"
    __table_args__ = (Index("ix_crops_name_variety", "name", "variety"),)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    variety: Mapped[str | None] = mapped_column(String(120))
    category: Mapped[str | None] = mapped_column(String(100))
    default_unit: Mapped[str] = mapped_column(String(30), nullable=False, default="kg")

    crop_plans: Mapped[list["FarmerCropPlan"]] = relationship(back_populates="crop")
    listings: Mapped[list["CropListing"]] = relationship(back_populates="crop")
    demands: Mapped[list["BuyerDemand"]] = relationship(back_populates="crop")


class FarmerCropPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "farmer_crop_plans"
    __table_args__ = (
        CheckConstraint("estimated_quantity >= 0", name="estimated_quantity_non_negative"),
        Index("ix_farmer_crop_plans_farm_crop", "farm_id", "crop_id"),
    )

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"), nullable=False
    )
    crop_id: Mapped[UUID] = mapped_column(ForeignKey("crops.id"), nullable=False)
    season: Mapped[str | None] = mapped_column(String(80))
    expected_harvest_start: Mapped[date | None] = mapped_column(Date)
    expected_harvest_end: Mapped[date | None] = mapped_column(Date)
    estimated_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    cultivation_method: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PLANNED")

    farm: Mapped["Farm"] = relationship(back_populates="crop_plans")
    crop: Mapped[Crop] = relationship(back_populates="crop_plans")


class CropListing(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "crop_listings"
    __table_args__ = (
        CheckConstraint("available_quantity >= 0", name="available_quantity_non_negative"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
        CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'CANCELLED')",
            name="status_valid",
        ),
        Index("ix_crop_listings_marketplace", "status", "crop_id", "state", "available_until"),
        Index("ix_crop_listings_farmer_id", "farmer_id"),
    )

    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("farmer_profiles.id", ondelete="RESTRICT"), nullable=False
    )
    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="RESTRICT"), nullable=False
    )
    crop_id: Mapped[UUID] = mapped_column(
        ForeignKey("crops.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    grade: Mapped[str | None] = mapped_column(String(80))
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    available_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    available_from: Mapped[date | None] = mapped_column(Date)
    available_until: Mapped[date | None] = mapped_column(Date)
    state: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    farmer: Mapped["FarmerProfile"] = relationship(back_populates="listings")
    farm: Mapped["Farm"] = relationship(back_populates="listings")
    crop: Mapped[Crop] = relationship(back_populates="listings")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="listing")
    orders: Mapped[list["Order"]] = relationship(back_populates="listing")
    batches: Mapped[list["CropBatch"]] = relationship(back_populates="listing")


class BuyerDemand(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "buyer_demands"
    __table_args__ = (
        CheckConstraint("requested_quantity > 0", name="requested_quantity_positive"),
        CheckConstraint("target_min_price >= 0", name="target_min_price_non_negative"),
        CheckConstraint("target_max_price >= target_min_price", name="price_range_valid"),
        Index("ix_buyer_demands_marketplace", "status", "crop_id", "state", "required_by"),
        Index("ix_buyer_demands_buyer_id", "buyer_id"),
    )

    buyer_id: Mapped[UUID] = mapped_column(
        ForeignKey("buyer_profiles.id", ondelete="RESTRICT"), nullable=False
    )
    crop_id: Mapped[UUID] = mapped_column(
        ForeignKey("crops.id", ondelete="RESTRICT"), nullable=False
    )
    requested_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    target_min_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    target_max_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    quality_requirements: Mapped[str | None] = mapped_column(Text)
    delivery_address_summary: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    required_by: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT")

    buyer: Mapped["BuyerProfile"] = relationship(back_populates="demands")
    crop: Mapped[Crop] = relationship(back_populates="demands")
    orders: Mapped[list["Order"]] = relationship(back_populates="demand")


class CropBatch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "crop_batches"
    __table_args__ = (
        CheckConstraint("prepared_quantity > 0", name="prepared_quantity_positive"),
        CheckConstraint(
            "status IN ('PREPARING','PREPARED','INSPECTING','PASSED','PROBLEM','DELIVERED','DISPUTED')",
            name="ck_crop_batches_status_valid",
        ),
        CheckConstraint(
            "preparation_status IN ('NOT_STARTED','PREPARING','PREPARED')",
            name="ck_crop_batches_preparation_status_valid",
        ),
        CheckConstraint(
            "pickup_status IN ('NOT_STARTED','PICKED_UP')",
            name="ck_crop_batches_pickup_status_valid",
        ),
        CheckConstraint(
            "delivery_status IN ('NOT_STARTED','IN_TRANSIT','DELIVERED')",
            name="ck_crop_batches_delivery_status_valid",
        ),
        Index("ix_crop_batches_order_id", "order_id"),
        Index("ix_crop_batches_listing_id", "listing_id"),
        Index("ix_crop_batches_farmer_status", "farmer_id", "status"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    listing_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crop_listings.id", ondelete="SET NULL")
    )
    crop_id: Mapped[UUID | None] = mapped_column(ForeignKey("crops.id", ondelete="SET NULL"))
    farmer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("farmer_profiles.id", ondelete="RESTRICT")
    )
    batch_code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    qr_identifier: Mapped[str | None] = mapped_column(String(160), unique=True, nullable=True)
    prepared_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    preparation_notes: Mapped[str | None] = mapped_column(Text)
    packaging_details: Mapped[str | None] = mapped_column(Text)
    harvest_date: Mapped[date | None] = mapped_column(Date)
    quality_grade: Mapped[str | None] = mapped_column(String(30))
    photo_references: Mapped[str | None] = mapped_column(Text)
    prepared_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PREPARING")
    preparation_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PREPARING"
    )
    pickup_status: Mapped[str] = mapped_column(String(30), nullable=False, default="NOT_STARTED")
    delivery_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="NOT_STARTED"
    )

    order: Mapped["Order"] = relationship(back_populates="batches")
    listing: Mapped["CropListing | None"] = relationship(back_populates="batches")
    crop: Mapped["Crop | None"] = relationship()
    farmer: Mapped["FarmerProfile | None"] = relationship()
    quality_checks: Mapped[list["QualityCheck"]] = relationship(back_populates="batch")


class Order(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "orders"
    ORDER_STATUSES = (
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
        "REFUNDED",
        "REPLACED",
        "CANCELLED",
    )
    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="total_amount_non_negative"),
        CheckConstraint(
            f"status IN ({','.join(f'{s!r}' for s in ORDER_STATUSES)})",
            name="ck_orders_status_valid",
        ),
        CheckConstraint("order_type IN ('B2B', 'B2C')", name="ck_orders_order_type_valid"),
        Index("ix_orders_buyer_status_created", "buyer_id", "status", "created_at"),
        Index("ix_orders_consumer_status_created", "consumer_id", "status", "created_at"),
        Index("ix_orders_farmer_status_created", "farmer_id", "status", "created_at"),
    )

    public_order_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("farmer_profiles.id", ondelete="RESTRICT"), nullable=False
    )
    order_type: Mapped[str] = mapped_column(String(10), nullable=False, default="B2B")
    buyer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("buyer_profiles.id", ondelete="RESTRICT"),
        nullable=True,
    )
    consumer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("consumer_profiles.id", ondelete="RESTRICT"),
        nullable=True,
    )
    demand_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("buyer_demands.id", ondelete="SET NULL")
    )
    listing_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crop_listings.id", ondelete="SET NULL")
    )
    crop_id: Mapped[UUID | None] = mapped_column(ForeignKey("crops.id", ondelete="RESTRICT"))
    source_type: Mapped[str] = mapped_column(String(30), nullable=False, default="DIRECT_PURCHASE")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")

    # Initial buyer purchase request
    unit: Mapped[str] = mapped_column(String(30), nullable=False, default="kg")
    requested_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False, default=0)
    requested_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    requested_delivery_date: Mapped[date | None] = mapped_column(Date)

    # Latest pending offer (REQUEST or COUNTER) mirrored for fast accept/reject
    pending_offer_action: Mapped[str | None] = mapped_column(String(30))
    pending_offer_by_role: Mapped[str | None] = mapped_column(String(30))
    pending_offer_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    pending_offer_unit: Mapped[str | None] = mapped_column(String(30))
    pending_offer_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    pending_offer_delivery_date: Mapped[date | None] = mapped_column(Date)

    # Agreed values once both parties accept
    agreed_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    agreed_unit: Mapped[str | None] = mapped_column(String(30))
    agreed_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    agreed_delivery_date: Mapped[date | None] = mapped_column(Date)

    delivery_address_snapshot: Mapped[str | None] = mapped_column(Text)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    quality_confirmation_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    receipt_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    disputed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replaced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pre_dispute_status: Mapped[str | None] = mapped_column(String(30))

    farmer: Mapped["FarmerProfile"] = relationship(back_populates="orders")
    buyer: Mapped["BuyerProfile | None"] = relationship(back_populates="orders")
    consumer: Mapped["ConsumerProfile | None"] = relationship(back_populates="orders")
    demand: Mapped["BuyerDemand | None"] = relationship(back_populates="orders")
    listing: Mapped["CropListing | None"] = relationship(back_populates="orders")
    crop: Mapped["Crop | None"] = relationship()
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    batches: Mapped[list[CropBatch]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="order")
    deliveries: Mapped[list["Delivery"]] = relationship(back_populates="order")
    shipments: Mapped[list["Shipment"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="Shipment.created_at.asc()",
    )
    disputes: Mapped[list["Dispute"]] = relationship(back_populates="order")
    negotiation_messages: Mapped[list["OrderNegotiationMessage"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderNegotiationMessage.created_at.asc()",
    )
    status_events: Mapped[list["OrderStatusEvent"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderStatusEvent.created_at.asc()",
    )


class OrderNegotiationMessage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "order_negotiation_messages"
    __table_args__ = (
        CheckConstraint(
            "from_role IN ('BUYER', 'CONSUMER', 'FARMER')", name="ck_order_negotiation_from_role_valid"
        ),
        CheckConstraint(
            "action IN ('REQUEST', 'COUNTER', 'ACCEPT', 'REJECT')",
            name="ck_order_negotiation_action_valid",
        ),
        Index("ix_order_negotiation_order_created", "order_id", "created_at"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    from_role: Mapped[str] = mapped_column(String(30), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    delivery_date: Mapped[date | None] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(Text)

    order: Mapped[Order] = relationship(back_populates="negotiation_messages")


class OrderStatusEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "order_status_events"
    __table_args__ = (
        CheckConstraint(
            "changed_by_role IN ('BUYER', 'CONSUMER', 'FARMER', 'SYSTEM')",
            name="ck_order_status_events_role_valid",
        ),
        Index("ix_order_status_events_order_created", "order_id", "created_at"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_role: Mapped[str] = mapped_column(String(30), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)

    order: Mapped[Order] = relationship(back_populates="status_events")


class OrderItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
        CheckConstraint("line_total >= 0", name="line_total_non_negative"),
        Index("ix_order_items_order_id", "order_id"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    listing_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crop_listings.id", ondelete="SET NULL")
    )
    crop_id: Mapped[UUID] = mapped_column(
        ForeignKey("crops.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    grade_snapshot: Mapped[str | None] = mapped_column(String(80))

    order: Mapped[Order] = relationship(back_populates="items")
    listing: Mapped["CropListing | None"] = relationship(back_populates="order_items")
    crop: Mapped[Crop] = relationship()


class Delivery(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "deliveries"
    __table_args__ = (Index("ix_deliveries_order_status", "order_id", "status"),)

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    batch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crop_batches.id", ondelete="SET NULL")
    )
    provider: Mapped[str | None] = mapped_column(String(80))
    provider_reference: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    destination_snapshot: Mapped[str | None] = mapped_column(Text)
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped[Order] = relationship(back_populates="deliveries")
    batch: Mapped["CropBatch | None"] = relationship()
