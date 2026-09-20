# Phase 2: Project Foundation

## Implemented

- Vite + React + TypeScript frontend.
- Tailwind CSS foundation and reusable UI component location.
- React Router route structure with foundation pages.
- Axios client configured from `VITE_API_BASE_URL`.
- FastAPI application factory and versioned router.
- Pydantic settings loaded from environment variables.
- SQLAlchemy engine/session foundation.
- Alembic configuration and migration environment.
- PostgreSQL connection configuration.
- Structured JSON logging configuration.
- CORS configuration from environment variables.
- `GET /api/v1/health`.
- Backend health endpoint test.
- Root `.env.example` and `.gitignore`.
- `frontend/`, `backend/`, `ml/`, `database/`, `docs/`, and `tests/` boundaries.

## Health Response

```json
{
  "status": "healthy",
  "service": "api",
  "timestamp": "2026-01-01T00:00:00Z"
}
```

The timestamp is generated at request time. The current endpoint indicates that the API process is running; it does not claim that PostgreSQL or external providers are ready. Database readiness checks will be added with database-backed features.

## Run Locally

From the project root:

```bash
cp .env.example .env
```

Start the backend in one terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check the API:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Open API documentation at `http://127.0.0.1:8000/docs`.

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The foundation page calls the FastAPI health endpoint through Axios and displays the connection status.

## Validation Commands

Backend:

```bash
cd backend
source .venv/bin/activate
ruff check app tests
pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Intentionally Deferred

- User registration, OTP, JWT issuance, and RBAC.
- Database models, initial migration, and database readiness health checks.
- Farmer, buyer, admin, marketplace, order, payment, quality, dispute, and trust workflows.
- Real OTP, KYC, payment, notification, delivery, and object-storage providers.
- ML datasets, training, model artifacts, and prediction endpoints.
- Production deployment manifests and provider secrets.
