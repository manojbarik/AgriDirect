# Repository Structure

The planned repository is a monorepo with independently testable frontend, backend, and ML workspaces.

```text
AI-Farmer-Buyer-Marketplace/
├── README.md
├── .env.example
├── .gitignore
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── decisions/
│   └── operations/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   └── providers/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── shared/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── farmer/
│   │   │   ├── buyer/
│   │   │   ├── marketplace/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── disputes/
│   │   │   ├── notifications/
│   │   │   └── admin/
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   ├── auth.ts
│   │   │   └── validation.ts
│   │   ├── types/
│   │   └── styles/
│   └── tests/
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py
│   │   │   ├── logging.py
│   │   │   └── errors.py
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   ├── dependencies.py
│   │   │   └── v1/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── verification/
│   │   │   ├── farms/
│   │   │   ├── crops/
│   │   │   ├── marketplace/
│   │   │   ├── recommendations/
│   │   │   ├── negotiations/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── fulfillment/
│   │   │   ├── quality/
│   │   │   ├── disputes/
│   │   │   ├── reviews/
│   │   │   ├── notifications/
│   │   │   ├── admin/
│   │   │   └── analytics/
│   │   ├── integrations/
│   │   │   ├── otp/
│   │   │   ├── kyc/
│   │   │   ├── payments/
│   │   │   ├── notifications/
│   │   │   └── delivery/
│   │   ├── ml/
│   │   │   ├── clients.py
│   │   │   ├── feature_service.py
│   │   │   └── policies.py
│   │   └── common/
│   ├── migrations/
│   │   └── versions/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── contract/
├── ml/
│   ├── pyproject.toml
│   ├── data/
│   │   ├── raw/.gitkeep
│   │   ├── processed/.gitkeep
│   │   └── README.md
│   ├── notebooks/
│   ├── src/
│   │   ├── config.py
│   │   ├── datasets/
│   │   ├── features/
│   │   ├── models/
│   │   ├── training/
│   │   ├── evaluation/
│   │   └── inference/
│   ├── artifacts/.gitkeep
│   └── tests/
├── scripts/
│   ├── dev/
│   ├── db/
│   └── seed/
└── infra/
    ├── docker/
    └── deployment/
```

## Placement Rules

- `frontend/src/features` contains user-facing feature code and feature-specific API calls.
- `backend/app/modules` contains business capabilities. A module owns its routes, schemas, services, and persistence mapping.
- `backend/app/integrations` contains provider adapters and mock implementations. Domain modules depend on interfaces, not provider SDKs.
- `backend/app/ml` is an application-facing client/policy boundary, not the training code.
- `ml` contains dataset preparation, training, evaluation, and inference packaging.
- `docs` captures API contracts, architecture decisions, and operational runbooks.
- `infra` contains local and deployment infrastructure only; secrets remain outside the repository.

## Dependency Direction

```text
Frontend -> REST API -> Application services -> Domain rules
                                      |              |
                                      v              v
                               Repositories     Integration ports
                                      |              |
                                      v              v
                               PostgreSQL       Provider adapters

ML training -> versioned data/features -> model artifact
API ML client -> approved model/inference boundary
```

Business modules must not import frontend code, database migration internals, or concrete external-provider SDKs directly.
