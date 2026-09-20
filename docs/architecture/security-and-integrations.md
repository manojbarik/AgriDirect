# Security And Integrations

## Authentication

- Normalize mobile numbers to E.164 before storage or provider calls.
- OTP codes are generated and hashed server-side; raw codes are never persisted.
- Enforce expiry, attempt limits, resend cooldowns, and abuse/rate limits.
- Issue short-lived JWT access tokens containing user ID, role, and token version claims.
- Store refresh tokens as hashes, rotate them on use, and revoke token families after reuse detection.
- Do not put sensitive profile or verification data into JWT claims.

## Authorization

Use deny-by-default role dependencies and resource-level checks:

- Farmers can access only their own farm, listing, order, payout, and verification data.
- Buyers can access only their own demand, order, payment, and verification data.
- Both parties can see only the minimum counterparty information needed for a marketplace transaction.
- Admin actions require explicit permissions, not only a user-interface role check.
- A user cannot approve their own verification or resolve their own dispute.

## Service Interfaces

The backend should define ports similar to these before adding real adapters:

```text
OtpProvider
  send_code(phone, challenge_id) -> ProviderResult
  verify_code(phone, code) -> ProviderResult

KycProvider
  create_case(subject, callback_reference) -> VerificationReference
  get_status(reference) -> VerificationResult

PaymentProvider
  create_payment_intent(amount, currency, idempotency_key) -> PaymentReference
  capture_payment(reference) -> PaymentResult
  refund_payment(reference, amount) -> PaymentResult
  verify_callback(payload, signature) -> CallbackResult

NotificationProvider
  send(notification) -> DeliveryResult

DeliveryProvider
  create_shipment(order_snapshot) -> ShipmentReference
  get_status(reference) -> ShipmentStatus
```

Concrete mock adapters should be deterministic and clearly labeled for development. Provider callbacks must be authenticated, idempotent, and persisted as processed events before triggering business changes.

## KYC and Identity Documents

- The default model stores verification status, reason codes, provider reference, and timestamps.
- Do not store raw identity documents, document numbers, or unrestricted provider payloads in PostgreSQL.
- If a future requirement mandates document storage, use private encrypted object storage, short-lived signed URLs, strict access logging, retention/deletion policies, and a compliance review.
- Mask personal data in logs and error messages.

## Payment Safety

- Use provider-hosted checkout or tokenization where available; never accept raw card data in the API.
- Server calculates order totals and validates currency and amount against the order snapshot.
- Require idempotency keys for payment creation, capture, refund, and payout commands.
- Treat provider webhooks as untrusted until signature verification succeeds.
- Maintain an internal payment state machine separate from provider states.
- Reconcile provider events and internal records; do not mark a payment successful solely from a client redirect.
- Do not claim escrow or regulatory compliance until a real provider and legal operating model are selected.

## Secrets and Environment Variables

Keep secrets outside source control. Expected configuration categories include:

```text
DATABASE_URL
JWT_SECRET_KEY
JWT_ACCESS_TOKEN_MINUTES
JWT_REFRESH_TOKEN_DAYS
OTP_PROVIDER_MODE=mock
KYC_PROVIDER_MODE=mock
PAYMENT_PROVIDER_MODE=mock
NOTIFICATION_PROVIDER_MODE=mock
DELIVERY_PROVIDER_MODE=mock
ML_MODEL_REGISTRY_PATH
```

Only non-secret names and safe local defaults belong in `.env.example`. Production secrets must come from the deployment secret manager.

## Logging And Auditing

- Emit structured JSON logs with timestamp, level, request ID, actor ID where safe, module, and outcome.
- Never log OTPs, access/refresh tokens, payment credentials, identity documents, or full provider secrets.
- Record admin actions, verification decisions, dispute decisions, payment callbacks, and order state transitions in an append-oriented audit log.
- Use a correlation ID from the request through asynchronous jobs and provider callbacks.

## Privacy And Data Lifecycle

- Collect only data required for the current feature.
- Define retention periods for OTP challenges, audit data, verification metadata, delivery data, and analytics events before production launch.
- Support account closure through a policy-aware anonymization or archival workflow rather than blindly deleting transaction history.
- Restrict location precision when exact coordinates are not needed by the recipient.
