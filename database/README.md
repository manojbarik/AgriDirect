# Database Workspace

PostgreSQL is the system of record for the application. SQLAlchemy models are in `backend/app/db/models`, while schema changes are managed with Alembic in `backend/migrations`.

## Local PostgreSQL

The expected development database is:

```text
database: farmer_buyer_marketplace
user: marketplace
password: marketplace
host: localhost
port: 5432
```

Start PostgreSQL using your local installation or container runtime, then run the migration from the backend directory:

```bash
alembic upgrade head
```

Seed safe development-only records from the project root:

```bash
PYTHONPATH=backend backend/.venv/bin/python -m database.seed_dev
```

The seed uses reserved `.test` email addresses and mock provider references. It does not create OTPs, KYC documents, payment credentials, or real identity information.

Development-only credentials created by the seed (documented here so testers can log in; never used outside sandbox):

| Role | Phone | Password |
| --- | --- | --- |
| `ADMIN` | `+919000000000` | `Sandbox@123` |
| `FARMER` | `+919000000001` | `Sandbox@123` |
| `BUYER` | `+919000000002` | `Sandbox@123` |