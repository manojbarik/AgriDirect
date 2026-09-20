from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.community import service
from app.modules.community.schemas import (
    CommentCreate,
    CommunityCreate,
    CommunityDetailResponse,
    CommunityResponse,
    PostCreate,
)
from app.modules.identity.dependencies import bearer_scheme, get_current_user

router = APIRouter(prefix="/community", tags=["community"])


def _optional_user(
    credentials: Annotated[object, Depends(bearer_scheme)] = None,
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None


@router.get("/groups", summary="List community groups (public)")
def list_groups(
    category: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User | None = Depends(_optional_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    return service.list_groups(db, category, limit, offset, current_user)


@router.get("/groups/{group_id}", summary="Group detail (public)")
def group_detail(
    group_id: UUID,
    current_user: User | None = Depends(_optional_user),
    db: Session = Depends(get_db),
) -> CommunityDetailResponse:
    return service.get_group(db, group_id, current_user)


@router.post("/groups/{group_id}/join", summary="Join a group")
def join_group(
    group_id: UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service.join_group(db, _user.id, group_id)
    return {"status": "joined"}


@router.post("/groups/{group_id}/leave", summary="Leave a group")
def leave_group(
    group_id: UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service.leave_group(db, _user.id, group_id)
    return {"status": "left"}


@router.post(
    "",
    response_model=CommunityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a community group (any authenticated role)",
)
def create_group(
    payload: CommunityCreate,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommunityResponse:
    return CommunityResponse.model_validate(service.create_group(db, _user.id, payload))


@router.get("/feed", summary="Community feed (public)")
def feed(
    group_id: UUID | None = None,
    sort: str = Query(default="newest", pattern="^(newest|top)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[dict]:
    return service.list_feed(db, group_id, sort, limit, offset)


@router.post(
    "/posts",
    status_code=status.HTTP_201_CREATED,
    summary="Create a post",
)
def create_post(
    payload: PostCreate,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.create_post(db, _user.id, payload)


@router.post("/posts/{post_id}/like", summary="Like a post")
def like_post(
    post_id: UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service.like_post(db, _user.id, post_id)
    return {"status": "liked"}


@router.post("/posts/{post_id}/unlike", summary="Unlike a post")
def unlike_post(
    post_id: UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service.unlike_post(db, _user.id, post_id)
    return {"status": "unliked"}


@router.post("/posts/{post_id}/comments", summary="Comment on a post")
def comment_post(
    post_id: UUID,
    payload: CommentCreate,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return service.comment_post(db, _user.id, post_id, payload)


@router.get("/posts/{post_id}", summary="Post detail with comments (public)")
def post_detail(
    post_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    return service.get_post(db, post_id)
