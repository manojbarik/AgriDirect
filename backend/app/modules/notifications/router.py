from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.identity.dependencies import require_roles
from app.modules.notifications import service
from app.modules.notifications.schemas import NotificationCount, NotificationOut

router = APIRouter(tags=["notifications"])

AuthDependency = require_roles("FARMER", "BUYER", "ADMIN", "BULK_BUYER")


@router.get(
    "/notifications",
    response_model=list[NotificationOut],
    summary="List in-app notifications for the current user",
)
def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    _user: User = Depends(AuthDependency),
    db: Session = Depends(get_db),
) -> list[NotificationOut]:
    return service.list_notifications(db, _user, unread_only=unread_only, limit=limit)


@router.get(
    "/notifications/unread-count",
    response_model=NotificationCount,
    summary="Unread notification count for the current user",
)
def unread_notifications(
    _user: User = Depends(AuthDependency),
    db: Session = Depends(get_db),
) -> NotificationCount:
    return service.unread_count(db, _user)


@router.post(
    "/notifications/{notification_id}/read",
    response_model=NotificationOut,
    summary="Mark a single notification as read",
)
def mark_notification_read(
    notification_id: UUID,
    _user: User = Depends(AuthDependency),
    db: Session = Depends(get_db),
) -> NotificationOut:
    return service.mark_read(db, _user, notification_id)


@router.post(
    "/notifications/read-all",
    response_model=NotificationCount,
    summary="Mark all notifications as read",
)
def mark_all_notifications_read(
    _user: User = Depends(AuthDependency),
    db: Session = Depends(get_db),
) -> NotificationCount:
    return service.mark_all_read(db, _user)