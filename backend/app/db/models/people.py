from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.marketplace import BuyerDemand, CropListing, FarmerCropPlan, Order
    from app.db.models.social import Notification, Rating, Review, TrustScore
    from app.db.models.transaction import Dispute


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('FARMER', 'BUYER', 'ADMIN', 'CONSUMER', 'LOGISTICS', 'BULK_BUYER')",
            name="role_valid",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED')",
            name="status_valid",
        ),
        Index("ix_users_role_status", "role", "status"),
    )

    phone_e164: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="FARMER")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    phone_verified_at: Mapped[datetime | None]

    farmer_profile: Mapped["FarmerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    buyer_profile: Mapped["BuyerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    consumer_profile: Mapped["ConsumerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    logistics_profile: Mapped["LogisticsPartnerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    bulk_buyer_profile: Mapped["BulkBuyerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    disputes_opened: Mapped[list["Dispute"]] = relationship(back_populates="opened_by")
    ratings_given: Mapped[list["Rating"]] = relationship(
        foreign_keys="Rating.rater_id", back_populates="rater"
    )
    ratings_received: Mapped[list["Rating"]] = relationship(
        foreign_keys="Rating.rated_user_id", back_populates="rated_user"
    )
    reviews_written: Mapped[list["Review"]] = relationship(
        foreign_keys="Review.author_id", back_populates="author"
    )
    trust_score: Mapped["TrustScore | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class FarmerProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "farmer_profiles"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
            name="verification_status_valid",
        ),
        Index("ix_farmer_profiles_verification_status", "verification_status"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    preferred_language: Mapped[str | None] = mapped_column(String(20))
    payout_profile_reference: Mapped[str | None] = mapped_column(String(255))

    user: Mapped[User] = relationship(back_populates="farmer_profile")
    farms: Mapped[list["Farm"]] = relationship(
        back_populates="farmer", cascade="all, delete-orphan"
    )
    listings: Mapped[list["CropListing"]] = relationship(back_populates="farmer")
    orders: Mapped[list["Order"]] = relationship(back_populates="farmer")


class Farm(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "farms"
    __table_args__ = (
        CheckConstraint("acreage >= 0", name="acreage_non_negative"),
        Index("ix_farms_farmer_id", "farmer_id"),
        Index("ix_farms_location", "state", "district"),
    )

    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    acreage: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    farming_type: Mapped[str | None] = mapped_column(String(80))
    address_summary: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    locality: Mapped[str | None] = mapped_column(String(120))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))

    farmer: Mapped[FarmerProfile] = relationship(back_populates="farms")
    listings: Mapped[list["CropListing"]] = relationship(back_populates="farm")
    crop_plans: Mapped[list["FarmerCropPlan"]] = relationship(back_populates="farm")


class BuyerProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "buyer_profiles"
    __table_args__ = (
        CheckConstraint(
            "buyer_type IN ('INDIVIDUAL', 'RESTAURANT', 'HOTEL_HOSTEL', 'RETAILER', 'WHOLESALER', 'BUSINESS')",
            name="buyer_type_valid",
        ),
        CheckConstraint(
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
            name="verification_status_valid",
        ),
        CheckConstraint(
            "payment_verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
            name="payment_verification_status_valid",
        ),
        Index("ix_buyer_profiles_verification_status", "verification_status"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    buyer_type: Mapped[str] = mapped_column(String(60), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(200))
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    payment_verification_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PENDING"
    )
    address_summary: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    locality: Mapped[str | None] = mapped_column(String(120))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    payment_profile_reference: Mapped[str | None] = mapped_column(String(255))

    user: Mapped[User] = relationship(back_populates="buyer_profile")
    demands: Mapped[list["BuyerDemand"]] = relationship(
        back_populates="buyer", cascade="all, delete-orphan"
    )
    orders: Mapped[list["Order"]] = relationship(back_populates="buyer")


class ConsumerProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "consumer_profiles"
    __table_args__ = (
        Index("ix_consumer_profiles_user_id", "user_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    state: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    preferred_language: Mapped[str | None] = mapped_column(String(20))
    dietary_preference: Mapped[str | None] = mapped_column(String(100))

    user: Mapped[User] = relationship(back_populates="consumer_profile")
    orders: Mapped[list["Order"]] = relationship(back_populates="consumer")


class LogisticsPartnerProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "logistics_partner_profiles"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
            name="logistics_verification_status_valid",
        ),
        Index("ix_logistics_partner_profiles_verification_status", "verification_status"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    vehicle_count: Mapped[int | None] = mapped_column()
    service_area: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    contact_city: Mapped[str | None] = mapped_column(String(100))
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")

    user: Mapped[User] = relationship(back_populates="logistics_profile")


class BulkBuyerProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bulk_buyer_profiles"
    __table_args__ = (
        CheckConstraint(
            "org_type IN ('FPO', 'CO_OPERATIVE', 'PROCESSOR', 'WHOLESALER', 'EXPORTER', 'RETAIL_CHAIN', 'OTHER')",
            name="org_type_valid",
        ),
        CheckConstraint(
            "verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')",
            name="verification_status_valid",
        ),
        Index("ix_bulk_buyer_profiles_verification_status", "verification_status"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    organization_name: Mapped[str] = mapped_column(String(200), nullable=False)
    org_type: Mapped[str] = mapped_column(String(40), nullable=False, default="OTHER")
    gstin: Mapped[str | None] = mapped_column(String(20))
    contact_person: Mapped[str | None] = mapped_column(String(160))
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")

    user: Mapped[User] = relationship(back_populates="bulk_buyer_profile")
