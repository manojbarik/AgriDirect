from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.marketplace import Order
    from app.db.models.people import User


class Rating(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ratings"
    __table_args__ = (
        CheckConstraint("score BETWEEN 1 AND 5", name="score_valid"),
        UniqueConstraint(
            "order_id", "rater_id", "rated_user_id", name="uq_ratings_order_rater_rated"
        ),
        Index("ix_ratings_rated_user_id", "rated_user_id"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    rater_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    rated_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)

    order: Mapped["Order"] = relationship()
    rater: Mapped["User"] = relationship(foreign_keys=[rater_id], back_populates="ratings_given")
    rated_user: Mapped["User"] = relationship(
        foreign_keys=[rated_user_id], back_populates="ratings_received"
    )


class Review(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="rating_valid"),
        UniqueConstraint(
            "order_id", "author_id", "subject_id", name="uq_reviews_order_author_subject"
        ),
        Index("ix_reviews_subject_id", "subject_id"),
    )

    order_id: Mapped[UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    author_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    subject_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    moderation_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PUBLISHED")

    order: Mapped["Order"] = relationship()
    author: Mapped["User"] = relationship(
        foreign_keys=[author_id], back_populates="reviews_written"
    )
    subject: Mapped["User"] = relationship(foreign_keys=[subject_id])


class TrustScore(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trust_scores"
    __table_args__ = (
        CheckConstraint("score BETWEEN 0 AND 100", name="score_valid"),
        Index("ix_trust_scores_score", "score"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    score_band: Mapped[str] = mapped_column(String(30), nullable=False, default="NEW")
    calculation_version: Mapped[str] = mapped_column(String(40), nullable=False, default="v1")
    contributing_factors: Mapped[str | None] = mapped_column(Text)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="trust_score")


class TrustScoreHistory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Append-only snapshot of a user's trust score whenever it changes."""

    __tablename__ = "trust_score_history"
    __table_args__ = (
        Index("ix_trust_score_history_user_created", "user_id", "created_at"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    score_band: Mapped[str] = mapped_column(String(30), nullable=False)
    calculation_version: Mapped[str] = mapped_column(String(40), nullable=False)
    reason: Mapped[str] = mapped_column(String(40), nullable=False)
    breakdown: Mapped[str | None] = mapped_column(Text)
    changed_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    changed_by_role: Mapped[str | None] = mapped_column(String(30))


class Notification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_read_created", "user_id", "read_at", "created_at"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[str] = mapped_column(String(30), nullable=False, default="IN_APP")
    notification_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivery_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    provider_reference: Mapped[str | None] = mapped_column(String(255))

    user: Mapped["User"] = relationship(back_populates="notifications")


class Community(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "communities"
    __table_args__ = (
        Index("ix_communities_is_public", "is_public"),
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    cover_emoji: Mapped[str | None] = mapped_column(String(20))
    image_url: Mapped[str | None] = mapped_column(String(500))
    member_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    members: Mapped[list["CommunityMember"]] = relationship(
        back_populates="community", cascade="all, delete-orphan"
    )


class CommunityMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "community_members"
    __table_args__ = (
        CheckConstraint(
            "role IN ('MEMBER', 'MODERATOR', 'OWNER')", name="ck_community_members_role_valid"
        ),
        UniqueConstraint(
            "community_id", "user_id", name="uq_community_members_community_user"
        ),
        Index("ix_community_members_community_id", "community_id"),
        Index("ix_community_members_user_id", "user_id"),
    )

    community_id: Mapped[UUID] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="MEMBER")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    community: Mapped[Community] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()


class CommunityPost(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "community_posts"
    __table_args__ = (
        Index("ix_community_posts_created_at", "created_at"),
        Index("ix_community_posts_community_created", "community_id", "created_at"),
    )

    community_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE")
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    author: Mapped["User"] = relationship(foreign_keys=[user_id])
    community: Mapped[Community | None] = relationship()
    comments: Mapped[list["CommunityComment"]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )
    likes: Mapped[list["CommunityLike"]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )


class CommunityComment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "community_comments"
    __table_args__ = (
        Index("ix_community_comments_post_created", "post_id", "created_at"),
    )

    post_id: Mapped[UUID] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)

    post: Mapped[CommunityPost] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship()


class CommunityLike(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "community_likes"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_community_likes_post_user"),
        Index("ix_community_likes_post_id", "post_id"),
    )

    post_id: Mapped[UUID] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    post: Mapped[CommunityPost] = relationship(back_populates="likes")
    user: Mapped["User"] = relationship()
