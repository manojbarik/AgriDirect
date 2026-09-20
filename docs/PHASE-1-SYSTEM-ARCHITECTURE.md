# Phase 1: System Architecture

## 1. Purpose And Scope

This document is the technical architecture for the **AI Farmer-Buyer Marketplace** MVP. It translates the requested product capabilities into a buildable design without implementing the application yet.

The recommended first release is a **modular monolith**:

- One React frontend.
- One FastAPI backend process.
- One PostgreSQL database.
- A small ML inference boundary that can initially run in-process or as a separate internal service.
- Mock or sandbox adapters for OTP, KYC, payment, notification, and delivery providers.

This is deliberately not a microservice architecture. The system has several business domains, but early deployment does not need the operational cost of independently deployed services, a message broker, or a distributed transaction system.

## 2. Architecture Decisions

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Application style | Modular monolith | Keeps the MVP simple while preserving domain boundaries |
| API style | REST under `/api/v1` | Fits React, FastAPI, OpenAPI, and straightforward testing |
| Authentication | OTP-backed registration/login plus JWT sessions | Suitable for mobile-first users and stateless APIs |
| Authorization | Role-based and resource-level checks | Supports `FARMER`, `BUYER`, and `ADMIN` safely |
| Persistence | PostgreSQL with SQLAlchemy and Alembic | Strong transactions, constraints, and migration support |
| ML integration | Versioned inference interface | Allows baseline models now and trained models later |
| External services | Ports/interfaces with mock adapters | Avoids invented integrations and provider lock-in |
| Async work | Start with a worker boundary and database outbox | Avoids premature broker infrastructure |
| Files | Store references to private object storage only when needed | Reduces sensitive data exposure |
| Deployment | Containerized web, API, database, and optional ML worker | Simple local development and portable deployment |

## 3. High-Level System Architecture

```text
  Farmer browser/mobile web       Buyer browser/mobile web       Admin browser
            |                              |                         |
            +-------------- HTTPS / JSON --+-------------------------+
                                           |
                                  +--------v--------+
                                  | React + Vite    |
                                  | TypeScript      |
                                  | Tailwind/shadcn |
                                  +--------+--------+
                                           |
                                Axios API client / JWT
                                           |
                                  +--------v--------+
                                  | FastAPI API     |
                                  | API v1          |
                                  | Auth + RBAC     |
                                  | Domain modules  |
                                  +---+---------+---+
                                      |         |
                         SQLAlchemy   |         | provider interfaces
                                      |         |
                             +--------v--+   +--v-------------------+
                             | PostgreSQL |   | Mock/sandbox adapters |
                             | transaction|   | OTP, KYC, payment,    |
                             | data       |   | notification, delivery |
                             +------------+   +-----------------------+
                                      |
                             outbox / feature snapshots
                                      |
                                  +---v------------+
                                  | ML inference   |
                                  | boundary       |
                                  +---+------------+
                                      |
                                  +---v------------+
                                  | Joblib model   |
                                  | artifact       |
                                  +----------------+
```

### Main components

| Component | Responsibility |
| --- | --- |
| React client | Role-based screens, forms, marketplace views, order views, and admin views |
| FastAPI | Authentication, validation, authorization, business workflows, REST API, OpenAPI docs |
| PostgreSQL | Users, profiles, listings, demands, orders, payments, quality, disputes, reviews, audit records |
| ML boundary | Validated prediction requests, model selection, feature checks, fallback, prediction metadata |
| Provider adapters | Encapsulate OTP, KYC, payment, notification, and delivery vendor behavior |
| Worker/outbox | Retries and non-blocking work such as callbacks, notifications, and prediction refreshes |
| Object storage, future | Private storage for approved files or evidence references; not required for the first skeleton |

## 4. How Components Communicate

### React -> FastAPI -> PostgreSQL

