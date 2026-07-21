"""add watch_history

Per-(user, series) watch history rows. The home's Resume rail reads the
4 most recent rows ordered by `last_watched_at` desc to render the
"Continue Watching" shelf with real data instead of a hardcoded slice
of the feed.

Revision ID: 0006_add_watch_history
Revises: 0005_add_series_category
Create Date: 2026-07-21 00:00:00

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0006_add_watch_history"
down_revision = "0005_add_series_category"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "watch_history",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("series_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("series.id"), nullable=False),
        sa.Column("episode_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("episodes.id"), nullable=True),
        sa.Column("progress", sa.Float, nullable=False, server_default="0"),
        sa.Column("last_watched_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "series_id", name="uq_watch_user_series"),
    )
    op.create_index("ix_watch_history_user_id", "watch_history", ["user_id"])
    op.create_index("ix_watch_history_series_id", "watch_history", ["series_id"])
    op.create_index("ix_watch_history_last_watched_at", "watch_history", ["last_watched_at"])


def downgrade() -> None:
    op.drop_index("ix_watch_history_last_watched_at", table_name="watch_history")
    op.drop_index("ix_watch_history_series_id", table_name="watch_history")
    op.drop_index("ix_watch_history_user_id", table_name="watch_history")
    op.drop_table("watch_history")
