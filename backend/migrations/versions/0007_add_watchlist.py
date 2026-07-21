"""add watchlist

Per-(user, series) saved-series rows. The detail page's Save button
inserts a row; tapping again removes it. Idempotent — re-saving an
already-saved series is a no-op (the unique constraint guarantees
only one row per pair).

Revision ID: 0007_add_watchlist
Revises: 0006_add_watch_history
Create Date: 2026-07-21 00:00:00

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0007_add_watchlist"
down_revision = "0006_add_watch_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "watchlist",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "series_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("series.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "added_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "series_id", name="uq_watchlist_user_series"),
    )
    op.create_index("ix_watchlist_user_id", "watchlist", ["user_id"])
    op.create_index("ix_watchlist_series_id", "watchlist", ["series_id"])
    op.create_index("ix_watchlist_added_at", "watchlist", ["added_at"])


def downgrade() -> None:
    op.drop_index("ix_watchlist_added_at", table_name="watchlist")
    op.drop_index("ix_watchlist_series_id", table_name="watchlist")
    op.drop_index("ix_watchlist_user_id", table_name="watchlist")
    op.drop_table("watchlist")