```text
1. User performs an action in React, such as creating a crop listing.
2. A feature service validates the form and sends an HTTPS request using Axios.
3. FastAPI authenticates the JWT and checks the user's role and ownership.
4. Pydantic validates the request shape and basic values.
5. The application service applies business rules.
6. SQLAlchemy executes a parameterized query inside a PostgreSQL transaction.
7. FastAPI returns a stable JSON response with data, metadata, and request ID.
8. React updates the relevant feature state and displays success or a safe error.
```

The browser never connects directly to PostgreSQL. Database credentials remain server-side. React also never decides authority-sensitive values such as order totals, payment status, available inventory, or verification status.

### FastAPI -> ML prediction service -> trained model

```text
1. FastAPI receives an authorized prediction request or starts a prediction job.
2. The ML client creates a typed request from permitted marketplace data.
3. The ML inference boundary validates the feature schema and model version.
4. The model artifact is loaded by the inference process and generates a prediction.
5. The service returns the value, confidence/uncertainty, model version,
   feature snapshot reference, expiry, and fallback indicator.
6. FastAPI stores the prediction metadata and returns an advisory result to React.
```

For the first implementation, the ML boundary may be a Python module called by FastAPI. It should expose the same interface that a future internal HTTP service would expose. Do not split it into another deployable service until model workloads, independent scaling, or team ownership require that decision.

### External provider communication

FastAPI communicates with provider adapters through application interfaces. The domain code does not import vendor SDKs directly.

```text
FastAPI module -> service interface -> mock/sandbox adapter -> provider
                                      ^
                         callback/webhook adapter
```

Callbacks must verify signatures, be idempotent, and update internal records from the server-side callback rather than from a browser redirect.

## 5. Frontend Architecture

### Frontend responsibilities

- Render separate flows for farmers, buyers, and admins.
- Collect and locally validate input before sending it to the API.
- Display server validation and workflow-state errors.
- Keep authentication/session handling centralized.
- Hide or disable actions based on role and current resource state, while relying on the backend as the authority.
- Use responsive layouts because farmer and buyer usage may be mobile-first.

### Frontend layers

```text
Pages/routes
    -> feature components and forms
        -> feature hooks/services
            -> shared Axios client
                -> FastAPI REST API
```

Recommended choices:

- **React Router:** public, authenticated, role-protected, and admin route groups.
- **Axios:** one configured client with base URL, access-token attachment, refresh handling, and normalized errors.
- **Tailwind CSS/shadcn/ui:** shared accessible visual primitives and consistent status/action components.
- **Recharts:** only for admin and analytics views that are actually in the MVP.
- **TypeScript types:** generated or manually synchronized from OpenAPI contracts; do not duplicate business rules in types alone.

### Frontend state

- Local component state for simple form fields and dialogs.
- Feature-level server state for listings, demands, orders, and verification records.
- Central auth/session state for the current user and token lifecycle.
- URL query state for marketplace filters, pagination, and sorting.
- Avoid a global state library until shared state complexity demonstrates a need.

### Core frontend routes

```text
/                         public landing/login entry
/auth/register            role selection and registration
/auth/verify-otp          OTP verification
/farmer                   farmer dashboard
/farmer/onboarding        farm, location, and crop setup
/farmer/listings          farmer listings
/buyer                    buyer dashboard
/buyer/onboarding         buyer type, location, and business setup
/buyer/demands            buyer demand posts
/marketplace              listings and demand discovery
/negotiations/:id         negotiation workspace
/orders/:id               order and fulfillment timeline
/admin                    admin dashboard
/admin/verifications      verification queue
/admin/disputes           dispute queue
```

The route list is a target shape, not a request to implement it during Phase 1.

## 6. FastAPI Backend Architecture

Use a modular monolith organized by business capability. Each module should contain its router, Pydantic schemas, application service, repository/data access, and domain-specific state rules. Shared infrastructure belongs in `core` and `common`, not in random feature files.

```text
HTTP request
  -> API router
    -> dependency: auth/RBAC/request ID/database session
      -> Pydantic request schema
        -> application service
          -> domain rules
            -> repository / integration port / outbox
              -> PostgreSQL or provider adapter
```

