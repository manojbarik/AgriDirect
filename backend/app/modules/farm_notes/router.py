from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.farm_notes import service
from app.modules.farm_notes.schemas import (
    FarmNoteCreate,
    FarmNoteResponse,
    FarmNoteUpdate,
)
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/farm-notes", tags=["farm-notes"])


@router.get("", response_model=list[FarmNoteResponse], summary="List my farm notes")
def list_notes(
    db: Session = Depends(get_db),
    _farmer: User = Depends(require_roles("FARMER")),
) -> list[FarmNoteResponse]:
    return [FarmNoteResponse.model_validate(n) for n in service.list_notes(db, _farmer.id)]


@router.post(
    "",
    response_model=FarmNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a farm note",
)
def create_note(
    payload: FarmNoteCreate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(require_roles("FARMER")),
) -> FarmNoteResponse:
    return FarmNoteResponse.model_validate(service.create_note(db, _farmer.id, payload))


@router.get("/{note_id}", response_model=FarmNoteResponse, summary="Get one farm note")
def get_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(require_roles("FARMER")),
) -> FarmNoteResponse:
    return FarmNoteResponse.model_validate(service.get_note(db, _farmer.id, note_id))


@router.put("/{note_id}", response_model=FarmNoteResponse, summary="Update a farm note")
def update_note(
    note_id: UUID,
    payload: FarmNoteUpdate,
    db: Session = Depends(get_db),
    _farmer: User = Depends(require_roles("FARMER")),
) -> FarmNoteResponse:
    return FarmNoteResponse.model_validate(service.update_note(db, _farmer.id, note_id, payload))


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a farm note",
)
def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    _farmer: User = Depends(require_roles("FARMER")),
) -> None:
    service.delete_note(db, _farmer.id, note_id)
