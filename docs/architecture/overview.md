# Architecture Overview

## 1. Context

The AI Farmer-Buyer Marketplace is a role-based marketplace and transaction platform. It must support onboarding and verification, crop supply, buyer demand, discovery, recommendations, negotiation, purchase, payment, fulfillment, quality confirmation, disputes, settlement, trust, notifications, administration, and analytics.

The initial deployment should be a **modular monolith** rather than a distributed microservice system. This keeps the MVP operationally simple while maintaining explicit module boundaries that can later be extracted if scale or team ownership requires it.

## 2. Logical Architecture

```text
                           +-----------------------+
                           |       Admin Web        |
                           +-----------+-----------+
                                       |
+------------------+       +----------v----------+       +------------------+
| Farmer Web/Mobile|------->|   React Web Client  |<------|   Buyer Web/Mobile|
+------------------+       +----------+----------+       +------------------+
                                       |
                                  HTTPS / JSON
                                       |
                           +-----------v-----------+
                           | FastAPI REST API      |
                           | Auth + RBAC + Modules  |
                           +---+-------+--------+---+
                               |       |        |
                 +-------------+       |        +----------------+
                 |                     |                         |
        +--------v--------+   +--------v--------+       +--------v--------+
        | PostgreSQL      |   | Provider ports  |       | ML service      |
        | SQLAlchemy ORM  |   | OTP/KYC/Pay/etc.|       | prediction API  |
        +-----------------+   +-----------------+       +--------+--------+
                                                                  |
                                                          +-------v--------+
                                                          | Model artifacts |
                                                          | + feature data  |
                                                          +----------------+
```

## 3. Request Flow

1. A client sends an HTTPS request to a versioned API endpoint.
2. FastAPI validates the request with Pydantic schemas.
3. Authentication middleware identifies the user and role dependencies enforce authorization.
4. The relevant application service applies business rules and opens a database transaction where required.
5. SQLAlchemy repositories persist domain state in PostgreSQL.
6. External actions use provider interfaces and store only safe references and status results.
7. Domain events or an outbox record can trigger notifications, analytics updates, and asynchronous ML jobs.
8. The API returns a stable response envelope and request correlation ID.

## 4. Core Quality Attributes

| Concern | Initial design |
| --- | --- |
| Modularity | Domain modules with application services, repositories, schemas, and routers kept together |
| Security | JWT, RBAC, input validation, least privilege, audit logs, secret management |
| Reliability | Database transactions, idempotency keys for external/financial commands, outbox pattern |
| Observability | Structured logs, request IDs, health checks, metrics hooks, audit events |
| Scalability | Stateless API, indexed PostgreSQL queries, background worker boundary, object storage boundary |
| Maintainability | Type checking, linting, migrations, API docs, unit/integration tests |
| ML safety | Versioned models, feature snapshots, confidence metadata, advisory outputs, fallback behavior |
| Privacy | Data minimization, encrypted transport, restricted access, retention policy, no raw documents by default |

## 5. Consistency and Asynchronous Work

Synchronous operations include profile updates, listing creation, demand creation, search, and state transition commands that need immediate feedback.

Asynchronous work should use a worker boundary introduced when needed for:

- OTP delivery and notification retries
- KYC/payment provider callbacks
- Recommendation and demand-prediction jobs
- Price-prediction refreshes
- Analytics aggregation
- Outbox event delivery

The MVP can begin with a database-backed outbox and a simple worker process. A message broker should not be introduced until actual workload or deployment requirements justify it.

## 6. Transaction Invariants

- Only verified or explicitly reviewable users can access the marketplace according to policy.
- A listing cannot be purchased beyond its available quantity.
- An order has one authoritative state machine; clients cannot directly set arbitrary states.
- Payment amounts are calculated server-side from order data.
- Advance payment, settlement, refund, and farmer payout are separate ledger-relevant records.
- Quality confirmation and dispute deadlines are server-enforced.
- Every administrative decision and sensitive state transition is auditable.
