from __future__ import annotations

from datetime import date, time
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Index, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.people import User


class FarmNote(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "farm_notes"
    __table_args__ = (
        Index("ix_farm_notes_farmer_date", "farmer_id", "note_date"),
    )

    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    crop: Mapped[str] = mapped_column(String(120), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    note_date: Mapped[date] = mapped_column(Date, nullable=False)
    note_time: Mapped[time | None] = mapped_column(Time)
    harvest_info: Mapped[str | None] = mapped_column(String(255))

    farmer: Mapped["User"] = relationship(foreign_keys=[farmer_id])
