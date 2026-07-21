"""add_series_category

Adds a nullable `category` column to the `series` table, backed by a
PostgreSQL ENUM type so the database can reject unknown values at write
time. The enum is created in this migration; future migrations that want
to add values must ALTER TYPE (out of scope here — every chip the mobile
client knows about is enumerated below).

Revision ID: 0005_add_series_category
Revises: 0004_ad_callback_token
Create Date: 2026-07-21 00:00:00

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0005_add_series_category"
down_revision = "0004_ad_callback_token"
branch_labels = None
depends_on = None


# Mirror of app.core.enums.SeriesCategory — kept inline so the migration
# has zero runtime deps on the app package (a migration that imports
# app code can't be applied from a bare `alembic upgrade`).
CATEGORY_VALUES = (
    # Editorial
    "hot", "new", "trending", "ranking", "recommended", "coming_soon",
    # Format / origin
    "movies", "tv_series", "novel", "originals",
    "anime", "asian", "nigerian", "latino",
    # Tropes
    "heartbreak", "love_hate", "first_love", "secret_baby",
    "werewolf", "vampire", "zombie", "reborn", "time_travel",
    "revenge", "mafia", "ceo", "royalty", "doctor",
)


def upgrade() -> None:
    # 1. Create the PostgreSQL ENUM type the column will use.
    series_category = sa.Enum(*CATEGORY_VALUES, name="series_category")
    series_category.create(op.get_bind(), checkfirst=True)

    # 2. Add the column as nullable — every existing row predates the
    #    category concept and gets a NULL until seeded.
    op.add_column(
        "series",
        sa.Column("category", series_category, nullable=True),
    )

    # 3. Index for the `?category=` filter — most home queries are
    #    WHERE category = X ORDER BY total_views DESC, so this index
    #    is on the category column alone; total_views ordering is
    #    fine without a composite index for the volumes we serve.
    op.create_index(
        "ix_series_category",
        "series",
        ["category"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_series_category", table_name="series")
    op.drop_column("series", "category")
    sa.Enum(name="series_category").drop(op.get_bind(), checkfirst=True)
