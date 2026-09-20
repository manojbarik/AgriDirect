"""Phase 12 & 13 - Payment and Batch/Quality Architecture.

Payments: adds sandbox checkout metadata, refunded-amount tracking and the
Phase 12 payment status/operation sets.
Batches: enriches crop_batches with crop/farmer references, harvest date,
quality grade, photo references and explicit preparation/pickup/delivery
status tracks.
Quality: adds Phase 13 quality-check fields (grade, received/damaged
quantities, notes) and constrains results to PASS/PROBLEM.

Revises: 20260906_0006
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260906_0007"
down_revision: str | None = "20260906_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PAYMENT_STATUSES = (
    "PENDING",
    "AUTHORIZED",
    "PAID",
    "FAILED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "SETTLED",
)
_PAYMENT_STATUS_LIST = ", ".join(map(repr, PAYMENT_STATUSES))

BATCH_STATUSES = (
    "PREPARING",
    "PREPARED",
    "INSPECTING",
    "PASSED",
    "PROBLEM",
    "DELIVERED",
    "DISPUTED",
)
_BATCH_STATUS_LIST = ", ".join(map(repr, BATCH_STATUSES))

QUALITY_RESULTS = ("PASS", "PROBLEM")


def _sanitize_payment_statuses() -> None:
    op.execute(
        sa.text(
            f"UPDATE payments SET status = 'PENDING' "
            f"WHERE status NOT IN ({_PAYMENT_STATUS_LIST})"
        )
    )


def _sanitize_operation() -> None:
    op.execute(sa.text("UPDATE payments SET operation = 'ADVANCE' WHERE operation NOT IN ('ADVANCE', 'BALANCE')"))


def _sanitize_batch_statuses() -> None:
    op.execute(
        sa.text(
            f"UPDATE crop_batches SET status = 'PREPARING' "
            f"WHERE status NOT IN ({_BATCH_STATUS_LIST})"
        )
    )


def _sanitize_quality_results() -> None:
    results = ", ".join(map(repr, QUALITY_RESULTS))
    op.execute(
        sa.text(
            f"UPDATE quality_checks SET result = 'PASS' "
            f"WHERE result NOT IN ({results})"
        )
    )


def upgrade() -> None:
    _sanitize_payment_statuses()
    _sanitize_operation()
    with op.batch_alter_table("payments") as batch_op:
        batch_op.add_column(sa.Column("checkout_url", sa.String(length=500)))
        batch_op.add_column(
            sa.Column(
                "refunded_amount",
                sa.Numeric(precision=14, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch_op.create_check_constraint(
            "ck_payments_status_valid", f"status IN ({_PAYMENT_STATUS_LIST})"
        )
        batch_op.create_check_constraint(
            "ck_payments_operation_valid",
            "operation IN ('ADVANCE', 'BALANCE')",
        )

    _sanitize_batch_statuses()
    with op.batch_alter_table("crop_batches") as batch_op:
        batch_op.add_column(sa.Column("crop_id", sa.Uuid()))
        batch_op.add_column(sa.Column("farmer_id", sa.Uuid()))
        batch_op.add_column(sa.Column("harvest_date", sa.Date()))
        batch_op.add_column(sa.Column("quality_grade", sa.String(length=30)))
        batch_op.add_column(sa.Column("photo_references", sa.Text()))
        batch_op.add_column(
            sa.Column(
                "preparation_status",
                sa.String(length=30),
                nullable=False,
                server_default="PREPARING",
            )
        )
        batch_op.add_column(
            sa.Column(
                "pickup_status",
                sa.String(length=30),
                nullable=False,
                server_default="NOT_STARTED",
            )
        )
        batch_op.add_column(
            sa.Column(
                "delivery_status",
                sa.String(length=30),
                nullable=False,
                server_default="NOT_STARTED",
            )
        )
        batch_op.create_foreign_key(
            "fk_crop_batches_crop_id_crops",
            "crops",
            ["crop_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            "fk_crop_batches_farmer_id_farmer_profiles",
            "farmer_profiles",
            ["farmer_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        batch_op.create_check_constraint(
            "ck_crop_batches_status_valid", f"status IN ({_BATCH_STATUS_LIST})"
        )
        batch_op.create_check_constraint(
            "ck_crop_batches_preparation_status_valid",
            "preparation_status IN ('NOT_STARTED','PREPARING','PREPARED')",
        )
        batch_op.create_check_constraint(
            "ck_crop_batches_pickup_status_valid",
            "pickup_status IN ('NOT_STARTED','PICKED_UP')",
        )
        batch_op.create_check_constraint(
            "ck_crop_batches_delivery_status_valid",
            "delivery_status IN ('NOT_STARTED','IN_TRANSIT','DELIVERED')",
        )
        batch_op.create_index(
            "ix_crop_batches_farmer_status", ["farmer_id", "status"]
        )

    _sanitize_quality_results()
    with op.batch_alter_table("quality_checks") as batch_op:
        batch_op.add_column(sa.Column("quality_grade", sa.String(length=30)))
        batch_op.add_column(
            sa.Column("quantity_received", sa.Numeric(precision=14, scale=3))
        )
        batch_op.add_column(
            sa.Column("damaged_quantity", sa.Numeric(precision=14, scale=3))
        )
        batch_op.add_column(sa.Column("notes", sa.Text()))
        batch_op.create_check_constraint(
            "ck_quality_checks_result_valid",
            "result IN ('PASS','PROBLEM')",
        )
        batch_op.create_check_constraint(
            "ck_quality_checks_quantity_received_non_negative",
            "quantity_received IS NULL OR quantity_received >= 0",
        )
        batch_op.create_check_constraint(
            "ck_quality_checks_damaged_quantity_non_negative",
            "damaged_quantity IS NULL OR damaged_quantity >= 0",
        )


def downgrade() -> None:
    op.drop_constraint(
        "ck_quality_checks_damaged_quantity_non_negative", "quality_checks", type_="check"
    )
    op.drop_constraint(
        "ck_quality_checks_quantity_received_non_negative", "quality_checks", type_="check"
    )
    op.drop_constraint("ck_quality_checks_result_valid", "quality_checks", type_="check")
    op.drop_column("quality_checks", "notes")
    op.drop_column("quality_checks", "damaged_quantity")
    op.drop_column("quality_checks", "quantity_received")
    op.drop_column("quality_checks", "quality_grade")

    op.drop_index("ix_crop_batches_farmer_status", table_name="crop_batches")
    op.drop_constraint(
        "ck_crop_batches_delivery_status_valid", "crop_batches", type_="check"
    )
    op.drop_constraint("ck_crop_batches_pickup_status_valid", "crop_batches", type_="check")
    op.drop_constraint(
        "ck_crop_batches_preparation_status_valid", "crop_batches", type_="check"
    )
    op.drop_constraint("ck_crop_batches_status_valid", "crop_batches", type_="check")
    op.drop_constraint(
        "fk_crop_batches_farmer_id_farmer_profiles", "crop_batches", type_="foreignkey"
    )
    op.drop_constraint("fk_crop_batches_crop_id_crops", "crop_batches", type_="foreignkey")
    op.drop_column("crop_batches", "delivery_status")
    op.drop_column("crop_batches", "pickup_status")
    op.drop_column("crop_batches", "preparation_status")
    op.drop_column("crop_batches", "photo_references")
    op.drop_column("crop_batches", "quality_grade")
    op.drop_column("crop_batches", "harvest_date")
    op.drop_column("crop_batches", "farmer_id")
    op.drop_column("crop_batches", "crop_id")

    op.drop_constraint("ck_payments_operation_valid", "payments", type_="check")
    op.drop_constraint("ck_payments_status_valid", "payments", type_="check")
    op.drop_column("payments", "refunded_amount")
    op.drop_column("payments", "checkout_url")