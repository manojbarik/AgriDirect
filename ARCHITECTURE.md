# AgriDirect / KrishiLink AI — System Architecture

## Overview

AgriDirect is a full-stack agricultural marketplace connecting Farmers, Buyers, Consumers, and Logistics partners. Built for **SIH 2026**.

| Layer | Stack | Port |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS | 5173 |
| **Backend** | FastAPI + SQLAlchemy + Alembic (SQLite dev / PostgreSQL prod) | 8001 |
| **ML** | Python — scikit-learn, LightGBM, XGBoost — price + demand prediction | — |
| **Auth** | JWT (HS256, access 15 min / refresh 30 days), OTP via SMTP | — |

---

## Directory Structure

```
SIH PROJECT 2026/
├── frontend/                         # React + Vite SPA
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                # Dev proxy: /api/v1 → 8001
│   └── src/
│       ├── main.tsx                  # App entry: Auth, Theme, Toast, I18n providers
│       ├── routes/
│       │   └── App.tsx               # React Router v7 + all role guards
│       │
│       ├── api/                      # Axios-based typed API clients
│       │   ├── api-client.ts         # Axios instance, interceptors, token refresh
│       │   ├── auth.ts               # login, register, OTP, refresh, logout, me
│       │   ├── farmer.ts             # dashboard, farms, crop plans, listings
│       │   ├── buyer.ts              # dashboard, demands, recommendations, onboarding
│       │   ├── admin.ts              # platform stats, user mgmt, verifications
│       │   ├── marketplace.ts        # public listings, search, filters
│       │   ├── orders.ts             # order lifecycle, tracking
│       │   ├── payments.ts           # payment processing
│       │   ├── escrow.ts             # escrow accounts
│       │   ├── contracts.ts          # smart contracts
│       │   ├── disputes.ts           # dispute resolution
│       │   ├── batches.ts            # crop batch traceability
│       │   ├── bulk-buyer.ts         # bulk/institutional buyer
│       │   ├── logistics.ts          # shipments, trips, live tracking
│       │   ├── ai.ts                 # price prediction, demand forecast, AI match
│       │   ├── trust.ts              # trust scores, components
│       │   ├── ratings.ts            # ratings & reviews
│       │   ├── weather.ts            # weather today, forecast
│       │   ├── notifications.ts      # unread count, list, mark-read
│       │   ├── farmNotes.ts          # farm diary/notes
│       │   ├── community.ts          # posts, comments, likes, members
│       │   ├── public.ts             # public price preview (unauthenticated)
│       │   ├── navigation.ts         # role-aware sidebar nav definitions
│       │   ├── design-tokens.ts      # CSS variable helpers
│       │   └── utils.ts              # cn(), apiErrorMessage()
│       │
│       ├── contexts/
│       │   ├── AuthContext.tsx       # JWT + user + role state, auto-refresh
│       │   ├── CartContext.tsx       # Consumer shopping cart
│       │   ├── ThemeContext.tsx      # Light / dark mode (html[data-theme])
│       │   ├── useAuth.ts            # useContext(AuthContext) hook
│       │   └── useCart.ts            # useContext(CartContext) hook
│       │
│       ├── hooks/
│       │   ├── useLiveShipment.ts    # WebSocket polling for live tracking
│       │   └── useRoleTheme.ts       # Role-based CSS accent injection
│       │
│       ├── i18n/
│       │   ├── translations.ts       # ~350 keys × 3 languages (en, or, hi)
│       │   └── I18nProvider.tsx      # useI18n(), t(), language switcher
│       │
│       ├── layouts/                  # Unified application shell
│       │   ├── DashboardLayout.tsx   # Root shell: sidebar + header + bottom nav
│       │   ├── DashboardSidebar.tsx  # Notion-style collapsible sidebar, mobile drawer
│       │   ├── DashboardHeader.tsx   # 48px header: breadcrumb, search, lang, avatar
│       │   ├── DashboardBottomNav.tsx# Mobile bottom navigation bar
│       │   ├── PageContainer.tsx     # Centered content wrapper (narrow/wide)
│       │   ├── PageHeader.tsx        # Page title + breadcrumb component
│       │   ├── Navbar.tsx            # Public landing page navbar
│       │   ├── CartButton.tsx        # Consumer cart icon + count
│       │   ├── Footer.tsx            # Public page footer
│       │   └── index.ts
│       │
│       ├── components/
│       │   ├── ui/                   # Notion-inspired primitive components
│       │   │   ├── Avatar.tsx        # User avatar with fallback initials
│       │   │   ├── Badge.tsx         # Pill badge (role, status)
│       │   │   ├── Button.tsx        # primary / secondary / ghost / danger
│       │   │   ├── Callout.tsx       # Notion-style callout box (info/warn/success)
│       │   │   ├── Card.tsx          # Surface card with border + shadow
│       │   │   ├── DataTable.tsx     # Notion DB table (sort, empty, skeleton)
│       │   │   ├── Dropdown.tsx      # Menu dropdown with portal positioning
│       │   │   ├── EmptyState.tsx    # Illustrated zero-state block
│       │   │   ├── Input.tsx         # Labeled input, password toggle, error
│       │   │   ├── Modal.tsx         # Focus-trapped modal dialog
│       │   │   ├── Portal.tsx        # React portal for overlays
│       │   │   ├── Skeleton.tsx      # Loading skeleton shimmer
│       │   │   ├── StatCard.tsx      # KPI metric card with trend badge
│       │   │   ├── StatusBadge.tsx   # Order/shipment status pill
│       │   │   ├── Tabs.tsx          # Horizontal tab bar
│       │   │   ├── Toast.tsx + ToastProvider.tsx
│       │   │   ├── Tooltip.tsx
│       │   │   └── index.ts
│       │   │
│       │   ├── layout/               # Shell sub-components
│       │   │   ├── CommandMenu.tsx   # ⌘K command palette (jump, quick actions)
│       │   │   ├── LanguageSwitcher.tsx # en / or / hi toggle
│       │   │   └── (legacy aliases: Navbar, Sidebar, MobileNav, DashboardShell)
│       │   │
│       │   ├── admin/          AdminTable.tsx, adminUtils.ts
│       │   ├── ai/             AgriDirectAssistant.tsx
│       │   ├── batches/        BatchDetailView.tsx, BatchSection.tsx
│       │   ├── disputes/       DisputeSection.tsx
│       │   ├── escrow/         EscrowPanel.tsx
│       │   ├── home/           AIPriceEngine, ContractSection, EscrowSection, TrustSection
│       │   ├── marketplace/    ProductCard.tsx
│       │   ├── notifications/  NotificationBell.tsx
│       │   ├── payments/       PaymentSection.tsx
│       │   ├── ratings/        RatingSection.tsx
│       │   ├── scene/          CinematicFarmScene + 5 sub-components (landing 3D scene)
│       │   ├── shipment/       LiveShipmentMap.tsx
│       │   ├── trust/          TrustScoreSection.tsx
│       │   ├── (role guards)   FarmerRoute, BuyerRoute, AdminRoute, ConsumerRoute,
│       │   │                   LogisticsRoute, ProtectedRoute
│       │   └── (shared)        CounterOfferModal, DemandForecastWidget,
│       │                       NegotiationThread, OrderStatusBadge, TrustBadge
│       │
│       ├── pages/
│       │   ├── farmer/
│       │   │   ├── FarmerDashboardPage.tsx    # KPIs, AI intel, weather, crops, tracking
│       │   │   ├── FarmerFarmPage.tsx
│       │   │   ├── FarmerInventoryPage.tsx
│       │   │   ├── FarmerListingsPage.tsx
│       │   │   ├── FarmerNotesPage.tsx
│       │   │   ├── FarmerOnboardingPage.tsx
│       │   │   ├── FarmerProductDetailPage.tsx
│       │   │   ├── FarmerProductsPage.tsx
│       │   │   ├── FarmerRecommendationsPage.tsx
│       │   │   └── FarmerWeatherPage.tsx
│       │   ├── buyer/
│       │   │   ├── BuyerDashboardPage.tsx
│       │   │   ├── BuyerDemandsPage.tsx
│       │   │   ├── BuyerOnboardingPage.tsx
│       │   │   └── BuyerRecommendationsPage.tsx
│       │   ├── admin/
│       │   │   ├── AdminDashboardPage.tsx     # Platform metrics + Recharts
│       │   │   ├── AdminBrowsePage.tsx
│       │   │   ├── AdminDisputesPage.tsx
│       │   │   ├── AdminTrustScoresPage.tsx
│       │   │   └── AdminVerificationsPage.tsx
│       │   ├── consumer/
│       │   │   ├── ConsumerHomePage.tsx
│       │   │   ├── ConsumerMarketplacePage.tsx
│       │   │   ├── ConsumerCartPage.tsx
│       │   │   ├── ConsumerCommunityPage.tsx
│       │   │   ├── ConsumerProfilePage.tsx
│       │   │   └── ConsumerWeatherPage.tsx
│       │   ├── logistics/
│       │   │   ├── LogisticsDashboardPage.tsx
│       │   │   └── TripDetailPage.tsx
│       │   ├── auth/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   ├── VerifyPage.tsx             # OTP entry
│       │   │   └── ForgotPasswordPage.tsx
│       │   ├── marketplace/
│       │   │   ├── MarketplacePage.tsx
│       │   │   ├── ListingDetailPage.tsx
│       │   │   └── FarmerProfilePage.tsx
│       │   ├── contracts/
│       │   │   ├── ContractsPage.tsx
│       │   │   ├── ContractDetailPage.tsx
│       │   │   └── ContractNewPage.tsx
│       │   ├── orders/
│       │   │   ├── OrdersPage.tsx
│       │   │   └── OrderDetailPage.tsx
│       │   ├── batches/         FarmerBatchesPage.tsx
│       │   ├── bulk-buyer/      BulkBuyerDashboardPage.tsx
│       │   └── notifications/   NotificationsPage.tsx
│       │
│       └── styles/
│           ├── tokens.css            # ALL CSS custom properties (single source of truth)
│           ├── globals.css           # Base resets, body, scrollbar, focus
│           ├── theme.css             # Role/dark-mode overrides
│           ├── animations.css        # Keyframes: shimmer, fadeIn, slideUp, pulse
│           └── index.css             # Import order: tokens → globals → theme → animations
│
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── main.py                   # App factory, CORS, middleware, lifespan
│   │   ├── api/
│   │   │   └── router.py             # Mounts all 23 sub-routers under /api/v1
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic Settings (env-driven)
│   │   │   ├── logging.py            # Structured JSON logging
│   │   │   └── rate_limit.py         # Token-bucket rate limiting
│   │   ├── db/
│   │   │   ├── base.py               # SQLAlchemy declarative Base
│   │   │   └── session.py            # get_db() dependency, engine setup
│   │   ├── integrations/
│   │   │   ├── otp.py                # MockOtpProvider, SmtpOtpProvider, GmailOtpProvider
│   │   │   ├── payment.py            # Mock payment gateway
│   │   │   ├── verification.py       # Farmer KYC helpers
│   │   │   └── buyer_verification.py # Buyer GST/KYC helpers
│   │   ├── templates/email/otp.py    # OTP email HTML template
│   │   └── modules/                  # Domain-driven feature modules
│   │       │                         # Each module: router.py + service.py + schemas.py
│   │       ├── identity/             # Auth: register, login, OTP, JWT, password reset
│   │       │   └── dependencies.py   # get_current_user(), require_role()
│   │       ├── farmer/               # Farmer dashboard, farms, crop plans
│   │       ├── buyer/                # Buyer dashboard, demands, AI recommendations
│   │       ├── bulk_buyer/           # Institutional / bulk buyer flows
│   │       ├── admin/                # Platform admin: users, verifications, analytics
│   │       ├── marketplace/          # Public listings, search, matching
│   │       ├── orders/               # Full order lifecycle + negotiation engine
│   │       ├── payments/             # Payment processing
│   │       ├── escrow/               # Escrow accounts, release, admin escrow
│   │       ├── contracts/            # Contract creation, signing, hash verification
│   │       ├── disputes/             # Dispute filing, evidence, resolution
│   │       ├── batches/              # Crop batch traceability, QR codes
│   │       ├── logistics/            # Shipments, trips, tracking events
│   │       ├── trust/                # Trust score engine (5 components), history
│   │       │   └── engine.py         # gather_farmer_metrics(), gather_buyer_metrics()
│   │       ├── ratings/              # Ratings & reviews (post-delivery)
│   │       ├── notifications/        # Multi-channel (email/SMS/in-app) notifications
│   │       ├── ai/                   # ML inference endpoints
│   │       ├── weather/              # Weather forecast service
│   │       ├── farm_notes/           # Farm diary / notes
│   │       └── community/            # Posts, comments, likes, members
│   │
│   ├── migrations/                   # Alembic (21 versions, HEAD: 20260910_0021)
│   │   └── versions/
│   │       ├── 20260906_0001_initial_schema.py
│   │       ├── 20260906_0002_identity.py
│   │       ├── 20260906_0003_user_password_hash.py
│   │       ├── 20260906_0004_farmer_verification_status.py
│   │       ├── 20260906_0005_buyer_verification_status.py
│   │       ├── 20260906_0006_negotiation_orders.py
│   │       ├── 20260906_0007_payment_batch_quality.py
│   │       ├── 20260906_0008_delivery_disputes.py
│   │       ├── 20260906_0009_trust_score_history.py
│   │       ├── 20260906_0010_ratings_comment.py
│   │       ├── 20260906_0011_ai_predictions.py
│   │       ├── 20260906_0012_escrow_accounts.py
│   │       ├── 20260906_0013_contracts.py
│   │       ├── 20260906_0014_role_profiles.py
│   │       ├── 20260906_0015_weather.py
│   │       ├── 20260906_0016_farm_notes.py
│   │       ├── 20260906_0017_community.py
│   │       ├── 20260908_0018_remove_fpo.py
│   │       ├── 20260908_0019_password_reset.py
│   │       ├── 20260908_0020_logistics_tracking.py
│   │       └── 20260910_0021_bulk_buyer.py       ← HEAD
│   ├── tests/                        # 244 pytest tests
│   ├── scripts/gmail_oauth_setup.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml
│   └── .env                          # Local config (gitignored)
│
├── ml/                               # ML workspace (independent Python package)
│   ├── train.py                      # Training pipeline (price + demand)
│   ├── predict.py                    # Inference helpers
│   ├── preprocessing.py              # Feature engineering (price model)
│   ├── evaluate.py                   # Cross-validation + report generation
│   ├── demand/
│   │   ├── data.py, predict.py, preprocessing.py, train.py
│   ├── evaluation/
│   │   ├── compare.py                # Model comparison (LightGBM vs XGBoost vs RF)
│   │   └── plots.py
│   ├── models/
│   │   ├── price_prediction_model.joblib
│   │   ├── demand_model.joblib
│   │   ├── model_metadata.json
│   │   └── demand_model_metadata.json
│   ├── data/synthetic_crop_prices.csv
│   ├── reports/                      # Evaluation CSVs, markdown + plots
│   ├── tests/                        # 25 pytest tests
│   │   ├── test_model_loading.py
│   │   ├── test_prediction.py
│   │   └── test_preprocessing.py
│   └── pyproject.toml
│
├── ARCHITECTURE.md
├── README.md
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Backend Models (SQLAlchemy)

### Core Identity
- **User** — id, phone_e164, email, password_hash, role, status, phone_verified_at
- **OtpChallenge** — user_id, channel, code_hash, expires_at, consumed_at, attempts, provider_reference
- **RefreshToken** — user_id, token_hash, expires_at, revoked_at
- **PasswordResetToken** — user_id, token_hash, expires_at, consumed_at

### Profiles
- **FarmerProfile** — user_id, farm_name, location, verified, trust_score
- **BuyerProfile** — user_id, company_name, gst_number, verified
- **ConsumerProfile** — user_id, preferences
- **LogisticsPartnerProfile** — user_id, company_name, vehicle_details
- **Farm** — farmer_id, name, location, size_hectares, crops[]

### Marketplace
- **Crop** — id, name, category, unit, base_price
- **CropListing** — farmer_id, crop_id, quantity, price, grade, harvest_date, status
- **CropBatch** — listing_id, batch_number, traceability_data
- **FarmerCropPlan** — farmer_id, crop_id, planned_area, season
- **BuyerDemand** — buyer_id, crop_id, quantity, max_price, location, deadline
- **Order** — buyer_id, farmer_id, status, total_amount, escrow_id
- **OrderItem** — order_id, listing_id, quantity, unit_price
- **Contract** — order_id, terms_hash, signed_at
- **Delivery** — order_id, shipment_id, status, delivered_at

### Logistics
- **Shipment** — order_id, logistics_partner_id, status, pickup_at, delivered_at
- **TrackingEvent** — shipment_id, location, status, timestamp
- **Trip** — logistics_partner_id, route_optimized, stops[], status

### Transactions & Trust
- **EscrowAccount** — order_id, buyer_id, farmer_id, amount, status, released_at
- **Payment** — escrow_id, amount, method, status, gateway_ref
- **TrustScore** — user_id, score, version, components (verification, transaction, quality, rating, dispute)
- **TrustScoreHistory** — trust_score_id, score, changed_at, reason
- **Rating** — from_user_id, to_user_id, order_id, score, comment
- **Review** — rating_id, detail

### AI / Weather / Community
- **AiPrediction** — model_type, input_hash, output, confidence, created_at
- **WeatherForecast** — location, date, temp_min, temp_max, humidity, rainfall
- **Community** — name, description, created_by
- **CommunityPost/Comment/Like/Member** — social features
- **Notification** — user_id, type, title, body, read, channel

---

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Register   │────▶│  SMTP OTP   │
│  (email)    │     │  (PENDING)  │     │  (6-digit)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
┌─────────────┐     ┌─────────────┐     ┌──────▼──────┐
│  JWT Pair   │◀───│  Verify     │◀───│  User enters │
│ (access+ref)│     │  OTP        │     │  code       │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **OTP Provider**: `SmtpOtpProvider` (Gmail SMTP + App Password)
- **JWT**: HS256, access 15min, refresh 30 days
- **Rate limits**: register 5/hr, login 20/5min, OTP verify 30/5min, resend 10/hr

---

## Role-Based Routing (Frontend)

All authenticated routes are wrapped in the unified `DashboardLayout` (Notion-style sidebar + header).

| Role | Guard | Key Pages |
|---|---|---|
| `FARMER` | `<FarmerRoute>` | Dashboard, Farm, Listings, Inventory, Notes, Weather, Orders, Recommendations, Batches |
| `BUYER` | `<BuyerRoute>` | Dashboard, Demands, Recommendations, Orders, Contracts, Onboarding |
| `CONSUMER` | `<ConsumerRoute>` | Home, Marketplace, Cart, Community, Orders, Profile, Weather |
| `ADMIN` | `<AdminRoute>` | Dashboard, Browse, Verifications, Trust Scores, Disputes |
| `LOGISTICS` | `<LogisticsRoute>` | Dashboard, Trip Detail |
| `BULK_BUYER` | `<BuyerRoute>` | Bulk Buyer Dashboard |

Route guards in [`App.tsx`](frontend/src/routes/App.tsx) redirect unauthenticated users to `/auth/login` and enforce role access via `require_role()` on the backend.

---

## API Endpoints

All routes are mounted under **`/api/v1`**. 23 routers total:

| Router | Prefix | Key Endpoints |
|---|---|---|
| Health | `/health` | `GET /` |
| Identity | `/auth` | register, login, OTP verify/resend, refresh, logout, me, role, forgot/reset-password |
| Farmer | `/farmer` | dashboard, farm, crop plans, listings, onboarding |
| Farm Notes | `/farm-notes` | CRUD diary entries |
| Buyer | `/buyer` | dashboard, demands, recommendations, onboarding |
| Bulk Buyer | `/bulk-buyer` | institutional demand flows |
| Marketplace | `/marketplace` | public listings, search, listing detail, farmer profile |
| Orders | `/orders` | create, list, detail, negotiate, accept/reject, status update |
| Payments | `/payments` | initiate, webhook, status |
| Disputes | `/disputes` | file, evidence, resolve, admin actions |
| Batches | `/batches` | create batch, trace, QR |
| AI | `/ai` | predict-price, predict-demand, match-farmers, match-buyers |
| Trust | `/trust` | score, history, components, recalculate |
| Ratings | `/ratings` | post rating, list, average |
| Notifications | `/notifications` | list, unread-count, mark-read, mark-all-read |
| Escrow | `/escrow` | create, fund, release, refund |
| Escrow Admin | `/admin/escrow` | admin escrow override |
| Contracts | `/contracts` | create, sign, list, detail |
| Logistics | `/logistics` | dashboard, assign-driver, plan-trip, trip detail, tracking |
| Community | `/community` | posts, comments, likes, members |
| Admin | `/admin` | users, verifications, trust scores, disputes |
| Admin Dashboard | `/admin/dashboard` | platform stats, growth series |
| Weather | `/weather` | today, forecast |

---

## Design System (Frontend)

All design tokens live in `src/styles/tokens.css` (single source of truth). The Notion-inspired palette:

```css
:root {
  /* Notion-inspired surfaces */
  --surface-page:   #F7F7F5;    /* warm canvas background */
  --surface-card:   #FFFFFF;    /* card / panel surface */

  /* Typography */
  --text-primary:   #37352F;    /* Notion dark charcoal */
  --text-secondary: #787774;    /* muted labels */
  --text-tertiary:  #9B9A97;    /* placeholders */

  /* Borders */
  --border-subtle:  #E9E9E7;    /* default card border */
  --border-default: #DFDFDC;    /* hover border */

  /* Agricultural accent */
  --notion-primary: #2F6F62;    /* forest green — CTAs + active state */
  --notion-primary-hover: #24584E;

  /* Typography */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Radius (compact Notion standard) */
  --radius-sm: 4px;  --radius-md: 6px;
  --radius-lg: 8px;  --radius-xl: 10px;
}
/* Dark mode: html[data-theme="dark"] overrides all surfaces and text tokens */
/* Reduced motion: @media (prefers-reduced-motion: reduce) zeros all transitions */
```

**Frontend Libraries**:

| Library | Version | Purpose |
|---|---|---|
| React | latest | UI framework |
| TypeScript | latest | Type safety |
| Vite | latest | Build tool + dev server |
| TailwindCSS | latest | Utility classes |
| framer-motion | ^13 | Page + component animations |
| lucide-react | ^1.41 | Icon set |
| recharts | ^3.10 | Analytics charts |
| axios | latest | HTTP client |
| react-router-dom | latest | Client-side routing |

---

## Internationalization (i18n)

- **Languages**: English (en), Odia (or), Hindi (hi)
- **Keys**: ~303 keys across all roles
- **Usage**: `t('key')` in components, `t(\`navLabel.\${section}\`)` for sidebar
- **Provider**: `I18nProvider` wraps `App.tsx`, language persisted in localStorage

---

## Testing Gates

| Layer | Command | Result |
|---|---|---|
| Backend | `backend/.venv/bin/python -m pytest backend/tests/ -q` | **244 passed** |
| Backend Lint | `backend/.venv/bin/ruff check backend/app backend/scripts` | **0 errors** |
| ML | `cd ml && ../backend/.venv/bin/python -m pytest tests/ -q` | **25 passed** |
| Frontend Unit | `cd frontend && npx vitest run` | **62 passed** |
| Frontend Lint | `cd frontend && npm run lint` | **0 errors** |
| Frontend Build | `cd frontend && npm run build` | **✓ 3023 modules, ~450ms** |

---

## Environment Variables (Key)

```bash
# Root .env (takes precedence over backend/.env)
OTP_PROVIDER_MODE=smtp          # mock | gmail | smtp
APP_ENV=development

# Backend .env
DATABASE_URL=sqlite:///./marketplace_dev.db  # or postgres://...
JWT_SECRET_KEY=<strong-secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_APP_PASSWORD=xxxx xxxx xxxx xxxx  # 16-char app password
SMTP_SENDER_EMAIL=your-gmail@gmail.com

# Gmail OAuth (alternative to SMTP)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_SENDER_EMAIL=...
```

---

## Development Commands

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# Frontend
cd frontend
npm run dev          # port 5173, proxies /api/v1 -> 8001
npm run build
npm run lint
npx vitest run

# ML
cd ml
python -m pytest

# Full stack (Docker)
docker-compose up --build
```

---

## Data Flow: OTP Registration

```
1. Client POST /auth/register {email, phone, password, role}
2. Backend: create User(status=PENDING)
3. _issue_challenge():
   a. get_otp_provider() → SmtpOtpProvider
   b. provider.generate_code() → "123456"
   c. provider.send(email, code) → SMTP → Gmail
   d. OtpChallenge{code_hash=sha256(code), expires_at=now+3min}
4. Return {user_id, challenge_id, mock_code: null}
5. Client shows OTP input
6. Client POST /auth/otp/verify {challenge_id, code}
7. Backend: verify code_hash, mark challenge consumed
8. User.status = ACTIVE, phone_verified_at = now
9. Issue JWT pair → return tokens
```

---

## Deployment Notes

- **Production**: Use PostgreSQL, set `JWT_SECRET_KEY` (≥48 bytes), `OTP_PROVIDER_MODE=smtp`
- **HTTPS**: Terminate TLS at reverse proxy (nginx), set `TRUST_PROXY_HEADERS=true`
- **Secrets**: Never commit `.env`; use secret manager in prod
- **ML Models**: Serialize with `joblib`, load at startup in `app.modules.ai.service`
- **WebSockets**: Ready for live tracking (`/ws/tracking/{shipment_id}`)

---

## Key Files Reference

| Purpose | File |
|---|---|
| Backend entry | [`backend/app/main.py`](backend/app/main.py) |
| API router registry | [`backend/app/api/router.py`](backend/app/api/router.py) |
| Config (env) | [`backend/app/core/config.py`](backend/app/core/config.py) |
| Auth service | [`backend/app/modules/identity/service.py`](backend/app/modules/identity/service.py) |
| Auth guards | [`backend/app/modules/identity/dependencies.py`](backend/app/modules/identity/dependencies.py) |
| Trust engine | [`backend/app/modules/trust/engine.py`](backend/app/modules/trust/engine.py) |
| OTP providers | [`backend/app/integrations/otp.py`](backend/app/integrations/otp.py) |
| DB session | [`backend/app/db/session.py`](backend/app/db/session.py) |
| Frontend routes | [`frontend/src/routes/App.tsx`](frontend/src/routes/App.tsx) |
| Design tokens | [`frontend/src/styles/tokens.css`](frontend/src/styles/tokens.css) |
| Dashboard shell | [`frontend/src/layouts/DashboardLayout.tsx`](frontend/src/layouts/DashboardLayout.tsx) |
| Sidebar | [`frontend/src/layouts/DashboardSidebar.tsx`](frontend/src/layouts/DashboardSidebar.tsx) |
| Command palette | [`frontend/src/components/layout/CommandMenu.tsx`](frontend/src/components/layout/CommandMenu.tsx) |
| i18n dictionary | [`frontend/src/i18n/translations.ts`](frontend/src/i18n/translations.ts) |
| Axios client | [`frontend/src/api/api-client.ts`](frontend/src/api/api-client.ts) |
| ML training | [`ml/train.py`](ml/train.py) |
| ML models | [`ml/models/`](ml/models/) |

---

*Last updated: SIH 2026 — reflects actual implemented structure post full-stack audit, bug fixes, and Notion-inspired UI/UX redesign.*