# Phase Roadmap

The project will be implemented incrementally. Each phase must inspect the repository first, preserve existing behavior, document file changes, run relevant checks, and explicitly record deferred work.

## Phase 1 - Architecture and Requirements

**Status:** Prepared. The detailed specification is in [Phase 1 System Architecture](../PHASE-1-SYSTEM-ARCHITECTURE.md).

- Product scope and role capabilities
- Modular monolith decision
- Repository boundaries
- Logical data model
- API, security, integration, and ML conventions
- Incremental delivery roadmap

## Phase 2 - Project Bootstrap and Local Development

**Status:** Implemented. See [Phase 2 Project Foundation](../PHASE-2-PROJECT-FOUNDATION.md).

- Create the actual monorepo workspaces.
- Add frontend Vite/React/TypeScript foundation and Tailwind/shadcn setup.
- Add FastAPI application factory, configuration, health endpoint, logging, and error handling.
- Add PostgreSQL local development configuration.
- Add Python/TypeScript linting, formatting, test runners, and `.env.example`.
- Add CI checks without production deployment.

## Phase 3 - Database Foundation and Identity

**Status:** Implemented. See [Phase 3 Database](../PHASE-3-DATABASE.md) and [Phase 3B Identity](../PHASE-3B-IDENTITY.md).

- Implement SQLAlchemy base, session management, initial models, and Alembic migrations.
- Implement user registration, role selection, mock OTP challenge/verification, JWT access tokens, refresh rotation, and RBAC.
- Add auth screens and protected route structure.
- Add unit, API, and migration tests.

## Phase 4 - Authentication and Authorization

**Status:** Implemented. See [Phase 4 Authentication](../PHASE-4-AUTHENTICATION.md).

- User registration with password hashing (bcrypt).
- Login with phone + password, JWT access tokens, rotating refresh tokens, and logout.
- Role-based authorization for `FARMER`, `BUYER`, and `ADMIN` roles.
- OTP service interface with a deterministic development/mock implementation (no real SMS provider).
- Frontend login/register pages and complete authentication test coverage.

## Phase 5 - Farmer Onboarding

**Status:** Implemented. See [Phase 5 Farmer Onboarding](../PHASE-5-FARMER-ONBOARDING.md).

- Farmer profile, farm details, location, and crop plans.
- Crop listings with a full lifecycle (draft/publish/pause/cancel).
- Verification service interfaces and deterministic mock KYC workflows.
- Admin verification queue foundation.
- Farmer onboarding wizard, dashboard, and listings UI.

## Phase 6 - Buyer Onboarding

**Status:** Implemented. See [Phase 6 Buyer Onboarding](../PHASE-6-BUYER-ONBOARDING.md).

- Buyer profile, buyer type, business details, and location.
- Mock identity/business and payment verification workflows.
- Admin buyer verification queue.
- Demand creation (DRAFT) so the buyer dashboard is functional.
- Buyer onboarding wizard, 9-section dashboard, and demand management UI.

## Phase 7 - Marketplace Supply and Demand

**Status:** Implemented. See [Phase 7 Farmer-Buyer Marketplace](../PHASE-7-MARKETPLACE.md).

- Public crop listing search with keyword `q` search.
- Multi-attribute filtering (category, state, district, grade, price range, crop ID).
- Sorting (`newest`, `price_asc`, `price_desc`, `quantity_desc`, `harvest_date`, `state`) and pagination.
- Listing detail view and public farmer profile view.
- Farmer listing management (create, edit, pause, cancel, delete, harvest dates, grade).
- Buyer demand requests with status filter, detail, update, cancel, and prefilling from listings.

## Phase 8 - AI Price Prediction

**Status:** Implemented. See [Phase 8 AI Price Prediction](../PHASE-8-PRICE-PREDICTION.md).

- Synthetic demo dataset (clearly labeled) since no real mandi price history exists yet.
- Feature preprocessing, train/validation/test split, ML training pipeline.
- Baseline + Random Forest + HistGradientBoosting + LightGBM + XGBoost comparison with MAE/RMSE/R².
- Best model (LightGBM) selected on validation performance and exported with `joblib`.
- `POST /api/v1/ai/price-prediction` endpoint with price, range, confidence, model version, and synthetic disclaimer.
- Farmer UI integration with an "AI Price" suggestion button in listing create/edit forms.

