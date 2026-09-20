"""Audit log for AI prediction/matching calls (Phase 18).

Records every price prediction, demand forecast, farmer match, and buyer match
so the admin dashboard can chart AI activity. Metrics are sanitized: only the
prediction type, a location, and the requesting user are stored (never model
inputs or outputs).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AiPrediction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_predictions"
    __table_args__ = (
        Index("ix_ai_predictions_type_created", "prediction_type", "created_at"),
    )

    prediction_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # price_prediction | demand_forecast | farmer_match | buyer_match
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    crop_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crops.id", ondelete="SET NULL")
    )
    location: Mapped[str | None] = mapped_column(String(120))