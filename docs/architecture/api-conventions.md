# API Conventions

## Base URL

All public API routes are versioned:

```text
/api/v1
```

FastAPI's generated OpenAPI document should be available in development at `/docs`, with `/redoc` as the alternative presentation.

## Resource Examples

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/otp/challenges
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/token/refresh
GET    /api/v1/me

GET    /api/v1/farmer/farms
POST   /api/v1/farmer/farms
GET    /api/v1/farmer/listings
POST   /api/v1/farmer/listings

GET    /api/v1/buyer/demands
POST   /api/v1/buyer/demands

GET    /api/v1/marketplace/listings
GET    /api/v1/marketplace/demands
GET    /api/v1/recommendations

POST   /api/v1/negotiations
POST   /api/v1/negotiations/{negotiation_id}/offers
POST   /api/v1/negotiations/{negotiation_id}/accept

POST   /api/v1/orders
GET    /api/v1/orders/{order_id}
POST   /api/v1/orders/{order_id}/payments/advance
POST   /api/v1/orders/{order_id}/quality-confirmation
POST   /api/v1/orders/{order_id}/disputes
```

Exact endpoints will be finalized with each implementation phase. The route examples establish naming and ownership, not a promise that all routes will be implemented together.

## Response Envelope

Successful single-resource responses should use a predictable shape:

```json
{
  "data": {
    "id": "uuid",
    "status": "PUBLISHED"
  },
  "meta": {
    "request_id": "request-id"
  }
}
```

Collection responses should include pagination metadata:

```json
{
  "data": [],
  "meta": {
    "request_id": "request-id",
    "page": 1,
    "page_size": 20,
    "total": 0
  }
}
```

## Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "details": [
      {
        "field": "quantity",
        "reason": "must be greater than zero"
      }
    ],
    "request_id": "request-id"
  }
}
```

Messages must be safe for clients and must not expose stack traces, SQL, provider secrets, or sensitive verification details.

## HTTP Rules

- Use `201 Created` for successful creation, `200 OK` for reads and synchronous commands, and `204 No Content` where no representation is useful.
- Use `400` for malformed requests, `401` for missing/invalid authentication, `403` for insufficient authorization, `404` for inaccessible or missing resources, `409` for state/conflict errors, `422` for valid JSON with invalid domain values, and `429` for rate limits.
- Use `5xx` only for server or dependency failures and return a safe error code.
- Use cursor pagination when result sets become large; page-based pagination is acceptable for the initial MVP.
- Filter and sort using allowlisted fields only.
- Require `Idempotency-Key` on financial and other retry-sensitive command endpoints.
- Use `ETag` or version fields for concurrent edits where stale updates could cause loss.

## Validation

- Pydantic validates types, formats, bounds, enums, and nested request structures.
- Application services validate ownership, verification status, state transitions, inventory, dates, and monetary rules.
- Database constraints remain the final protection for uniqueness, non-negative values, and referential integrity.