Matching/recommendations and demand baselines are covered by Phases 9 and 10.

## Phase 9 - AI Farmer-Buyer Matching

**Status:** Implemented. See [Phase 9 Farmer-Buyer Matching](../PHASE-9-MATCHING.md).

- Transparent weighted compatibility algorithm (crop, price, quantity, location, timing, trust).
- `POST /api/v1/ai/match/farmers` and `POST /api/v1/ai/match/buyers` ranked matches.
- Explainable per-factor scores with pass/fail reasons.
- Buyer and farmer recommendation pages showing why each match was suggested.

## Phase 10 - AI Demand Forecasting

**Status:** Implemented. See [Phase 10 Demand Forecasting](../PHASE-10-DEMAND-FORECASTING.md).

- Synthetic demo demand dataset (clearly labeled).
- Historical-average baseline, Random Forest, XGBoost, and LightGBM comparison.
- MAE, RMSE, and MAPE evaluation; best model (LightGBM) exported with `joblib`.
- `POST /api/v1/ai/demand-prediction` with range and uncertainty metadata.
- Farmer dashboard visualization: Historical Demand -> Predicted Demand -> Recommended Crop Quantity.

## Phase 11 - Negotiation and Direct Purchase

**Status:** Implemented. See [Phase 11 Order Management](../PHASE-11-ORDER-MANAGEMENT.md).

- Buyer "Request to buy" against a published listing; farmer accepts / rejects / counter-offers.
- Continuous negotiation (REQUEST / COUNTER / ACCEPT / REJECT) with full history.
- Explicit order state machine (PENDING → … → COMPLETED/DISPUTED/CANCELLED) that rejects invalid
  transitions and wrong-role actions.
- Agreed terms mirrored on the order and order items; status event audit trail.
- Buyer and farmer orders pages with role-aware actions and a listing-detail purchase-request modal.

## Phase 12 - Payments and Financial Workflow

**Status:** Implemented. See [Phase 12 Payments](../PHASE-12-PAYMENTS.md).

- Pluggable payment provider boundary with a mock sandbox provider (no real money, no card storage);
  Razorpay mode stubbed for production.
- Advance payment intent (20% of total on acceptance) with callback verification, idempotency
  (operation + idempotency key, unique provider event), refunds, settlements, and payouts.
- Webhook receiver with signature checking; auto order confirmation on advance capture; settlement
  + payout release on balance capture.
- Buyer/farmer payment UI in the order detail page; mock-mode and webhook tests.

## Phase 13 - Fulfillment and Quality

**Status:** Implemented. See [Phase 13 Batch &amp; Quality](../PHASE-13-BATCH-QUALITY.md).

- Crop batch preparation per order: quantity, harvest date, self-assessed grade, packaging, photo
  references; auto-created on order preparation with a stable batch code.
- Quality check records (PASS/PROBLEM, grade, received/damaged quantities, notes) per batch.
- Pickup → in-transit → delivered lifecycle that syncs with the order state machine; problem
  batches can be disputed alongside the order.
- Farmer batches page and batch/quality section in the order detail page.

## Phase 14 - Disputes, Trust, and Reviews

**Status:** Implemented.

