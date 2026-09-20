from sqlalchemy.orm import configure_mappers

from app.db.base import Base


def test_all_database_mappers_configure() -> None:
    configure_mappers()

    expected_tables = {
        "users",
        "farmer_profiles",
        "farms",
        "buyer_profiles",
        "buyer_demands",
        "crops",
        "crop_listings",
        "crop_batches",
        "orders",
        "order_items",
        "payments",
        "deliveries",
        "quality_checks",
        "disputes",
        "refunds",
        "replacements",
        "settlements",
        "ratings",
        "reviews",
        "trust_scores",
        "notifications",
    }

    assert expected_tables.issubset(Base.metadata.tables)
