"""Notification dispatch and query service.

`emit` is intentionally fail-soft: it never raises into a business flow, so a broken
template or a vanished user can never break registration, payments, or deliveries.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.models.social import Notification
from app.modules.notifications import providers, templates
from app.modules.notifications.schemas import NotificationCount, NotificationOut

logger = logging.getLogger(__name__)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def emit(
    db: Session,
    event_type: str,
    *,
    user_id: UUID,
    changed_by: User | None = None,
    **context: object,
) -> Notification | None:
    """Create one in-app notification and fan out to other (stub) providers.

    Returns the persisted row, or None when the event/target is invalid. Fail-soft.
    """
    if user_id is None or db.get(User, user_id) is None:
        return None
    template = templates.get_template(event_type)
    if template is None:
        logger.warning("Notification event %s has no template; skipped", event_type)
        return None
    try:
        title, body = templates.render(title=template[0], body=template[1], context=context)
        notification = Notification(
            user_id=user_id,
            channel="IN_APP",
            notification_type=event_type,
            title=title,
            body=body,
            delivery_status="DELIVERED",
        )
        if changed_by is not None:
            notification.provider_reference = f"reason:{changed_by.id}"
        db.add(notification)
        db.flush()
        providers.dispatch_out_of_band(
            user_id=str(user_id),
            notification_type=event_type,
            title=title,
            body=body,
        )
        return notification
    except Exception:  # pragma: no cover - defensive, never break a business flow
        logger.exception("Failed to emit notification %s for user %s", event_type, user_id)
        return None


def list_notifications(
    db: Session, user: User, *, unread_only: bool = False, limit: int = 50
) -> list[NotificationOut]:
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    rows = db.scalars(
        stmt.order_by(Notification.created_at.desc()).limit(max(1, min(limit, 200)))
    ).all()
    return [NotificationOut.model_validate(row) for row in rows]


def unread_count(db: Session, user: User) -> NotificationCount:
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
        )
    ) or 0
    return NotificationCount(unread_count=count)


def mark_read(db: Session, user: User, notification_id: UUID) -> NotificationOut:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    )
    if notification is None:
        raise _not_found("Notification not found")
    if notification.read_at is None:
        from datetime import datetime, timezone

        notification.read_at = datetime.now(timezone.utc)
        db.commit()
    return NotificationOut.model_validate(notification)


def mark_all_read(db: Session, user: User) -> NotificationCount:
    unread = db.scalars(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
        )
    ).all()
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    for notification in unread:
        notification.read_at = now
    db.commit()
    return NotificationCount(unread_count=len(unread))