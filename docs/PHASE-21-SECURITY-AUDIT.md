# Phase 21 - Security Audit & Hardening

Phase 21 performs a full application audit (JWT, password handling, authorization/IDOR,
SQL injection, XSS, CSRF, CORS, input validation, file uploads, rate limiting, secrets,
webhook verification, duplicate payments, sensitive data exposure, logging) and **fixes
the vulnerabilities** without weakening security to make tests pass. Every fix is
verified by automated tests and the full gate suite.

## Audit Scope

| Area                  | Verdict                                                          |
| --------------------- | ---------------------------------------------------------------- |
| SQL injection         | Clean — all queries via SQLAlchemy ORM / bound parameters, no raw SQL f-strings found |
| XSS (frontend)        | Clean — no `dangerouslySetInnerHTML`/`innerHTML`/`eval` sinks; React escapes by default |
| CSRF                  | Not applicable — bearer tokens in headers, no cookies, CORS locked to two local origins |
| File uploads          | None exist (no `UploadFile`/multipart) — not an attack surface    |
| Secrets in repo       | Clean — `.env*` gitignored; no hardcoded API keys; only the dev JWT fallback found (fixed) |
| Password storage      | Clean — bcrypt (72-byte guard), constant-time verify, per-phone failures throttled (new) |
| Authorization / IDOR  | Clean — role gates everywhere + ownership checks (raise 404) so non-owners cannot enumerate |
| Sensitive data        | Clean — `/auth/me` auth-only; admin routes ADMIN-only; no password hashes in responses |
| Input validation      | Good — Pydantic patterns (phone E.164, password 8–72, enums, bounded pagination) |

## Vulnerabilities Found, Severity, and Fixes

### 1. [HIGH] Hardcoded JWT signing fallback key — token forgery → privilege escalation

**Vulnerability.** `identity/security.py` fell back to a hard-coded, publicly-known value
(`dev-insecure-secret-change-me-000000000000`) whenever `JWT_SECRET_KEY` was empty or the
git-ignored example placeholder — **in every environment, including production**. Anyone
reading the source could forge an access token as any `user_id` + `role="ADMIN"` and fully
compromise the platform.

**Fix implemented** (`app/modules/identity/security.py`):
- `get_jwt_secret()` now fails fast (`RuntimeError`) in any non-`development`/`test`
  environment when the secret is unset or a known-insecure value (empty, the example
  placeholder, or the dev secret itself).
- Development/test may still use the dev secret so local runs and the suite work.
- Startup calls `security.get_jwt_secret()` in `app/main.py` lifespan, so a production
  misconfiguration cannot start a live service.

**Tests:** `test_jwt_secret_refuses_insecure_fallback_in_production`,
`test_jwt_secret_accepts_strong_secret_in_production`.

### 2. [MEDIUM] No rate limiting anywhere — brute force / abuse

**Vulnerability.** No throttling on `login` (password brute force), `register` (account
spam / SMS flooding), `otp/resend` (unlimited fresh challenges each with its own 5-attempt
verify budget), `otp/verify`, or the public `/ai/*` endpoints (unbounded model compute +
audit-row inserts = DoS/DB bloat surface).

**Fix implemented** (`app/core/rate_limit.py` + routers):
- In-process sliding-window rate limiter exposed as a FastAPI dependency
  (`rate_limit(limit, window, bucket)`), keyed per endpoint bucket + client IP,
  thread-safe, returns `429` + `Retry-After`.
- Applied: `register` 5/h, `login` 20/5min, `otp/resend` 10/h, `otp/verify` 30/5min,
  `refresh` 60/5min, `/ai/*` 60/min.
- Per-phone failed-login lockout (10 fails / 15 min) in `identity/service.py`.
- OTP resend cooldown (30 s) and per-account cap (5 challenges/hour, DB-counted) so
  challenge attempts cannot be stacked.
- `TRUST_PROXY_HEADERS` setting (default `false`): `X-Forwarded-For` is only honoured
  behind a trusted proxy; otherwise it cannot be spoofed to bypass IP limits.

