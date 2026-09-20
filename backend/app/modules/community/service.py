from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.models.social import (
    Community,
    CommunityComment,
    CommunityLike,
    CommunityMember,
    CommunityPost,
)
from app.modules.community.schemas import CommentCreate, CommunityCreate, PostCreate


def _not_found(detail: str = "Not found") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _unique_slug(db: Session, name: str) -> str:
    base = slugify(name) or "group"
    candidate = base
    while db.scalar(select(Community).where(Community.slug == candidate)) is not None:
        candidate = f"{base}-{uuid4().hex[:6]}"
    return candidate


def slugify(value: str) -> str:
    s = value.strip().lower()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in " -_":
            out.append("-")
    return "".join(out).strip("-").replace("--", "-")[:120]


def _author_name(user: User) -> str:
    if user.farmer_profile is not None:
        return user.farmer_profile.full_name
    if user.buyer_profile is not None:
        return user.buyer_profile.full_name
    if user.logistics_profile is not None:
        return user.logistics_profile.company_name
    return f"User-{str(user.id)[:8]}"


def _initials(user: User, name: str | None = None) -> str:
    name = name or _author_name(user)
    words = [w for w in name.split() if w]
    if not words:
        return "U"
    return "".join(w[0].upper() for w in words[:2])


def _user_initials(db: Session, user_id: UUID) -> str:
    user = db.get(User, user_id)
    if user is None:
        return "U"
    return _initials(user)


