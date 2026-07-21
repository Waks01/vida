"""add episode_likes

Per-(user, episode) like rows. The player's heart button inserts a
row; tapping again removes it. Idempotent — re-liking is a no-op.

Revision ID: 0008_add_episode_likes
Revises: 0007_add_watchlist
Create Date: 2026-07-21 00:00:00

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0008_add_episode_likes"
down_revision = "0007_add_watchlist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "episode_likes",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "episode_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("episodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "episode_id", name="uq_like_user_episode"),
    )
    op.create_index("ix_episode_likes_user_id", "episode_likes", ["user_id"])
    op.create_index("ix_episode_likes_episode_id", "episode_likes", ["episode_id"])


def downgrade() -> None:
    op.drop_index("ix_episode_likes_episode_id", table_name="episode_likes")
    op.drop_index("ix_episode_likes_user_id", table_name="episode_likes")
    op.drop_table("episode_likes")
