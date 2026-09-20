"""Create initial marketplace database schema.

Revision ID: 20260906_0001
Revises:
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260906_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_column() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        uuid_column(),
        sa.Column("phone_e164", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=320)),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="FARMER"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("phone_verified_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.CheckConstraint("role IN ('FARMER', 'BUYER', 'ADMIN')", name="ck_users_role_valid"),
        sa.CheckConstraint(
            "status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED')",
            name="ck_users_status_valid",
        ),
        sa.UniqueConstraint("phone_e164", name="uq_users_phone_e164"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_role_status", "users", ["role", "status"])

    op.create_table(
        "farmer_profiles",
        uuid_column(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column(
            "verification_status",
            sa.String(length=30),
            nullable=False,
            server_default="NOT_STARTED",
        ),
        sa.Column("preferred_language", sa.String(length=20)),
        sa.Column("payout_profile_reference", sa.String(length=255)),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_farmer_profiles_user_id"),
    )
    op.create_index(
        "ix_farmer_profiles_verification_status", "farmer_profiles", ["verification_status"]
    )

    op.create_table(
        "buyer_profiles",
        uuid_column(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("buyer_type", sa.String(length=60), nullable=False),
        sa.Column("business_name", sa.String(length=200)),
        sa.Column(
            "verification_status",
            sa.String(length=30),
            nullable=False,
            server_default="NOT_STARTED",
        ),
        sa.Column(
            "payment_verification_status",
            sa.String(length=30),
            nullable=False,
            server_default="NOT_STARTED",
        ),
        sa.Column("address_summary", sa.Text()),
        sa.Column("state", sa.String(length=100)),
        sa.Column("district", sa.String(length=100)),
        sa.Column("locality", sa.String(length=120)),
        sa.Column("postal_code", sa.String(length=20)),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6)),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6)),
        sa.Column("payment_profile_reference", sa.String(length=255)),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_buyer_profiles_user_id"),
    )
    op.create_index(
        "ix_buyer_profiles_verification_status", "buyer_profiles", ["verification_status"]
    )

    op.create_table(
        "farms",
        uuid_column(),
        sa.Column("farmer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("acreage", sa.Numeric(precision=12, scale=2)),
        sa.Column("farming_type", sa.String(length=80)),
        sa.Column("address_summary", sa.Text()),
        sa.Column("state", sa.String(length=100)),
        sa.Column("district", sa.String(length=100)),
        sa.Column("locality", sa.String(length=120)),
        sa.Column("postal_code", sa.String(length=20)),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6)),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6)),
        *timestamps(),
        sa.CheckConstraint("acreage >= 0", name="ck_farms_acreage_non_negative"),
        sa.ForeignKeyConstraint(["farmer_id"], ["farmer_profiles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_farms_farmer_id", "farms", ["farmer_id"])
    op.create_index("ix_farms_location", "farms", ["state", "district"])

    op.create_table(
        "crops",
        uuid_column(),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("variety", sa.String(length=120)),
        sa.Column("category", sa.String(length=100)),
        sa.Column("default_unit", sa.String(length=30), nullable=False, server_default="kg"),
        *timestamps(),
    )
    op.create_index("ix_crops_name_variety", "crops", ["name", "variety"])

    op.create_table(
        "farmer_crop_plans",
        uuid_column(),
        sa.Column("farm_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("crop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("season", sa.String(length=80)),
        sa.Column("expected_harvest_start", sa.Date()),
        sa.Column("expected_harvest_end", sa.Date()),
        sa.Column("estimated_quantity", sa.Numeric(precision=14, scale=3)),
        sa.Column("cultivation_method", sa.String(length=100)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PLANNED"),
        *timestamps(),
        sa.CheckConstraint(
            "estimated_quantity >= 0", name="ck_farmer_crop_plans_estimated_quantity_non_negative"
        ),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_farmer_crop_plans_farm_crop", "farmer_crop_plans", ["farm_id", "crop_id"])

    op.create_table(
        "crop_listings",
        uuid_column(),
        sa.Column("farmer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("farm_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("crop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("grade", sa.String(length=80)),
        sa.Column("unit", sa.String(length=30), nullable=False),
        sa.Column("available_quantity", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("available_from", sa.Date()),
        sa.Column("available_until", sa.Date()),
        sa.Column("state", sa.String(length=100)),
        sa.Column("district", sa.String(length=100)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="DRAFT"),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.CheckConstraint(
            "available_quantity >= 0", name="ck_crop_listings_available_quantity_non_negative"
        ),
        sa.CheckConstraint("unit_price >= 0", name="ck_crop_listings_unit_price_non_negative"),
        sa.CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'CANCELLED')",
            name="ck_crop_listings_status_valid",
        ),
        sa.ForeignKeyConstraint(["farmer_id"], ["farmer_profiles.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="RESTRICT"),
    )
    op.create_index(
        "ix_crop_listings_marketplace",
        "crop_listings",
        ["status", "crop_id", "state", "available_until"],
    )
    op.create_index("ix_crop_listings_farmer_id", "crop_listings", ["farmer_id"])

    op.create_table(
        "buyer_demands",
        uuid_column(),
        sa.Column("buyer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("crop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_quantity", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=False),
        sa.Column("target_min_price", sa.Numeric(precision=14, scale=2)),
        sa.Column("target_max_price", sa.Numeric(precision=14, scale=2)),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("quality_requirements", sa.Text()),
        sa.Column("delivery_address_summary", sa.Text()),
        sa.Column("state", sa.String(length=100)),
        sa.Column("district", sa.String(length=100)),
        sa.Column("required_by", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="DRAFT"),
        *timestamps(),
        sa.CheckConstraint(
            "requested_quantity > 0", name="ck_buyer_demands_requested_quantity_positive"
        ),
        sa.CheckConstraint(
            "target_min_price >= 0", name="ck_buyer_demands_target_min_price_non_negative"
        ),
        sa.CheckConstraint(
            "target_max_price >= target_min_price", name="ck_buyer_demands_price_range_valid"
        ),
        sa.ForeignKeyConstraint(["buyer_id"], ["buyer_profiles.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="RESTRICT"),
    )
    op.create_index(
        "ix_buyer_demands_marketplace",
        "buyer_demands",
        ["status", "crop_id", "state", "required_by"],
    )
    op.create_index("ix_buyer_demands_buyer_id", "buyer_demands", ["buyer_id"])

    op.create_table(
        "orders",
        uuid_column(),
        sa.Column("public_order_number", sa.String(length=40), nullable=False),
        sa.Column("farmer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("buyer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("demand_id", postgresql.UUID(as_uuid=True)),
        sa.Column(
            "source_type", sa.String(length=30), nullable=False, server_default="DIRECT_PURCHASE"
        ),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING_PAYMENT"),
        sa.Column("total_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("delivery_address_snapshot", sa.Text()),
        sa.Column("expected_delivery_date", sa.Date()),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.CheckConstraint("total_amount >= 0", name="ck_orders_total_amount_non_negative"),
        sa.CheckConstraint(
            "status IN ('PENDING_PAYMENT', 'ADVANCE_PAID', 'CONFIRMED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'QUALITY_CONFIRMED', 'DISPUTED', 'SETTLED', 'CANCELLED')",
            name="ck_orders_status_valid",
        ),
        sa.ForeignKeyConstraint(["farmer_id"], ["farmer_profiles.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["buyer_id"], ["buyer_profiles.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["demand_id"], ["buyer_demands.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("public_order_number", name="uq_orders_public_order_number"),
    )
    op.create_index(
        "ix_orders_buyer_status_created", "orders", ["buyer_id", "status", "created_at"]
    )
    op.create_index(
        "ix_orders_farmer_status_created", "orders", ["farmer_id", "status", "created_at"]
    )

    op.create_table(
        "order_items",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True)),
        sa.Column("crop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("line_total", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("grade_snapshot", sa.String(length=80)),
        *timestamps(),
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_order_items_unit_price_non_negative"),
        sa.CheckConstraint("line_total >= 0", name="ck_order_items_line_total_non_negative"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["crop_listings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    op.create_table(
        "crop_batches",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True)),
        sa.Column("batch_code", sa.String(length=80), nullable=False),
        sa.Column("prepared_quantity", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("preparation_notes", sa.Text()),
        sa.Column("packaging_details", sa.Text()),
        sa.Column("prepared_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PREPARING"),
        *timestamps(),
        sa.CheckConstraint(
            "prepared_quantity > 0", name="ck_crop_batches_prepared_quantity_positive"
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["crop_listings.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("batch_code", name="uq_crop_batches_batch_code"),
    )
    op.create_index("ix_crop_batches_order_id", "crop_batches", ["order_id"])
    op.create_index("ix_crop_batches_listing_id", "crop_batches", ["listing_id"])

    op.create_table(
        "payments",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation", sa.String(length=30), nullable=False, server_default="ADVANCE"),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("provider", sa.String(length=80)),
        sa.Column("provider_reference", sa.String(length=255)),
        sa.Column("provider_event_id", sa.String(length=255)),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("failure_code", sa.String(length=80)),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.CheckConstraint("amount >= 0", name="ck_payments_amount_non_negative"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["payer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("provider_event_id", name="uq_payments_provider_event_id"),
        sa.UniqueConstraint(
            "operation", "idempotency_key", name="uq_payments_operation_idempotency"
        ),
    )
    op.create_index("ix_payments_order_status", "payments", ["order_id", "status"])
    op.create_index("ix_payments_provider_event_id", "payments", ["provider_event_id"])

    op.create_table(
        "deliveries",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True)),
        sa.Column("provider", sa.String(length=80)),
        sa.Column("provider_reference", sa.String(length=255)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("destination_snapshot", sa.Text()),
        sa.Column("picked_up_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["batch_id"], ["crop_batches.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("provider_reference", name="uq_deliveries_provider_reference"),
    )
    op.create_index("ix_deliveries_order_status", "deliveries", ["order_id", "status"])

    op.create_table(
        "quality_checks",
        uuid_column(),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inspector_id", postgresql.UUID(as_uuid=True)),
        sa.Column("result", sa.String(length=30), nullable=False),
        sa.Column("quality_data", sa.Text()),
        sa.Column("evidence_reference", sa.String(length=500)),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(["batch_id"], ["crop_batches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_quality_checks_batch_result", "quality_checks", ["batch_id", "result"])

    op.create_table(
        "disputes",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("opened_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requested_resolution", sa.String(length=80)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="OPEN"),
        sa.Column("deadline", sa.DateTime(timezone=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["opened_by_id"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_disputes_queue", "disputes", ["status", "deadline"])
    op.create_index("ix_disputes_order_id", "disputes", ["order_id"])

    op.create_table(
        "refunds",
        uuid_column(),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dispute_id", postgresql.UUID(as_uuid=True)),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("provider_reference", sa.String(length=255)),
        sa.Column("reason", sa.String(length=255)),
        *timestamps(),
        sa.CheckConstraint("amount > 0", name="ck_refunds_amount_positive"),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("provider_reference", name="uq_refunds_provider_reference"),
    )
    op.create_index("ix_refunds_payment_status", "refunds", ["payment_id", "status"])

    op.create_table(
        "replacements",
        uuid_column(),
        sa.Column("dispute_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("replacement_order_id", postgresql.UUID(as_uuid=True)),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="REQUESTED"),
        sa.Column("reason", sa.Text()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["replacement_order_id"], ["orders.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_replacements_dispute_status", "replacements", ["dispute_id", "status"])

    op.create_table(
        "settlements",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("gross_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column(
            "fee_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"
        ),
        sa.Column("net_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("eligible_at", sa.DateTime(timezone=True)),
        sa.Column("released_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.CheckConstraint("gross_amount >= 0", name="ck_settlements_gross_amount_non_negative"),
        sa.CheckConstraint("fee_amount >= 0", name="ck_settlements_fee_amount_non_negative"),
        sa.CheckConstraint("net_amount >= 0", name="ck_settlements_net_amount_non_negative"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("order_id", name="uq_settlements_order_id"),
    )
    op.create_index("ix_settlements_order_status", "settlements", ["order_id", "status"])

    op.create_table(
        "payouts",
        uuid_column(),
        sa.Column("settlement_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("farmer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("provider_reference", sa.String(length=255)),
        *timestamps(),
        sa.CheckConstraint("amount > 0", name="ck_payouts_amount_positive"),
        sa.ForeignKeyConstraint(["settlement_id"], ["settlements.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["farmer_id"], ["farmer_profiles.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("provider_reference", name="uq_payouts_provider_reference"),
    )
    op.create_index("ix_payouts_settlement_status", "payouts", ["settlement_id", "status"])

    op.create_table(
        "ratings",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rater_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rated_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        *timestamps(),
        sa.CheckConstraint("score BETWEEN 1 AND 5", name="ck_ratings_score_valid"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["rater_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["rated_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint(
            "order_id", "rater_id", "rated_user_id", name="uq_ratings_order_rater_rated"
        ),
    )
    op.create_index("ix_ratings_rated_user_id", "ratings", ["rated_user_id"])

    op.create_table(
        "reviews",
        uuid_column(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text()),
        sa.Column(
            "moderation_status", sa.String(length=30), nullable=False, server_default="PUBLISHED"
        ),
        *timestamps(),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating_valid"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["subject_id"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint(
            "order_id", "author_id", "subject_id", name="uq_reviews_order_author_subject"
        ),
    )
    op.create_index("ix_reviews_subject_id", "reviews", ["subject_id"])

    op.create_table(
        "trust_scores",
        uuid_column(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"),
        sa.Column("score_band", sa.String(length=30), nullable=False, server_default="NEW"),
        sa.Column("calculation_version", sa.String(length=40), nullable=False, server_default="v1"),
        sa.Column("contributing_factors", sa.Text()),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        *timestamps(),
        sa.CheckConstraint("score BETWEEN 0 AND 100", name="ck_trust_scores_score_valid"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_trust_scores_user_id"),
    )
    op.create_index("ix_trust_scores_score", "trust_scores", ["score"])

    op.create_table(
        "notifications",
        uuid_column(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(length=30), nullable=False, server_default="IN_APP"),
        sa.Column("notification_type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column(
            "delivery_status", sa.String(length=30), nullable=False, server_default="PENDING"
        ),
        sa.Column("provider_reference", sa.String(length=255)),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_notifications_user_read_created",
        "notifications",
        ["user_id", "read_at", "created_at"],
    )


def downgrade() -> None:
    for table_name in (
        "notifications",
        "trust_scores",
        "reviews",
        "ratings",
        "payouts",
        "settlements",
        "replacements",
        "refunds",
        "disputes",
        "quality_checks",
        "deliveries",
        "payments",
        "crop_batches",
        "order_items",
        "orders",
        "buyer_demands",
        "crop_listings",
        "farmer_crop_plans",
        "crops",
        "farms",
        "buyer_profiles",
        "farmer_profiles",
        "users",
    ):
        op.drop_table(table_name)