### Backend layers

- **API layer:** route declarations, dependency injection, request/response schemas, status codes.
- **Application layer:** use cases such as `register_user`, `publish_listing`, `create_order`, `open_dispute`.
- **Domain layer:** state transitions, invariants, permissions that belong to the business.
- **Persistence layer:** SQLAlchemy models, repositories, transaction/session handling.
- **Integration layer:** OTP, KYC, payment, notification, and delivery interfaces and adapters.
- **Infrastructure layer:** configuration, security, logging, database, error mapping, outbox worker.

### Backend modules

- `auth`: registration, OTP, sessions, JWT, role assignment.
- `users`: common profile and account state.
- `verification`: KYC/business/payment verification and admin review.
- `farms`: farm, location, crop plans, production information.
- `marketplace`: listings, demands, search, inventory, recommendations.
- `negotiations`: offers, counter-offers, expiry, acceptance.
- `orders`: order creation and state machine.
- `payments`: payment intents, callbacks, refunds, settlement, payout records.
- `fulfillment`: batches, delivery references, tracking events.
- `quality`: quality checks, protection records, confirmations.
- `disputes`: evidence references, cases, decisions, replacement/refund paths.
- `trust`: reviews, trust-score calculations and explanations.
- `notifications`: templates, preferences, delivery state.
- `admin`: moderation, verification/dispute actions, dashboard queries.
- `analytics`: sanitized event capture and reporting queries.

### Error handling and logging

- Convert expected domain failures to documented error codes and HTTP statuses.
- Do not leak stack traces or provider payloads to clients.
- Use one request correlation ID in logs and response metadata.
- Log state transitions and admin actions as safe audit events.
- Add `/health/live` and `/health/ready` in the bootstrap phase.

## 7. PostgreSQL Architecture

Use one PostgreSQL database for the MVP, with one application schema unless a concrete operational requirement justifies separate schemas. SQLAlchemy maps tables and Alembic manages all schema changes.

### PostgreSQL responsibilities

- Strong transactional order and inventory updates.
- Foreign keys and check constraints for data integrity.
- Unique indexes for normalized phone numbers, public order numbers, and idempotency keys.
- Indexed marketplace searches by crop, status, location, and availability.
- Append-oriented audit and provider-event records.
- Transactional outbox records for reliable internal event delivery.

### Data conventions

- UUID primary keys and separate human-readable order numbers.
- UTC timestamps using timezone-aware database columns.
- Explicit enums or constrained strings for workflow states.
- `created_at`, `updated_at` on mutable business records.
- Soft archive/status transitions where history or compliance requires retention.
- Monetary values as fixed-precision numeric amounts plus an ISO currency code; never floating-point money.
- Quantities as fixed-precision numeric values plus a unit.

### Transaction-critical operations

These must use guarded updates and transactions:

- Reserving or releasing listing inventory.
- Accepting an offer and creating an order.
- Creating a payment intent for a fixed order amount.
- Applying a verified payment callback.
- Recording quality confirmation and opening a dispute.
- Creating a settlement or payout eligibility record.

### PostgreSQL is not used for

- Raw card/bank credentials.
- Raw OTP codes.
- Public file hosting.
- Unbounded analytics dashboards that can be served from derived read models later.

## 8. ML Architecture

### ML capabilities

| Capability | MVP approach | Later approach |
| --- | --- | --- |
| Price prediction | Transparent regional/seasonal baseline | Supervised regression with XGBoost/LightGBM evaluation |
| Demand prediction | Historical crop/region quantity baseline | Time-aware forecasting model after sufficient data |
| Farmer-buyer matching | Hard constraints plus weighted rules | Learning-to-rank model using successful outcomes |
| Recommendations | Filtered marketplace relevance rules | Hybrid content/collaborative ranking |

### ML components

