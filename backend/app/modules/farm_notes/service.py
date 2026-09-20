from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.farm_note import FarmNote
from app.modules.farm_notes.schemas import FarmNoteCreate, FarmNoteUpdate


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm note not found")


def _require_own(db: Session, farmer_id: UUID, note_id: UUID) -> FarmNote:
    note = db.get(FarmNote, note_id)
    if note is None or note.farmer_id != farmer_id:
        raise _not_found()
    return note


def list_notes(db: Session, farmer_id: UUID) -> list[FarmNote]:
    return list(
        db.scalars(
            select(FarmNote)
            .where(FarmNote.farmer_id == farmer_id)
            .order_by(FarmNote.note_date.desc(), FarmNote.created_at.desc())
        ).all()
    )


def create_note(db: Session, farmer_id: UUID, payload: FarmNoteCreate) -> FarmNote:
    note = FarmNote(farmer_id=farmer_id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def get_note(db: Session, farmer_id: UUID, note_id: UUID) -> FarmNote:
    return _require_own(db, farmer_id, note_id)


def update_note(
    db: Session, farmer_id: UUID, note_id: UUID, payload: FarmNoteUpdate
) -> FarmNote:
    note = _require_own(db, farmer_id, note_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, farmer_id: UUID, note_id: UUID) -> None:
    note = _require_own(db, farmer_id, note_id)
    db.delete(note)
    db.commit()
