"""add episode views counter

Revision ID: 0003_episode_views
Revises: 0002_episode_source
Create Date: 2026-07-19

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_episode_views"
down_revision: str | None = "0002_episode_source"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists() -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(c["name"] == "views" for c in insp.get_columns("episodes"))


def upgrade() -> None:
    if _column_exists():
        return
    op.add_column(
        "episodes",
        sa.Column("views", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )


def downgrade() -> None:
    if _column_exists():
        op.drop_column("episodes", "views")