- **Feature service:** selects authorized, sanitized features from marketplace records.
- **Training pipeline:** loads approved data, creates reproducible features, trains, evaluates, and packages artifacts.
- **Artifact registry boundary:** records model name, version, feature schema, metrics, and approval status.
- **Inference service/client:** validates inputs, loads approved model, returns typed predictions.
- **Prediction store:** records output, model version, feature snapshot, expiry, confidence, and fallback state.
- **Monitoring:** tracks missing features, failures, drift indicators, and business outcomes when data is available.

### Prediction rules

- Predictions are advisory and never directly set a negotiated price.
- A missing or stale model must return a documented baseline or an unavailable response, not a fabricated result.
- Every result identifies its model/version and generation time.
- Do not use identity, protected characteristics, or unnecessary personal data as features.
- Use time-based validation to avoid leaking future market information into training.
- Do not publish accuracy claims before a representative dataset and evaluation report exist.

## 9. Authentication Architecture

### Registration and OTP

```text
1. User chooses FARMER or BUYER and submits a normalized mobile number.
2. API validates the request and creates a short-lived OTP challenge.
3. OTP service interface sends the code through a mock/sandbox provider.
4. User submits the code.
5. API verifies the hash, expiry, attempt count, and challenge purpose.
6. API marks the phone verified and activates the account according to policy.
```

Store only a code hash, expiry, attempt count, consumed timestamp, provider reference, and audit metadata. Never store the raw OTP.

### Session model

- Short-lived JWT access token for API calls.
- Rotating refresh token stored server-side as a hash.
- Refresh token reuse detection and family revocation.
- Logout revokes the refresh token; sensitive account actions can require a fresh OTP.
- JWT contains only user ID, role, expiry, issuer, and token version.

### RBAC

| Capability | Farmer | Buyer | Admin |
| --- | ---: | ---: | ---: |
| Manage own profile/farm | Yes | No | Review/support |
| Manage own demands | No | Yes | Review |
| Publish crop listing | Yes | No | Moderate |
| Purchase/negotiate | Participate as seller | Participate as buyer | No |
| Verify users | No | No | Yes, subject to separation of duties |
| Resolve disputes | No | No | Yes |
| View analytics | Own data | Own data | Yes, privacy-filtered |

Role checks are necessary but insufficient. Every resource access also checks ownership, participant relationship, state, and verification policy.

## 10. Farmer Workflow

```text
Register -> OTP verify -> create farmer profile -> add farm/location/crops
         -> submit KYC architecture case -> admin/provider review
         -> verified or review-needed
         -> create listing -> publish -> receive match/negotiation/purchase
         -> accept order -> prepare batch -> protect quality -> hand over delivery
         -> respond to quality/dispute -> receive final settlement/payout
         -> rate buyer
```

### Farmer rules

- A farmer can maintain multiple farms and crop plans.
- Listing publication requires the minimum profile and verification status required by policy.
- Quantity, unit, availability window, location, and indicative price are server-validated.
- A farmer may pause or cancel an unpublished/eligible listing but cannot rewrite an order's historical item snapshot.
- Payout eligibility depends on payment, quality, delivery, and dispute state, not merely listing completion.

## 11. Buyer Workflow

```text
Register -> OTP verify -> choose buyer type -> add location/business data
         -> submit verification/payment profile case
         -> verified or review-needed
         -> browse listings or create demand
         -> receive recommendations/matches -> negotiate or purchase
         -> pay advance -> track batch/delivery -> confirm quality
         -> accept settlement or open dispute -> rate farmer
```

### Buyer rules

- Buyer type and business information determine which verification requirements apply.
- A buyer can see marketplace data allowed by listing privacy policy, not private farmer identity documents.
- Demand posts must have crop, quantity, quality requirements, delivery area, and required-by date.
- Buyer quality confirmation has a policy-defined deadline; silence must not create an undocumented financial outcome.

## 12. Order Workflow

### Order sources

- **Direct purchase:** buyer selects available listing quantity.
- **Negotiated purchase:** an accepted offer creates an order from an immutable agreed-price and quantity snapshot.

### Order state machine

