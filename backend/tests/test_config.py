from app.core.config import Settings


def test_database_url_normalization():
    cases = [
        (
            "postgresql+postgresql://user:pass@render-db:5432/marketplace",
            "postgresql+psycopg://user:pass@render-db:5432/marketplace",
        ),
        (
            "postgres://user:pass@render-db:5432/marketplace",
            "postgresql+psycopg://user:pass@render-db:5432/marketplace",
        ),
        (
            "postgresql://user:pass@render-db:5432/marketplace",
            "postgresql+psycopg://user:pass@render-db:5432/marketplace",
        ),
        (
            "postgresql+psycopg2://user:pass@render-db:5432/marketplace",
            "postgresql+psycopg://user:pass@render-db:5432/marketplace",
        ),
        (
            "postgresql+psycopg://user:pass@render-db:5432/marketplace",
            "postgresql+psycopg://user:pass@render-db:5432/marketplace",
        ),
        (
            "sqlite:///:memory:",
            "sqlite:///:memory:",
        ),
    ]

    for input_url, expected_url in cases:
        settings = Settings(_env_file=None, database_url=input_url)
        assert settings.database_url == expected_url, f"Failed for {input_url}"
