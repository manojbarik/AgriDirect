from __future__ import annotations

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FarmNoteCreate(BaseModel):
    crop: str = Field(min_length=1, max_length=120)
    note: str = Field(min_length=1, max_length=10000)
    note_date: date
    note_time: time | None = None
    harvest_info: str | None = Field(default=None, max_length=255)


class FarmNoteUpdate(BaseModel):
    crop: str | None = Field(default=None, min_length=1, max_length=120)
    note: str | None = Field(default=None, min_length=1, max_length=10000)
    note_date: date | None = None
    note_time: time | None = None
    harvest_info: str | None = Field(default=None, max_length=255)


class FarmNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farmer_id: UUID
    crop: str
    note: str
    note_date: date
    note_time: time | None
    harvest_info: str | None
    created_at: datetime
    updated_at: datetime