```text
PENDING_PAYMENT
      | advance payment confirmed
      v
ADVANCE_PAID -> CONFIRMED -> PREPARING -> IN_TRANSIT -> DELIVERED
                                                          |
                                           quality accepted + deadline
                                                          v
                                                QUALITY_CONFIRMED
                                                          |
                                                     SETTLED

Allowed exception paths:
PENDING_PAYMENT -> CANCELLED
Any eligible pre-fulfillment state -> CANCELLED
DELIVERED/QUALITY_CONFIRMED -> DISPUTED -> SETTLED or resolution outcome
```

The exact transition matrix will be encoded in the orders module. Clients send commands such as `confirm`, `mark-prepared`, `confirm-delivery`, or `open-dispute`; clients never submit an arbitrary target state.

### Order invariants

- Order item price and quantity are snapshots.
- Inventory cannot become negative.
- Order totals are recalculated server-side.
- Only the buyer, farmer, or admin permitted for that transition can execute it.
- Every transition records actor, previous state, next state, reason, and timestamp.

## 13. Payment Workflow

The first release must use a mock or sandbox payment adapter. No real payment integration should be invented in architecture or code.

```text
Order created
    -> server creates advance PaymentIntent with Idempotency-Key
    -> mock/sandbox checkout or provider token flow
    -> provider callback is signature-verified
    -> payment transaction is recorded idempotently
    -> order advances to ADVANCE_PAID/CONFIRMED
    -> delivery and quality workflow completes
    -> balance/settlement eligibility calculated
    -> refund, replacement, or farmer payout is recorded as applicable
```

### Payment boundaries

- Payment provider status is mapped to an internal payment state.
- Browser redirects are informational only.
- Payment amount and currency are checked against the order snapshot.
- Create, capture, refund, and payout commands require idempotency.
- Provider callback payloads are retained only according to a redaction and retention policy.
- Do not call the process “escrow” unless the selected provider and legal operating model support it.

## 14. Quality Workflow

```text
Order confirmed -> farmer prepares order batch -> batch code assigned
                -> quality/protection details recorded
                -> delivery handoff and tracking reference
                -> delivery marked complete
                -> buyer confirms quality within policy window
                -> accepted: settlement path
                -> failed/concern: dispute path
```

### Quality design

- A batch links physical preparation and delivery evidence to an order.
- Quality records include actor, time, quality dimensions, result, and safe evidence references.
- Evidence files, if required later, use private object storage and access controls.
- Quality confirmation should support full acceptance, partial acceptance, and issue reported if the business policy needs those outcomes.
- Quality protection is a recorded process and checklist in the MVP, not an unsupported guarantee.

## 15. Dispute Workflow

```text
Buyer/farmer opens dispute -> validate order and deadline
                           -> capture category and evidence references
                           -> order/payment hold where policy requires
                           -> admin review queue
                           -> decision: reject, partial refund, full refund,
                              replacement, or adjusted settlement
                           -> execute approved financial action through payment port
                           -> notify participants -> close and audit
```

### Dispute safeguards

- A dispute must reference an eligible order and authorized participant.
- The system records a structured category and resolution request.
- Admin decisions require an explicit reason code and cannot silently mutate financial records.
- Financial consequences create separate refund, replacement, or settlement records.
- Dispute deadlines and evidence visibility are server-controlled.
- Appeals can be postponed until a real operational policy exists; the decision should be recorded as a future capability, not implied.

## 16. Trust-Score Workflow

Trust score should be transparent, versioned, and initially simple. It must not be a mysterious single number that cannot be explained.

```text
Eligible event occurs
  -> review, delivery, quality, dispute, verification, or payment outcome recorded
  -> trust-score service selects approved event weights
  -> score recalculated with calculation version
  -> score band and explanation stored
  -> authorized marketplace surfaces read the result
```

### MVP trust inputs

- Verified phone/account status.
- Completed and accepted orders.
- On-time fulfillment rate.
- Quality confirmation outcomes.
- Valid ratings/reviews with anti-abuse controls.
- Dispute outcomes, with careful weighting and no punishment for a dispute merely being opened.

