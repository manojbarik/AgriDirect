# Phase 3B — Identity: Registration, Mock OTP, JWT, and RBAC

This phase implements the identity and authentication layer on top of the Phase 3 database. It follows the decisions in `docs/PHASE-1-SYSTEM-ARCHITECTURE.md` and the roadmap in `docs/architecture/phase-roadmap.md`.

## Scope Implemented

- **Registration** (`POST /api/v1/auth/register`) — creates a `FARMER` or `BUYER` user with `status=PENDING` and issues a mock OTP challenge.
- **Login** (`POST /api/v1/auth/login`) — requests a fresh OTP challenge for an existing user.
- **Resend** (`POST /api/v1/auth/otp/resend`) — invalidates prior active challenges and issues a new one.
- **Verification** (`POST /api/v1/auth/otp/verify`) — checks the code, activates the user (`phone_verified_at`, `status=ACTIVE`), and mints tokens.
- **Token refresh with rotation** (`POST /api/v1/auth/refresh`) — short-lived JWT access tokens plus opaque refresh tokens stored hashed in the database; each refresh revokes the previous token.
- **Logout** (`POST /api/v1/auth/logout`) — revokes a refresh token.
- **Current user** (`GET /api/v1/auth/me`) — returns the authenticated user.
- **RBAC dependency** — `require_roles("FARMER", ...)` and `get_current_user` (see `app/modules/identity/dependencies.py`).

## New Backend Files

| File | Purpose |
| --- | --- |
| `backend/app/db/models/identity.py` | `OtpChallenge` and `RefreshToken` models |
| `backend/migrations/versions/20260906_0002_identity.py` | Migration creating `otp_challenges` and `refresh_tokens` |
| `backend/app/modules/identity/__init__.py` | Identity module package |
| `backend/app/modules/identity/router.py` | Auth endpoints |
| `backend/app/modules/identity/service.py` | Registration, OTP, verification, token logic |
| `backend/app/modules/identity/schemas.py` | Request/response Pydantic models |
| `backend/app/modules/identity/security.py` | JWT creation/decoding, token/code hashing |
| `backend/app/modules/identity/dependencies.py` | `get_current_user`, `require_roles` |
| `backend/app/integrations/otp.py` | OTP provider interface + deterministic mock provider |
| `backend/tests/test_identity.py` | API and unit tests for the identity flow |

## Database Additions

### `otp_challenges`

Stores challenge hashes only (never raw codes). One active challenge per user (a new challenge consumes prior active ones).

| Column | Notes |
| --- | --- |
| `user_id` | FK → `users.id`, `CASCADE` |
| `channel` | `SMS` (mock) |
| `purpose` | `LOGIN` |
| `code_hash` | SHA-256 of the delivered code |
| `expires_at` | 5-minute lifetime |
| `consumed_at` | Set when verified, expired, or superseded |
| `attempts` | Incremented on failures; challenge locks after 5 |
| `provider_reference` | Mock reference returned by the OTP provider |

### `refresh_tokens`

| Column | Notes |
| --- | --- |
| `user_id` | FK → `users.id`, `CASCADE` |
| `token_hash` | SHA-256 of the opaque refresh token (unique) |
| `expires_at` | `JWT_REFRESH_TOKEN_DAYS` (default 30) |
| `revoked_at` | Sets on rotation/logout |
| `replaced_by` | Previous token points to its replacement token |
| `user_agent` / `ip_address` | Captured at refresh time |

## Security Model

- **Access tokens** are stateless JWT (HS256) with `sub`, `role`, `type="access"`, `iat`, `exp`. Lifetime is `JWT_ACCESS_TOKEN_MINUTES` (default 15).
- **Refresh tokens** are opaque (`secrets.token_urlsafe(48)`), stored only as hashes, and rotated on every refresh. Reusing a rotated token returns 401.
- **OTP codes** are stored hashed; verification uses a constant-time comparison. The challenge locks after five failed attempts and every new challenge invalidates the previous one.
- **Role checks** reject with 403 if the token role is not in the required set; non-active users (SUSPENDED/CLOSED/PENDING) are rejected with 401.
- `JWT_SECRET_KEY` must be set in production. The code refuses to treat the placeholder as secure and falls back to a dev-only secret with a warning outside `development`.

## Mock OTP Convention

In `development`/`test` with `OTP_PROVIDER_MODE=mock`, the OTP code is the **last 6 digits of the phone number** (for example `+919876543210` → `543210`). The API includes `mock_code` in challenge responses so testers do not need to read logs. Real providers must never reveal the code.

## API Summary

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | no | Register user + issue OTP challenge |
| POST | `/api/v1/auth/login` | no | Request OTP for existing user |
| POST | `/api/v1/auth/otp/resend` | no | New OTP challenge (`user_id` in body) |
| POST | `/api/v1/auth/otp/verify` | no | Verify code, activate user, mint tokens |
| POST | `/api/v1/auth/refresh` | no(refresh) | Rotate refresh token, issue new pair |
| POST | `/api/v1/auth/logout` | no(refresh) | Revoke refresh token |
| GET | `/api/v1/auth/me` | `Bearer` | Current user profile |

## Run Instructions

Backend (follow Phase 2 steps first to create the database if needed):

```bash
cd "/Users/manojbarik/Desktop/SIH PROJECT 2026/backend"
source .venv/bin/activate
alembic upgrade head        # expects PostgreSQL from .env (or ../.env)
uvicorn app.main:app --reload
```

Register a test user:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone_e164":"+919876543210","role":"FARMER"}'
```

Use the returned `challenge_id` and `mock_code` (last 6 digits) to verify:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"challenge_id":"<id>","code":"543210"}'
```

Frontend:

```bash
cd "/Users/manojbarik/Desktop/SIH PROJECT 2026/frontend"
npm run dev
```

Visiting the app shows sign-in/create-account options, the OTP verification step, and a protected account page after successful verification.

## Checks Run

- `ruff check app migrations tests ../database` — clean
- `pytest` — 15 passing (health, models, identity register/verify/resend/refresh rotation/logout/RBAC and status checks)
- `alembic upgrade head --sql` — generates SQL for revisions `20260906_0001` and `20260906_0002`
- `python -m compileall app migrations tests ../database` — clean
- Frontend `npm run lint` (eslint) and `npm run build` (`tsc -b && vite build`) — clean

## Deferred

- Live `alembic upgrade head` against a real PostgreSQL instance (no server/client available in this environment).
- Profile onboarding, KYC, and admin verification (`Phase 4`).
- Email OTP / alternate channels, password auth, and account recovery.
- Production JWT key management, token revocation lists, and device management UI.
- Rate limiting at the API/edge layer for OTP and registration.
- Integration of `AuthContext` with future role-based home dashboards.