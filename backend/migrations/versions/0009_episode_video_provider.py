"""add episode video_key and video_site

Revision ID: 0009_episode_video_provider
Revises: 0008_add_episode_likes
Create Date: 2026-07-21
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_episode_video_provider"
down_revision: str | None = "0008_add_episode_likes"
branch_labels: Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("episodes", sa.Column("video_key", sa.String(255), nullable=True))
    op.add_column("episodes", sa.Column("video_site", sa.String(50), nullable=True))
    op.create_index("ix_episodes_video_site", "episodes", ["video_site"])


def downgrade() -> None:
    op.drop_index("ix_episodes_video_site", table_name="episodes")
    op.drop_column("episodes", "video_site")
    op.drop_column("episodes", "video_key")