def list_groups(
    db: Session, category: str | None, limit: int, offset: int, current_user: User | None
) -> list[dict]:
    stmt = select(Community)
    if category:
        stmt = stmt.where(Community.name.ilike(f"%{category}%"))
    groups = db.scalars(
        stmt.order_by(Community.member_count.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    joined_ids = set()
    if current_user is not None:
        joined_ids = {
            m.community_id
            for m in db.scalars(
                select(CommunityMember).where(CommunityMember.user_id == current_user.id)
            ).all()
        }
    result = []
    for g in groups:
        result.append(
            {
                "id": g.id,
                "name": g.name,
                "slug": g.slug,
                "description": g.description,
                "cover_emoji": g.cover_emoji,
                "image_url": g.image_url,
                "member_count": g.member_count,
                "is_public": g.is_public,
                "joined": g.id in joined_ids,
                "created_at": g.created_at,
            }
        )
    return result


def get_group(db: Session, group_id: UUID, current_user: User | None) -> dict:
    group = db.get(Community, group_id)
    if group is None:
        raise _not_found("Group not found")
    members = db.scalars(
        select(CommunityMember)
        .where(CommunityMember.community_id == group.id)
        .order_by(CommunityMember.joined_at.asc())
        .limit(20)
    ).all()
    preview = [_user_initials(db, m.user_id) for m in members]
    joined = False
    if current_user is not None:
        joined = (
            db.scalar(
                select(CommunityMember).where(
                    CommunityMember.community_id == group.id,
                    CommunityMember.user_id == current_user.id,
                )
            )
            is not None
        )
    return {
        "id": group.id,
        "name": group.name,
        "slug": group.slug,
        "description": group.description,
        "cover_emoji": group.cover_emoji,
        "image_url": group.image_url,
        "member_count": group.member_count,
        "is_public": group.is_public,
        "joined": joined,
        "member_preview": preview,
        "created_at": group.created_at,
    }


def create_group(db: Session, user_id: UUID, payload: CommunityCreate) -> Community:
    group = Community(
        name=payload.name,
        slug=_unique_slug(db, payload.name),
        description=payload.description,
        cover_emoji=payload.cover_emoji,
        image_url=payload.image_url,
        member_count=1,
        is_public=True,
        created_by=user_id,
    )
    db.add(group)
    db.flush()
    db.add(
        CommunityMember(
            community_id=group.id,
            user_id=user_id,
            role="OWNER",
            joined_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(group)
    return group


def join_group(db: Session, user_id: UUID, group_id: UUID) -> None:
    group = db.get(Community, group_id)
    if group is None:
        raise _not_found("Group not found")
    existing = db.scalar(
        select(CommunityMember).where(
            CommunityMember.community_id == group.id,
            CommunityMember.user_id == user_id,
        )
    )
    if existing is not None:
        return
    db.add(
        CommunityMember(
            community_id=group.id,
            user_id=user_id,
            role="MEMBER",
            joined_at=datetime.now(timezone.utc),
        )
    )
    group.member_count += 1
    db.commit()


def leave_group(db: Session, user_id: UUID, group_id: UUID) -> None:
    member = db.scalar(
        select(CommunityMember).where(
            CommunityMember.community_id == group_id,
            CommunityMember.user_id == user_id,
        )
    )
    if member is None:
        return
    if member.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot leave the group"
        )
    db.delete(member)
    group = db.get(Community, group_id)
    if group is not None and group.member_count > 0:
        group.member_count -= 1
    db.commit()


def _post_to_dict(db: Session, post: CommunityPost) -> dict:
    author = db.get(User, post.user_id)
    name = _author_name(author) if author else None
    return {
        "id": post.id,
        "community_id": post.community_id,
        "user_id": post.user_id,
        "title": post.title,
        "body": post.body,
        "image_url": post.image_url,
        "like_count": post.like_count,
        "comment_count": post.comment_count,
        "author_name": name,
        "author_initials": _initials(author, name) if author else None,
        "created_at": post.created_at,
        "comments": [],
    }


def list_feed(
    db: Session, group_id: UUID | None, sort: str, limit: int, offset: int
) -> list[dict]:
    stmt = select(CommunityPost)
    if group_id is not None:
        stmt = stmt.where(CommunityPost.community_id == group_id)
    if sort == "top":
        stmt = stmt.order_by(CommunityPost.like_count.desc(), CommunityPost.created_at.desc())
    else:
        stmt = stmt.order_by(CommunityPost.created_at.desc())
    posts = db.scalars(stmt.limit(limit).offset(offset)).all()
    return [_post_to_dict(db, p) for p in posts]


def create_post(db: Session, user_id: UUID, payload: PostCreate) -> CommunityPost:
    if payload.group_id is not None:
        group = db.get(Community, payload.group_id)
        if group is None:
            raise _not_found("Group not found")
    post = CommunityPost(
        community_id=payload.group_id,
        user_id=user_id,
        title=payload.title,
        body=payload.body,
        image_url=payload.image_url,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def get_post(db: Session, post_id: UUID) -> dict:
    post = db.get(CommunityPost, post_id)
    if post is None:
        raise _not_found("Post not found")
    data = _post_to_dict(db, post)
    comments = db.scalars(
        select(CommunityComment)
        .where(CommunityComment.post_id == post.id)
        .order_by(CommunityComment.created_at.asc())
    ).all()
    data["comments"] = []
    for c in comments:
        author = db.get(User, c.user_id)
        name = _author_name(author) if author else None
        data["comments"].append(
            {
                "id": c.id,
                "post_id": c.post_id,
                "user_id": c.user_id,
                "body": c.body,
                "author_name": name,
                "author_initials": _initials(author, name) if author else None,
                "created_at": c.created_at,
            }
        )
    return data


def like_post(db: Session, user_id: UUID, post_id: UUID) -> None:
    post = db.get(CommunityPost, post_id)
    if post is None:
        raise _not_found("Post not found")
    existing = db.scalar(
        select(CommunityLike).where(
            CommunityLike.post_id == post.id, CommunityLike.user_id == user_id
        )
    )
    if existing is None:
        db.add(CommunityLike(post_id=post.id, user_id=user_id))
        post.like_count += 1
        db.commit()


def unlike_post(db: Session, user_id: UUID, post_id: UUID) -> None:
    like = db.scalar(
        select(CommunityLike).where(
            CommunityLike.post_id == post_id, CommunityLike.user_id == user_id
        )
    )
    if like is None:
        return
    db.delete(like)
    post = db.get(CommunityPost, post_id)
    if post is not None and post.like_count > 0:
        post.like_count -= 1
    db.commit()


def comment_post(db: Session, user_id: UUID, post_id: UUID, payload: CommentCreate) -> dict:
    post = db.get(CommunityPost, post_id)
    if post is None:
        raise _not_found("Post not found")
    comment = CommunityComment(post_id=post.id, user_id=user_id, body=payload.body)
    db.add(comment)
    post.comment_count += 1
    db.commit()
    db.refresh(comment)
    author = db.get(User, user_id)
    name = _author_name(author) if author else None
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "body": comment.body,
        "author_name": name,
        "author_initials": _initials(author, name) if author else None,
        "created_at": comment.created_at,
    }
