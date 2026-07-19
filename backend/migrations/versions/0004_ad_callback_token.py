"""add ad_views callback_token (anti-replay)

Revision ID: 0004_ad_callback_token
Revises: 0003_episode_views
Create Date: 2026-07-19

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0004_ad_callback_token"
down_revision: str | None = "0003_episode_views"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists() -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(c["name"] == "callback_token" for c in insp.get_columns("ad_views"))


def upgrade() -> None:
    if _column_exists():
        return
    op.add_column(
        "ad_views",
        sa.Column("callback_token", sa.String(255), nullable=True, unique=True),
    )
    op.create_index("ix_ad_views_callback_token", "ad_views", ["callback_token"], unique=True)


def downgrade() -> None:
    if _column_exists():
        op.drop_index("ix_ad_views_callback_token", table_name="ad_views")
        op.drop_column("ad_views", "callback_token")