Avoid using sensitive identity attributes, wealth, location precision, or model predictions as direct trust inputs. Provide a score band and contributing factors. Recalculate synchronously for small workloads or through an outbox worker when events grow.

## 17. Admin Workflow

```text
Admin signs in with elevated account controls
      -> verification queue: inspect safe metadata and submit decision
      -> marketplace moderation: review reported listings/users
      -> dispute queue: review case, evidence references, and order history
      -> approve structured resolution
      -> inspect audit trail and operational analytics
```

### Admin safeguards

- Admin routes require the `ADMIN` role plus explicit permission checks.
- Verification and dispute actions are recorded in an append-only audit log.
- Use separation of duties for self-approval and self-resolution.
- Admin dashboards use read-optimized queries but never bypass domain services for mutations.
- Sensitive information is masked and access is logged.
- Analytics is aggregated and privacy-filtered by default.

## 18. API Architecture

### API layers

```text
/api/v1
  /auth
  /me
  /farmer
  /buyer
  /marketplace
  /recommendations
  /negotiations
  /orders
  /payments
  /verification
  /admin
  /notifications
```

Representative endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/otp/challenges
POST /api/v1/auth/otp/verify
POST /api/v1/auth/token/refresh
GET  /api/v1/me

POST /api/v1/farmer/farms
POST /api/v1/farmer/listings
PATCH /api/v1/farmer/listings/{listing_id}

POST /api/v1/buyer/demands
GET  /api/v1/marketplace/listings
GET  /api/v1/marketplace/demands
GET  /api/v1/recommendations

POST /api/v1/negotiations
POST /api/v1/negotiations/{id}/offers
POST /api/v1/negotiations/{id}/accept

POST /api/v1/orders
GET  /api/v1/orders/{id}
POST /api/v1/orders/{id}/payments/advance
POST /api/v1/orders/{id}/confirm-delivery
POST /api/v1/orders/{id}/quality-confirmation
POST /api/v1/orders/{id}/disputes

GET  /api/v1/admin/verifications
POST /api/v1/admin/verifications/{id}/decision
GET  /api/v1/admin/disputes
POST /api/v1/admin/disputes/{id}/decision
```

### API conventions

- JSON over HTTPS.
- OpenAPI generated by FastAPI.
- Pydantic request and response schemas.
- Consistent `data` and `meta` success envelope.
- Consistent `error.code`, safe message, field details, and request ID error envelope.
- Pagination and allowlisted filters for collections.
- `Idempotency-Key` for financial and retry-sensitive commands.
- `409 Conflict` for invalid workflow transitions and inventory conflicts.
- Backend derives all authority-sensitive values.

## 19. Database Entity Relationship Design

The following is the logical relationship design. It is not a migration and should be refined during the database phase.

```text
User 1---1 FarmerProfile 1---N Farm 1---1 Location
  |                         |
  |                         +---N FarmerCropPlan N---1 Crop
  |                         |
  |                         +---N CropListing N---1 Crop
  |
  +---1 BuyerProfile 1---0..1 BuyerBusiness
  |                |
  |                +---1 Location
  |                +---N DemandPost N---1 Crop
  |
  +---N VerificationCase 1---N VerificationEvent
  +---N OtpChallenge
  +---N RefreshToken
  +---N Notification
  +---N AuditLog

CropListing 1---N Negotiation N---1 User (farmer/buyer participants)
Negotiation 1---N Offer

CropListing 1---N OrderItem N---1 Order
DemandPost  1---N Order (optional source relationship)
Order 1---N OrderItem
Order 1---N PaymentIntent 1---N PaymentTransaction
Order 1---N OrderBatch 1---N QualityCheck
Order 1---N Delivery
Order 1---N Dispute 1---N DisputeDecision
Order 1---N Review
Order 1---0..1 Settlement 1---N Payout