**Tests:** `test_login_rate_limited_by_ip`, `test_login_locks_out_after_phone_failures`,
`test_register_rate_limited_by_ip`, `test_otp_resend_enforces_cooldown`,
`test_client_ip_respects_proxy_trust`, `test_proxy_forwarded_header_does_not_bypass_rate_limit`.

### 3. [MEDIUM] Unauthenticated payment webhook when secret unset

**Vulnerability.** `payments/service.py` only verified `X-Webhook-Signature` when
`PAYMENT_WEBHOOK_SECRET` was configured. With the default empty value, any caller could
POST forged `payment.captured`/`payment.failed`/`refund.processed`/`payout.completed`
events and mutate payment/funds state.

**Fix implemented** (`app/modules/payments/service.py`):
- Outside `development`/`test`, a missing `PAYMENT_WEBHOOK_SECRET` makes the webhook
  refuse events (`503`) instead of accepting them.
- Whenever a secret is configured, a missing or mismatched signature is rejected (`401`).

**Tests:** `test_webhook_unconfigured_in_production_is_refused`,
`test_webhook_rejects_missing_or_bad_signature`.

### 4. [LOW] JWT missing audience; algorithm read verbatim from settings

**Fix implemented** (`identity/security.py`): access tokens now carry `aud:
"marketplace-api"`, decoding requires `aud` + `sub`/`exp`/`iat`, and the algorithm set is
pinned to `HS256` (any other configured value is refused rather than silently used).

**Test:** `test_access_token_requires_audience`, `test_unsupported_jwt_algorithm_is_refused`.

### 5. [LOW] Login response-time user enumeration

**Vulnerability.** `log_in` skipped bcrypt for unknown phone numbers, so response time
revealed whether an account exists.

**Fix implemented** (`identity/service.py`): unknown phones / missing-hash accounts now
verify against a dummy bcrypt hash to equalize timing before returning 401.

### 6. [LOW] Logging lacked redaction (PII / tokens)

**Fix implemented** (`app/core/logging.py`): a `RedactionFilter` masks phone numbers
(`+9190… → +***********`), `Bearer` tokens, and inline `password=/secret=/token=` values
in every JSON log line (message template and args).

**Test:** `test_log_redaction_masks_sensitive_values`.

### 7. [LOW] Missing defense-in-depth security headers

**Fix implemented** (`app/main.py`): every response now sets `X-Content-Type-Options:
nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive CSP
(`default-src 'none'`), and `Permissions-Policy` (no geolocation/camera/microphone).

**Test:** `test_security_headers_present`.

### 8. [INFO] Startup safety for provider modes

**Fix implemented** (`app/main.py`): any non-development deployment still using `mock`
provider modes gets a startup warning; combined with fix #3 this means mock payment and
OTP behavior cannot silently run in production.

## Remaining Recommendations (production hardening)

1. **Shared rate-limit + lockout store (Redis)** — current throttles are process-local;
   a multi-worker or horizontally scaled deployment should back
   `app/core/rate_limit.py` with a shared store (same dependency interface).
2. **Store tokens in `httpOnly` cookies** instead of `localStorage` to eliminate the
   (currently theoretical) XSS-exfiltration path for access/refresh tokens.
3. **Real payment provider adapter** — Razorpay implementation is still stubbed; until
   adopted, ensure `PAYMENT_PROVIDER_MODE` is never left `mock` and the webhook secret is
   a strong random value.
4. **Add `Strict-Transport-Security`** once the API is served over HTTPS.

## Gate Results (all green)

| Gate                                                          | Result         |
| -------------------------------------------------------------- | -------------- |
| Backend `pytest` (`tests/`, includes new `test_security.py`)   | 162 passed      |
| ML `pytest` (`ml/tests/`)                                      | 25 passed       |
| `ruff check app tests migrations ../database`                  | clean          |
| `compileall`                                                   | OK             |
| `alembic upgrade head --sql` (Postgres dialect)                | OK             |
| Frontend `npm run build` + lint + vitest (unchanged, re-run)   | 35 passed      |