Implemented under [Phase 14 Delivery, Receipt, and Dispute Management](../PHASE-14-DELIVERY-DISPUTES.md). The trust engine is [Phase 15](#phase-15-trust), and ratings/reviews are [Phase 16](#phase-16-ratings-and-reviews):

- Buyer receipt confirmation + quality confirmation window (deadline on delivery, receipt stamp on quality check).
- Buyer-raised disputes that pause the order (`DISPUTED`, pre-dispute status remembered); orders gain `REFUNDED`/`REPLACED` outcomes.
- Admin dispute dashboard with manual decisions (REFUND / REPLACEMENT / REJECT) — refunds are never auto-approved and require ADMIN; audit trail in `dispute_status_events` (actor, role, timestamp, reason, previous/new status).
- Dispute evidence file uploads and escalation reminders (deferred).

## Phase 15 - Trust

**Status:** Implemented. See [Phase 15 Trust Score Engine](../PHASE-15-TRUST-SCORE.md).

- Transparent, configurable 0–100 trust score for farmers and buyers from five weighted components
  (verification, transaction reliability, quality, ratings, disputes) with separate farmer/buyer factor sets.
- `NEW/LOW/MEDIUM/HIGH` bands, human-readable "why this score" + concerns, and idempotent scoring.
- Append-only, capped `trust_score_history`; `INITIAL` / `RECALCULATED` / `ADMIN_RECALCULATED` reasons and admin identity stamping.
- `GET /trust-score/me` for FARMER/BUYER and `/api/v1/admin/trust-scores` (list/detail/force recalculate) for ADMIN; account-page trust section and admin dashboard at `/admin/trust-scores`.
- No sensitive attributes as inputs; scores are informational and never the sole basis for an irreversible decision.

## Phase 16 - Ratings and Reviews

**Status:** Implemented. See [Phase 16 Ratings and Reviews](../PHASE-16-RATINGS-REVIEWS.md).

- Two-way 1–5 star reviews with optional comment on COMPLETED orders; each party exactly once (unique
  `(order_id, rater_id, rated_user_id)` constraint, 409 on duplicate, 403 for non-parties).
- Order rating state (`can_rate`, my/counterpart review), public per-user average + review history,
  and marketplace farmer-profile rating summary with history.
- Every valid review refreshes the reviewee's trust score through the trust engine and emits a
  `new_review` in-app notification.

## Phase 17 - Notifications

**Status:** Implemented. See [Phase 17 Notification System](../PHASE-17-NOTIFICATIONS.md).

- In-app notification table with unread state, plus a pluggable provider abstraction
  (EMAIL/SMS/PUSH stubs) for later real delivery.
- Central `emit()` hook with fail-soft semantics wired to all 14 lifecycle events
  (registration, verification, demand/listing matches, order request/accept, delivery, quality,
  payment received, settlement, refund, batch ready, dispute, new review).
- `GET /notifications`, `/notifications/unread-count`, `POST /notifications/{id}/read`,
  `POST /notifications/read-all`; notification bell + notification center UI.

## Phase 18 - Administration and Analytics

**Status:** Implemented. See [Phase 18 Admin Dashboard](../PHASE-18-ADMIN-DASHBOARD.md).

- Admin dashboard, verification actions, escalation reminders, and moderation.
- Notification preferences, retries, and delivery status tracking.
- Sanitized analytics events, dashboard read models, and operational metrics.
- Delivered: 12 ADMIN-only `/admin/*` endpoints, `AiPrediction` audit model (migration `20260906_0011`), Recharts golden-government-theme dashboard, verification review queue, and request modules for every marketplace entity.

## Phase 19 - Complete Frontend Integration

**Status:** Implemented.

- Every page wired to the real FastAPI backend via `src/lib/*` API wrappers (no mock/static placeholder data remain in `src/pages`, `src/components`, or `src/lib`).
- All routes gated: `ProtectedRoute`, `FarmerRoute`/`BuyerRoute` role guards, `AdminRoute`.
- Client-side phone validation (`phoneError`/`normalizePhone`) and resurfaced backend validation messages (`apiErrorMessage`).
- Discovered and fixed during Phase 20 verification: a real token-refresh bug where `config.url` is the relative `/auth/*` path, so a 401 on `/auth/me` incorrectly skipped the silent refresh and force-logged-out users (`src/lib/api-client.ts` `isAuthFlowUrl`).
- `apiErrorMessage` now uses axios's `isAxiosError` marker instead of `instanceof`, which breaks across duplicate axios copies and mock fixtures.

## Phase 20 - Complete Testing

**Status:** Implemented. See [Phase 20 Testing](../PHASE-20-TESTING.md).

- Backend: 148 tests passing across 17 test modules (auth, authorization, all modules, invalid/duplicate/unauthorized requests, invalid order transitions, payment failures, duplicate webhooks, disputes, ratings, notifications, admin dashboard).
- ML: new dedicated suite `ml/tests/` (25 tests) covering price + demand preprocessing, trained-artifact model loading, prediction contracts, and invalid-input fallbacks.
- Frontend: new Vitest + Testing Library suite (35 tests across 5 files) covering auth helpers, axios token interceptors incl. silent refresh, protected/role route guards, and login/register form flows.
- Trade-gate commands all green: backend pytest + ruff + compileall, migration SQL offline validation (Postgres dialect), frontend `tsc -b` build + eslint (0 errors) + `vitest run`.

## Phase 21 - Security Audit and Hardening

**Status:** Implemented. See [Phase 21 Security Audit](../PHASE-21-SECURITY-AUDIT.md).

- Full audit (JWT, password handling, authorization/IDOR, SQL injection, XSS, CSRF, CORS, input validation, file uploads, rate limiting, secrets, webhook verification, duplicate payments, sensitive data, logging).
- Fixed: fail-fast JWT signing secret (no public fallback outside dev/test); in-process sliding-window rate limiting on auth + AI endpoints; per-phone login lockout; OTP resend cooldown + per-account cap; payment webhook now refuses events without a configured secret outside dev/test; JWT `aud` claim + pinned algorithm; login timing equalization; log redaction filter; security headers; `TRUST_PROXY_HEADERS` opt-in for X-Forwarded-For.
- Security did not need weakening for tests; new `tests/test_security.py` (14 tests). Backend suite: 162 passed, ruff/compileall/migration-SQL green; ML 25 passed; frontend 35 passed.

## Phase 22 - ML Model Evaluation and Comparison

**Status:** Implemented. See [Phase 22 ML Model Evaluation](../PHASE-22-ML-MODEL-EVALUATION.md).

- Formally evaluated price regression (Linear Regression, Random Forest, XGBoost, LightGBM) on MAE/RMSE/R² and demand forecasting (historical baseline, Random Forest, XGBoost, LightGBM) on MAE/RMSE/MAPE, using a 70/15/15 split with the test split held out.
- Comparison tables (`ml/reports/*_model_comparison.{csv,md,txt}`), analysis plots (`ml/reports/plots/`: actual-vs-predicted, residuals, feature importance, model comparison), and `evaluation_summary.json`.
- Final selection by documented validation rule (with simplicity bias on ties, and a mandatory bar the demand baseline must be beaten) — **not** "the most advanced model".
- Selected and re-exported **LightGBM** for both price (test R² 0.9844, MAE 2.17) and demand (test MAPE 7.52%, beats historical baseline by 75% relative RMSE). Reproducible via `python -m ml.evaluation.compare`.
## Phase 23 - Complete Project Documentation

**Status:** Implemented.

- Professional documentation set in `docs/`: `architecture.md`, `database.md`, `api.md`,
  `authentication.md`, `marketplace.md`, `payment-flow.md`, `quality-management.md`,
  `dispute-management.md`, `trust-score.md`, `ml-price-prediction.md`,
  `ml-demand-prediction.md`, `ai-matching.md`, `testing.md`, `deployment.md`.
- Rewritten root `README.md` covering overview, problem statement, objectives, features,
  architecture, technology stack, database, API, ML methodology, model evaluation, security,
  installation, running instructions, environment variables, testing, deployment,
  limitations, and future enhancements.

## Phase 24 - Deployment Preparation

**Status:** Implemented.

- Backend Dockerfile (Python 3.12 slim, libgomp for LightGBM, Alembic-before-start,
  2× Uvicorn workers, non-root defaults, `/api/v1/health` probe; the `ml/` workspace and its
  trained models are baked into the image).
- Frontend Dockerfile (multi-stage Node build → Nginx static host) + `nginx.conf` SPA-routing
  and `/api/v1` reverse proxy.
- `docker-compose.yml`: PostgreSQL 16 (health-gated), backend, frontend; zero hardcoded
  secrets; dev-safe defaults documented.
- `backend/requirements.txt` + `requirements-dev.txt`; `.docker.env.example`; root and
  frontend `.dockerignore`; health checks.
- Never deploys real payment functionality: providers remain mock unless explicit credentials
  and configuration are supplied.

## Phase 25 - Production Hardening (Next)

- Load, failure, migration, backup/restore, and observability testing.
- Provider sandbox certification and webhook replay tests.
- Deployment configuration, runbooks, retention policies, and release checklist.
- Shared (Redis-backed) rate-limit/lockout store and `httpOnly`-cookie token storage for
  horizontal scaling.

## Definition Of Done For Every Phase

- Existing repository and behavior inspected before edits.
- Scope and changed files documented.
- Validation and authorization implemented for new actions.
- Tests added at the appropriate unit/API/integration level.
- Lint, type check, test, and build run where configured.
- Errors fixed or clearly reported with a concrete blocker.
- Exact local run commands documented.
- Future-phase dependencies and exclusions identified.
