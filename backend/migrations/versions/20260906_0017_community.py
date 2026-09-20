"""Community groups, members, posts, comments, likes.

Revises: 20260906_0016
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0017"
down_revision: str | None = "20260906_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "communities",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("cover_emoji", sa.String(length=20)),
        sa.Column("image_url", sa.String(length=500)),
        sa.Column("member_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", _uuid_type(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("slug", name="uq_communities_slug"),
    )
    op.create_index("ix_communities_is_public", "communities", ["is_public"])

    op.create_table(
        "community_members",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("community_id", _uuid_type(), nullable=False),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False, server_default="MEMBER"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "role IN ('MEMBER','MODERATOR','OWNER')", name="ck_community_members_role_valid"
        ),
        sa.UniqueConstraint(
            "community_id", "user_id", name="uq_community_members_community_user"
        ),
    )
    op.create_index("ix_community_members_community_id", "community_members", ["community_id"])
    op.create_index("ix_community_members_user_id", "community_members", ["user_id"])

    op.create_table(
        "community_posts",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("community_id", _uuid_type()),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("title", sa.String(length=200)),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500)),
        sa.Column("like_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_community_posts_created_at", "community_posts", ["created_at"])
    op.create_index(
        "ix_community_posts_community_created",
        "community_posts",
        ["community_id", "created_at"],
    )

    op.create_table(
        "community_comments",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("post_id", _uuid_type(), nullable=False),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_community_comments_post_created", "community_comments", ["post_id", "created_at"]
    )

    op.create_table(
        "community_likes",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("post_id", _uuid_type(), nullable=False),
        sa.Column("user_id", _uuid_type(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_community_likes_post_user"),
    )
    op.create_index("ix_community_likes_post_id", "community_likes", ["post_id"])


def downgrade() -> None:
    op.drop_index("ix_community_likes_post_id", table_name="community_likes")
    op.drop_table("community_likes")
    op.drop_index("ix_community_comments_post_created", table_name="community_comments")
    op.drop_table("community_comments")
    op.drop_index("ix_community_posts_community_created", table_name="community_posts")
    op.drop_index("ix_community_posts_created_at", table_name="community_posts")
    op.drop_table("community_posts")
    op.drop_index("ix_community_members_user_id", table_name="community_members")
    op.drop_index("ix_community_members_community_id", table_name="community_members")
    op.drop_table("community_members")
    op.drop_index("ix_communities_is_public", table_name="communities")
    op.drop_table("communities")
