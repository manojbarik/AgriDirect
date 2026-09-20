"""Pydantic schemas for in-app notifications."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    channel: str
    notification_type: str
    title: str
    body: str
    read_at: datetime | None
    delivery_status: str
    created_at: datetime


class NotificationCount(BaseModel):
    unread_count: int