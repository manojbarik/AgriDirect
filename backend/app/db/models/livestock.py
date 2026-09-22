"""Livestock listing model for animal marketplace."""
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.people import User


class LivestockListing(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "livestock_listings"
    __table_args__ = (
        CheckConstraint(
            "category IN ('CATTLE','BUFFALO','GOAT','SHEEP','POULTRY','OTHER')",
            name="ck_livestock_category_valid",
        ),
        CheckConstraint(
            "health_status IN ('HEALTHY','NEEDS_CHECK','UNDER_TREATMENT')",
            name="ck_livestock_health_valid",
        ),
        CheckConstraint(
            "availability_status IN ('AVAILABLE','SOLD','RESERVED')",
            name="ck_livestock_availability_valid",
        ),
        CheckConstraint("price > 0", name="ck_livestock_price_positive"),
        CheckConstraint("quantity >= 1", name="ck_livestock_qty_positive"),
        Index("ix_livestock_category", "category"),
        Index("ix_livestock_seller", "seller_id"),
        Index("ix_livestock_availability", "availability_status"),
    )

    seller_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="OTHER")
    breed: Mapped[str] = mapped_column(String(100), nullable=False)
    age_months: Mapped[int | None] = mapped_column(nullable=True)
    health_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="HEALTHY"
    )
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False, default=1)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    availability_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="AVAILABLE"
    )
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationship
    seller: Mapped[User] = relationship("User", lazy="selectin")
