# Domain Boundaries

The following bounded contexts map the requested capabilities to maintainable modules.

## Identity and Access

Responsibilities:

- User registration and profile basics
- Role assignment for `FARMER`, `BUYER`, and `ADMIN`
- Mobile OTP challenge lifecycle
- Login, refresh, logout, and account status
- JWT claims and authorization checks

Key entities: `User`, `Role`, `OtpChallenge`, `RefreshToken`, `UserSession`.

## Verification and Compliance

Responsibilities:

- Farmer identity/KYC verification architecture
- Buyer identity/business verification architecture
- Verification submissions, statuses, provider references, and reviewer decisions
- Admin verification queues and audit trail

Key entities: `VerificationCase`, `VerificationRequirement`, `VerificationEvent`.

The context stores the minimum metadata required to track a verification. Raw identity documents should be sent to an approved provider or controlled object-storage workflow only when required by a future compliance decision.

## Farmer and Farm Management

Responsibilities:

- Farmer profile and verification status display
- Farm details and location
- Production capacity and crop information
- Farmer payout profile verification status

Key entities: `FarmerProfile`, `Farm`, `FarmLocation`, `Crop`, `FarmerCropPlan`.

## Buyer Management

Responsibilities:

- Buyer profile
- Buyer type selection
- Business details and location
- Buyer payment verification status

Key entities: `BuyerProfile`, `BuyerBusiness`, `BuyerLocation`, `BuyerPaymentProfile`.

## Marketplace

Responsibilities:

- Farmer crop listings
- Buyer demand posts
- Search, filtering, availability, and listing lifecycle
- Farmer and buyer recommendation surfaces
- Match explanations and eligibility checks

Key entities: `CropListing`, `DemandPost`, `ListingInventory`, `Recommendation`, `MatchCandidate`.

## Pricing and Predictions

Responsibilities:

- Price prediction requests and results
- Demand prediction requests and results
- Model version and feature snapshot references
- Confidence, freshness, and fallback metadata

Key entities: `Prediction`, `ModelVersion`, `FeatureSnapshot`.

Predictions are advisory and must not silently override negotiated or contract prices.

## Negotiation

Responsibilities:

- Offer and counter-offer lifecycle
- Negotiation expiry
- Agreed quantity and price snapshot
- Participant authorization

Key entities: `Negotiation`, `Offer`, `NegotiationMessage`.

## Orders and Payments

Responsibilities:

- Direct purchases and conversion from accepted negotiation
- Order totals and immutable pricing snapshots
- Advance payment authorization and capture status
- Secure payment workflow, refund, settlement, and farmer payout records
- Idempotency and provider callback handling

Key entities: `Order`, `OrderItem`, `PaymentIntent`, `PaymentTransaction`, `Refund`, `Settlement`, `Payout`.

Payment provider state and internal business state must be stored separately. No card or bank secrets should be stored by this application unless a specific compliance-approved design requires it.

## Fulfillment and Quality

Responsibilities:

- Batch preparation
- Batch traceability and quality records
- Delivery assignment and tracking reference
- Delivery confirmation
- Buyer quality confirmation

Key entities: `OrderBatch`, `QualityCheck`, `Delivery`, `DeliveryEvent`, `QualityConfirmation`.

## Disputes and Resolution

Responsibilities:

- Dispute creation and evidence references
- Admin review and decision
- Refund, replacement, partial settlement, or rejection workflow
- Resolution deadlines and audit history

Key entities: `Dispute`, `DisputeEvidence`, `DisputeDecision`, `ReplacementCase`.

## Trust, Reviews, and Notifications

Responsibilities:

- Ratings and reviews after eligible milestones
- Trust score inputs, calculation version, and explanation
- In-app and external notification preferences and delivery status

Key entities: `Review`, `TrustScore`, `TrustScoreEvent`, `Notification`, `NotificationPreference`.

## Administration and Analytics

Responsibilities:

- Admin dashboard read models
- Verification and dispute queues
- User/listing moderation
- Operational and marketplace analytics

Key entities: `AdminAction`, `AuditLog`, `AnalyticsEvent`, and derived reporting views.

Analytics should consume sanitized events or read models rather than coupling dashboards to transactional tables for every query.

## Cross-Context Rules

- Contexts communicate through application-service interfaces or internal events.
- Foreign keys may connect transactional entities, but business rules remain owned by one context.
- Sensitive data access is explicit and role checked.
- All timestamps are stored in UTC.
- Public identifiers use UUIDs; human-readable numbers are separate display fields.
- Soft deletion or archival is used where legal, audit, or order-history requirements prohibit physical deletion.
