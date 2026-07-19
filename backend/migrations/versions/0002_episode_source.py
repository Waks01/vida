"""add episode source

Revision ID: 0002_episode_source
Revises: 0001_initial
Create Date: 2026-07-19

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

from app.core.enums import EpisodeSource

# revision identifiers, used by Alembic.
revision: str = "0002_episode_source"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists() -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(c["name"] == "source" for c in insp.get_columns("episodes"))


def upgrade() -> None:
    # `0001_initial` uses Base.metadata.create_all, so on a fresh DB the `source`
    # column already exists. Only add it when missing (e.g. upgrading an older DB).
    if _column_exists():
        return
    enum_type = sa.Enum(EpisodeSource.STREAM.value.upper(), EpisodeSource.EXTERNAL.value.upper(), name="episode_source")
    enum_type.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "episodes",
        sa.Column(
            "source",
            enum_type,
            nullable=False,
            server_default=EpisodeSource.STREAM.name,
        ),
    )


def downgrade() -> None:
    if _column_exists():
        op.drop_column("episodes", "source")
    sa.Enum(name="episode_source").drop(op.get_bind(), checkfirst=True)
