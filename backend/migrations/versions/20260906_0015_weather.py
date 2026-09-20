"""Weather forecasts table.

Revises: 20260906_0014
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

revision: str = "20260906_0015"
down_revision: str | None = "20260906_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_type() -> PostgresUUID:
    return PostgresUUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "weather_forecasts",
        sa.Column("id", _uuid_type(), primary_key=True),
        sa.Column("state", sa.String(length=100), nullable=False),
        sa.Column("district", sa.String(length=100), nullable=False),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("condition", sa.String(length=80), nullable=False),
        sa.Column("temperature_c", sa.Float(), nullable=False),
        sa.Column("temp_high_c", sa.Float(), nullable=False),
        sa.Column("temp_low_c", sa.Float(), nullable=False),
        sa.Column("humidity", sa.Float(), nullable=False),
        sa.Column("precipitation_mm", sa.Float(), nullable=False, server_default="0"),
        sa.Column("wind_speed_kmh", sa.Float(), nullable=False, server_default="0"),
        sa.Column("pressure_hpa", sa.Float(), nullable=False, server_default="1013"),
        sa.Column("rain_probability", sa.Float(), nullable=False, server_default="0"),
        sa.Column("sunrise", sa.Time()),
        sa.Column("sunset", sa.Time()),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("farming_tip", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_weather_forecasts_location_date",
        "weather_forecasts",
        ["state", "district", "forecast_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_weather_forecasts_location_date", table_name="weather_forecasts")
    op.drop_table("weather_forecasts")