User 1---N Recommendation
User 1---1 TrustScore 1---N TrustScoreEvent
```

### Core entities

| Entity | Purpose |
| --- | --- |
| `users` | Identity, role, account status, phone verification |
| `farmer_profiles`, `farms`, `locations`, `farmer_crop_plans` | Farmer and production data |
| `buyer_profiles`, `buyer_businesses` | Buyer type and business data |
| `crops` | Canonical crop/variety data |
| `crop_listings` | Farmer supply published to marketplace |
| `demand_posts` | Buyer requirements published to marketplace |
| `negotiations`, `offers` | Negotiated price and quantity lifecycle |
| `orders`, `order_items` | Immutable commercial transaction snapshots |
| `payment_intents`, `payment_transactions` | Payment provider and internal state tracking |
| `order_batches`, `quality_checks`, `deliveries` | Fulfillment and quality traceability |
| `disputes`, `dispute_decisions` | Issue resolution and financial outcomes |
| `reviews`, `trust_scores`, `trust_score_events` | Post-transaction trust signals |
| `verification_cases`, `verification_events` | KYC/business/payment verification architecture |
| `notifications`, `audit_logs`, `analytics_events` | Communication, accountability, and reporting |

### Important constraints

- Unique normalized user phone number.
- One active farmer profile per farmer user and one active buyer profile per buyer user.
- Non-negative listing, demand, order, and payment amounts.
- No order item may exceed available/reserved listing inventory.
- One valid review per eligible author/order/subject combination.
- Provider event IDs are unique for idempotent callback processing.
- Idempotency keys are unique within an operation and authenticated actor scope.
- State changes happen through application services, not unrestricted CRUD updates.

## 20. Security Architecture

### Network and transport

- Serve the frontend and API over HTTPS outside local development.
- Keep PostgreSQL on a private network; expose it only to the backend and controlled migration job.
- Allowlist CORS origins; do not use a wildcard in production.
- Apply request size, timeout, and rate limits at the reverse proxy/API boundary.

### Application security

- Hash passwords if a password fallback is later added; OTP itself is not a password.
- Hash OTP and refresh token values at rest.
- Validate all input at API, application, and database layers.
- Use parameterized SQL through SQLAlchemy.
- Use resource-level authorization on every read and write.
- Protect state-changing browser calls against CSRF if cookies are used; if tokens are sent in headers, still apply origin and abuse controls.
- Use secure, HttpOnly, SameSite cookie storage for refresh tokens if browser cookies are selected.
- Redact PII and credentials from logs.

### Sensitive integrations

- OTP, KYC, payment, notification, and delivery services are interfaces with mock/sandbox implementations.
- Secrets come from environment variables or a deployment secret manager.
- Never commit API keys, JWT secrets, provider credentials, or real user documents.
- Store provider references and verification results rather than raw sensitive payloads.
- Verify webhook signatures and process each provider event once.

### Audit and privacy

- Audit admin decisions, verification decisions, payment callbacks, dispute resolutions, and order transitions.
- Record actor, resource, action, outcome, request ID, and safe reason metadata.
- Define retention and account-closure rules before production launch.
- Keep exact farm coordinates private unless a workflow specifically requires disclosure.

## 21. Deployment Architecture

### MVP deployment

```text
User
  |
  v
HTTPS reverse proxy / managed ingress
  |------------------------------|
  v                              v
Static React assets         FastAPI container(s)
                                    |
                          private network / TLS
                                    |
                              PostgreSQL

