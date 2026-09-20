# Authentication & Authorization

Secure authentication for all three roles (`FARMER`, `BUYER`, `ADMIN`) with phone-based OTP
verification, password login, rotating JWT access/refresh tokens, and role-gated
authorization. Hardened in Phase 21 (see `docs/PHASE-21-SECURITY-AUDIT.md`).

## 1. Flows

### 1.1 Registration (phone-first)

```
POST /auth/register  {phone_e164, password, role, ...}
  → creates user in PENDING status
  → issues an OTP challenge, returns challenge_id + expires_at
  → development/test only: mock_code (last 6 digits of phone)
```

- Phone must match `^\+[1-9]\d{7,14}$` (E.164); password 8–72 characters (bcrypt 72-byte cap).
- Until the phone is verified the user is `PENDING` and cannot log in.

### 1.2 OTP verification

```
POST /auth/otp/verify  {challenge_id, code}
  → success: status → ACTIVE, returns access + refresh tokens
```

- Each challenge allows **5 attempts**, lives **5 minutes**, and is single-use.
- `POST /auth/otp/resend` issues a fresh challenge, throttled to one per 30 s and
  5 challenges/hour per account.

### 1.3 Login

```
POST /auth/login  {phone_e164, password}
  → success: tokens
  → 401 invalid; 403 if PENDING/SUSPENDED/CLOSED
```

- Brute-force protection: 10 failed attempts per phone lock the account 15 minutes; per-IP
  limit 20/5 min. Unknown phones run a dummy bcrypt verify so **timing does not reveal
  account existence**.

### 1.4 Token refresh & logout

```
POST /auth/refresh  {refresh_token} → {access_token, refresh_token}  (rotated)
POST /auth/logout   {refresh_token} → revoke (one-time, invalidates the pair)
```

- Refresh tokens are stored **hashed**, rotated on each refresh (old token replaced), audited
  with user-agent + source IP, and expire after 30 days.

## 2. Token Format (JWT)

- Algorithm pinned to **HS256**; any other configured algorithm is refused.
- Claims: `sub` (user id), `role`, `type: "access"`, `aud: "marketplace-api"`,
  `iat`, `exp` (15 minutes). `exp`, `iat`, `sub`, `aud` are all required on decode.
- Access token signed with the configured `JWT_SECRET_KEY`.

### JWT secret policy (Phase 21)

- Development/test may use the shared dev secret so local runs work out of the box.
- **Any other environment fails fast at startup** if `JWT_SECRET_KEY` is unset or equal to a
  known-insecure value (empty, `replace-with-a-local-development-secret`, the dev secret).

## 3. Passwords

- bcrypt (`password_hash`); password length enforced 8–72 to respect the 72-byte limit.
- Constant-time compare; per-phone failure lockout (see above).

## 4. OTP internals

- OTP code is never stored plaintext — only a salted hash; challenges expire and are consumed.
- Mock provider reveals the code only when `OTP_PROVIDER_MODE=mock` **and** `APP_ENV` is
  `development` or `test`. Outside that, the code is only delivered by a real provider.

## 5. Authorization model

- Every router declares a role gate dependency:

```python
PartyDependency = require_roles("FARMER", "BUYER")
FarmerDependency = require_roles("FARMER")
AdminDependency = require_roles("ADMIN")
```

| Scope | Dependency | Example routes |
| --- | --- | --- |
| Any logged-in user | `get_current_user` | `/auth/me`, `/notifications/*` |
| Farmer or buyer | `require_roles("FARMER","BUYER")` | orders, batches, disputes, ratings |
| Farmer only | `require_roles("FARMER")` | farmer, listings mgmt |
| Buyer/admin | `require_roles("BUYER","ADMIN")` | payment intents/confirm/refund |
| Admin only | `require_roles("ADMIN")` | `/admin/*`, dispute review, trust recalculations |

- **Ownership**: services re-check that the caller participates in the resource and raise
  `404 Not found` (identical to a missing resource) so callers cannot enumerate other users'
  records (protected via the same pattern in orders, batches, buyer/farmer, notifications,
  ratings).

## 6. Throttles summary

| Endpoint | Per-IP | Per-account |
| --- | --- | --- |
| register | 5/h | — |
| login | 20/5 min | 10 fails / 15 min per phone |
| otp/resend | 10/h | 30 s cooldown · 5/h |
| otp/verify | 30/5 min | 5 attempts/challenge |
| refresh | 60/5 min | — |

All throttles in Phase 21 live in `app/core/rate_limit.py` (process-local) plus per-account
guards in `app/modules/identity/service.py`.

## 7. Frontend behavior

- Tokens are stored via `src/lib/auth.ts`; the Axios client in `src/lib/api-client.ts`
  attaches `Authorization` and performs **silent refresh on 401** for non-auth-flow requests
  (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/otp` are exempt).
- Route guards: `ProtectedRoute`, `FarmerRoute`/`BuyerRoute`, `AdminRoute`.

## 8. Security controls (Phase 21)

- Log redaction filter for phones, bearer tokens, and inline `password=/secret=/token=`.
- JSON logs with no plaintext secrets.
- CORS allow-list + security headers middleware.
- Fail-fast JWT policy, pinned algorithm, `aud` claim.
- Recommended follow-up: `httpOnly` cookies and a shared (Redis) throttle store for
  multi-worker deployments.