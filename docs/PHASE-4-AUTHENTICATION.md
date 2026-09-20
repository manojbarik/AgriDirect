# Phase 4 — Authentication and Authorization

This phase adds secure password-based authentication on top of the Phase 3B identity layer (mock OTP, JWT access tokens, rotating refresh tokens, logout, and RBAC). See `docs/PHASE-3B-IDENTITY.md` for the OTP/JWT/refresh design.

## Scope Implemented

1. **User registration** — `POST /api/v1/auth/register` accepts phone, role, password (and optional email), creates a `PENDING` user, and starts a mock OTP challenge for phone verification.
2. **Login** — `POST /api/v1/auth/login` authenticates with phone + password and returns access + refresh tokens. Unverified (`PENDING`) accounts are rejected until the phone is verified via OTP.
3. **Password hashing** — passwords are stored as bcrypt hashes only (`bcrypt.gensalt()` + `hashpw`), verified in constant time with `checkpw`. Passwords are limited to 72 bytes (bcrypt limit).
4. **JWT access tokens** — short-lived HS256 access tokens (default 15 minutes).
5. **Refresh token architecture** — opaque rotating refresh tokens stored hashed (SHA-256), revoked on rotation/logout (30-day default lifetime).
6. **Logout** — `POST /api/v1/auth/logout` revokes the refresh token.
7. **Role-based authorization** — roles `FARMER`, `BUYER`, `ADMIN` are enforced with `require_roles(...)` and `get_current_user`.

`ADMIN` accounts are not self-registered; they are created by the development seed or an operator.

## New / Modified Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | no | Register with phone + password (+ role, optional email); issues OTP challenge |
| POST | `/api/v1/auth/login` | no | Phone + password login; returns tokens |
| GET | `/api/v1/auth/me` | `Bearer` | Current user profile (any active role) |
| GET | `/api/v1/auth/role` | `Bearer` | Current user role |
| GET | `/api/v1/admin/overview` | `Bearer` (ADMIN) | User statistics; ADMIN-only example of role-specific protection |
| POST | `/api/v1/auth/otp/verify` | no | Verify phone OTP from registration and receive tokens |
| POST | `/api/v1/auth/refresh` | refresh token | Rotate refresh token |
| POST | `/api/v1/auth/logout` | refresh token | Revoke refresh token |

## Security Rules Enforced

- Passwords, OTP codes, and tokens are **never logged**. The mock OTP provider logs only the destination phone number (no code). A regression test asserts no password, code, or token value appears in captured logs.
- Password responses never include the password or its hash.
- Login failures return a generic `401 Invalid phone number or password` (no account-enumeration hint).
- `PENDING` accounts cannot log in; `SUSPENDED`/`CLOSED` accounts return `403`.
- Every new OTP challenge invalidates prior active challenges; a challenge locks after 5 failed attempts.
- Refresh tokens are one-time use: reuse after rotation returns `401`.

## Files Changed

- `backend/app/db/models/people.py` — added `password_hash` column to `users`
- `backend/migrations/versions/20260906_0003_user_password_hash.py` — new migration
- `backend/app/modules/identity/security.py` — bcrypt hashing helpers
- `backend/app/modules/identity/schemas.py` — password fields, `RoleResponse`
- `backend/app/modules/identity/service.py` — registration hashes password; password login
- `backend/app/modules/identity/router.py` — login payload, `/role` endpoint
- `backend/app/modules/admin/router.py` — ADMIN-gated `/admin/overview`
- `backend/app/api/router.py` — mounts admin router
- `backend/app/integrations/otp.py` — removed code from log output
- `backend/tests/test_identity.py` — password/login/RBAC/log-leak tests
- `database/seed_dev.py` + `database/README.md` — sandbox accounts with dev passwords and an `ADMIN` user
- Frontend: `src/lib/auth.ts`, `src/context/useAuth.ts`, `src/context/AuthContext.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`

## Development Accounts (seed)

| Role | Phone | Password |
| --- | --- | --- |
| `ADMIN` | `+919000000000` | `Sandbox@123` |
| `FARMER` | `+919000000001` | `Sandbox@123` |
| `BUYER` | `+919000000002` | `Sandbox@123` |

Seed after migrating:

```bash
PYTHONPATH=backend backend/.venv/bin/python -m database.seed_dev
```

## Run Instructions

```bash
cd "/Users/manojbarik/Desktop/SIH PROJECT 2026/backend"
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

Login with the seeded buyer:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone_e164":"+919000000002","password":"Sandbox@123"}'
```

Admin statistics (use the admin account token):

```bash
curl -s http://127.0.0.1:8000/api/v1/admin/overview \
  -H "Authorization: Bearer <admin-access-token>"
```

Frontend:

```bash
cd "/Users/manojbarik/Desktop/SIH PROJECT 2026/frontend"
npm run dev
```

The login page now asks for phone + password; the register page asks for role, phone, and password, then verifies the phone with the mock OTP (last 6 digits) before creating an active account.

## Checks Run

- Backend: `ruff check`, `compileall`, `alembic upgrade head --sql`, `pytest` — **22 tests passing**, including:
  - registration (valid/duplicate/bad phone/short password)
  - OTP verify (wrong code, lockout after 5, resend invalidates old challenge)
  - password login (unverified→403, verified→200, wrong password→401, unknown phone→401)
  - refresh rotation, logout revocation
  - admin endpoint authorization (ADMIN 200, FARMER 403, anonymous 401)
  - RBAC unit checks for `FARMER` vs `BUYER`
  - no password/code/token in logs
- Frontend: `npm run lint` and `npm run build` — clean

## Deferred

- Live `alembic upgrade` against PostgreSQL (not available in this environment).
- Password reset / forget-password flows and email verification.
- API-level rate limiting and account-lockout thresholds for login.
- Production JWT key management and device/session management UI.
- Admin console UI; buyer/farmer role dashboards (later phases).