Optional at first:
FastAPI or worker process -> ML inference module -> model artifact volume
FastAPI or worker process -> mock/sandbox providers
```

### Environments

- **Local:** Vite dev server, FastAPI reload server, local PostgreSQL container, mock providers.
- **Test/CI:** ephemeral PostgreSQL or isolated database, deterministic mock providers, unit/API/integration tests.
- **Staging:** production-like containers, sandbox provider credentials, migration rehearsal, webhook testing.
- **Production:** managed PostgreSQL, private network, secret manager, TLS, backups, monitoring, and approved real providers only after compliance review.

### Deployment principles

- Build frontend static assets once per environment configuration strategy.
- Run FastAPI with a production ASGI server and multiple workers only when database/session behavior is safe.
- Run migrations as a controlled release step, never implicitly on every API startup in production.
- Use managed PostgreSQL backups and test restoration.
- Keep API containers stateless; sessions are represented by JWT/refresh records and database state.
- Add a separate worker process only for actual asynchronous jobs.
- Do not deploy Kubernetes, service mesh, Kafka, or a distributed cache for the initial MVP.

### Required operational checks

- Liveness and readiness health checks.
- Structured centralized logs.
- Error monitoring with PII redaction.
- Database connection and migration alarms.
- Payment/verification callback failure visibility.
- Backup and restore runbook.
- Rate-limit and secret-rotation runbook.

## 22. MVP Versus Postponed Scope

### Implement in the MVP

- Farmer and buyer registration.
- Mock OTP verification behind an `OtpProvider` interface.
- Role-based JWT authentication and protected routes.
- Farmer profile, one or more farms, location, and basic crop information.
- Buyer profile, buyer type, location, and basic business information.
- Verification architecture with mock/manual admin status changes; no real KYC vendor.
- Farmer crop listing CRUD and publishing lifecycle.
- Buyer demand creation and lifecycle.
- Marketplace search with crop, location, status, and availability filters.
- Basic rule-based farmer-buyer matching.
- Transparent baseline price and demand estimates when data is available; otherwise show unavailable/baseline status.
- Simple negotiation with offer, counter-offer, accept, reject, and expiry.
- Direct purchase and order creation with inventory protection.
- Mock/sandbox advance-payment workflow with idempotent callbacks.
- Batch preparation record, basic quality checklist, delivery status, and buyer quality confirmation.
- Basic dispute creation and admin resolution choices.
- Simple ratings/reviews after eligible order completion.
- Explainable, versioned trust-score baseline.
- In-app notifications or a stored notification inbox.
- Basic admin verification/dispute dashboard.
- Essential audit logs and operational analytics.
- API documentation and automated tests for implemented behavior.

### Postpone until after MVP

- Real OTP, KYC, payment, bank payout, and delivery vendors.
- Native Android/iOS applications; responsive web is sufficient initially.
- Advanced demand forecasting and production-grade price prediction until quality data exists.
- Learning-to-rank matching and collaborative recommendations.
- Live chat, voice calling, and real-time negotiation sockets.
- Escrow claims, automated tax/compliance handling, and multi-country currency rules.
- Complex logistics optimization and live GPS tracking.
- IoT quality sensors, computer vision grading, and automated certificates.
- Multi-warehouse inventory, auctions, subscriptions, and recurring demands.
- Full appeals process, insurance integration, and automated fraud scoring.
- Data lake, streaming analytics platform, Kafka, Kubernetes, and microservice extraction.
- Offline-first synchronization and multilingual voice workflows unless validated as a primary MVP need.

## 23. Recommended Build Sequence

1. Bootstrap repository, local environment, configuration, checks, and health endpoints.
2. Add database foundation and authentication with mock OTP.
3. Add farmer/buyer onboarding and verification architecture.
4. Add listings, demands, marketplace search, and ownership checks.
5. Add rule-based matching, baseline predictions, and recommendation UI.
6. Add negotiation, direct purchase, order state machine, and inventory transactions.
7. Add mock/sandbox payment flow and financial audit records.
8. Add batches, quality confirmation, delivery status, and disputes.
9. Add reviews, trust score, notifications, admin dashboard, and essential analytics.
10. Harden, test, document, and prepare provider/deployment integration.

## 24. Phase 1 Output And Future Boundary

Phase 1 produces architecture documentation only. It does not create React screens, FastAPI routes, migrations, trained models, provider integrations, or deployment manifests.

Phase 2 can implement the repository bootstrap and local development foundation. Before starting Phase 2, inspect this folder, preserve these documents, and agree on the exact initial package/tool versions if required by the development environment.
