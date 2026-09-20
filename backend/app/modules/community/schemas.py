from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CommunityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    cover_emoji: str | None = Field(default=None, max_length=20)
    image_url: str | None = Field(default=None, max_length=500)


class CommunityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None
    cover_emoji: str | None
    image_url: str | None
    member_count: int
    is_public: bool
    created_at: datetime


class CommunityDetailResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    cover_emoji: str | None
    image_url: str | None
    member_count: int
    is_public: bool
    joined: bool
    member_preview: list[str]
    created_at: datetime


class PostCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str = Field(min_length=1, max_length=20000)
    group_id: UUID | None = None
    image_url: str | None = Field(default=None, max_length=500)


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    post_id: UUID
    user_id: UUID
    body: str
    author_name: str | None
    author_initials: str | None
    created_at: datetime


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    community_id: UUID | None
    user_id: UUID
    title: str | None
    body: str
    image_url: str | None
    like_count: int
    comment_count: int
    author_name: str | None
    author_initials: str | None
    created_at: datetime
    comments: list[CommentResponse] = []
