# 🌾 AGRIDIRECT AI — AgriDirect
### *Empowering Indian Agriculture through Multimodal AI, Transparent Price Discovery & Digital Trust*

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-brightgreen?style=for-the-badge&logo=target)](https://sih.gov.in)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Google Gemini 2.5](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🌐 Live Production Deployments & Access

| Resource | URL / Access Link | Description |
|---|---|---|
| **Live Web Application** | 🔗 [https://agridirect1.onrender.com](https://agridirect1.onrender.com) | Responsive web app for Desktop, Tablet, and Mobile browsers |
| **Backend API Gateway** | 🔗 [https://agridirect-backend-au87.onrender.com](https://agridirect-backend-au87.onrender.com) | Production FastAPI REST & Multimodal services |
| **Interactive API Documentation** | 🔗 [https://agridirect-backend-au87.onrender.com/docs](https://agridirect-backend-au87.onrender.com/docs) | Swagger UI for interactive API exploration |
| **Android Mobile App (APK)** | 📱 `6ab5872552b44d4b270d416a.apk` (in repository root) | Native Android wrapper with microphone hardware bridge |

---

## 📌 Problem Statement & SIH 2026 Vision

Smallholder farmers in India produce over 80% of the nation's food, yet they remain vulnerable to systemic inefficiencies:
1. **Middlemen Exploitation:** Intermediaries capture 40% to 60% of crop value, leaving farmers with minimal margins while driving up retail prices.
2. **Severe Post-Harvest Losses:** Due to lack of cold-storage intelligence and timely market demand signals, 25%–30% of perishable harvests spoil before sale.
3. **Digital & Language Barriers:** Most agricultural apps rely on complex, English-only text interfaces inaccessible to non-literate or vernacular-speaking farmers.
4. **Counterparty Distrust & Payment Defaults:** Traditional verbal agreements lead to frequent contract breaches, unpaid balances, and delivery disputes.

**AgriDirect (KrishiLink AI)** bridges these chasms by delivering a direct, auditable marketplace governed by mathematical trust scores, smart digital escrow contracts, and an intuitive **Multilingual Voice Assistant ("Jarvis")** that speaks to farmers in their mother tongue (**Odia, Hindi, and English**).

---

## ✨ Flagship Innovations & Capabilities

### 🎙️ 1. Multilingual AI Voice Hotline ("Jarvis")
- **Everywhere Voice Access:** Available across desktop browsers, mobile devices, and Android APKs.
- **Dual-Mode Voice Architecture:**
  - *Desktop Chrome/Edge:* Browser-native Web Speech API for instantaneous transcription.
  - *Android APK & Unsupported Browsers:* Hardware audio capture via `navigator.mediaDevices.getUserMedia` and `MediaRecorder`, sending raw audio directly to `POST /api/v1/ai/assistant/audio` where **Google Gemini 2.5 Flash** processes the voice natively.
- **Vernacular Dialect Support:** Communicates fluently in **Odia (`or-IN`)**, **Hindi (`hi-IN`)**, and **English (`en-IN`)**, with automatic phonetic trans-phonation for regions where local OS voices are unavailable.

### 📜 2. Smart Contract Farming & Milestone Digital Escrow
- **Cryptographic Contracts:** Digital farming agreements with immutable SHA-256 terms hashing.
- **Milestone Payouts:** Buyer locks funds in an escrow account (e.g. 20-30% advance deposit). Inspection and delivery milestones automatically release funds to the farmer, completely eliminating bad debt and payment default risk.

### 📈 3. Dual-Layer Price & Demand Intelligence
- **LightGBM & XGBoost Machine Learning:** Trained on 10,000+ historical mandi records to predict crop prices (₹/Quintal) and regional demand curves with 93.4% accuracy ($R^2 = 0.934$).
- **Live Mandi Web Intelligence:** Integrated with **Tavily Web Search API** to fetch real-time spot rates from major agricultural markets across India.

### ❄️ 4. Post-Harvest Storage Intelligence ("Sell Now vs Store-Then-Sell")
- Mathematically computes whether a farmer should sell immediately at current market rates or hold in cold storage for future projected prices.
- Factors in cold storage rent, transportation, handling fees, and crop-specific spoilage rates, providing breakeven storage durations and directories of nearby verified cold-chain facilities.

### 🏷️ 5. Seed-to-Fork QR Batch Traceability
- Generates dynamic QR codes (`AGRI:<batch_code>:<id>`) for crop harvests.
- Buyers and consumers can scan the QR code to verify farm origin, chemical/fertilizer usage history, harvest timestamps, and quality laboratory grades (Grade A/B/C).

### 🛡️ 6. Algorithmic 5-Pillar Trust Score Engine
Transparent, mathematically explainable credibility score (0–100) assigned to both farmers and buyers:
- **Verification (20%):** Government ID, Aadhaar, Land Records, and GST validation.
- **Transactions (30%):** Order completion percentage and total traded volume.
- **Quality (20%):** Quality inspection pass rates and low return percentages.
- **Ratings (20%):** Normalized counterparty reviews.
- **Disputes (10%):** Track record free of unresolved claims.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER ACCESS LAYER                               │
│   Desktop Web Browser   │   Mobile Web Browser   │   Android APK (App) │
└────────────────────────┬─────────────────────────┴─────────────────────┘
                         │ HTTPS / WSS / REST
┌────────────────────────▼───────────────────────────────────────────────┐
│              GATEWAY, CORS & SECURITY LAYER (Render Cloud)             │
│   CORS Policy · Token-Bucket Rate Limiter · JWT Bearer (HS256) Auth    │
└────────────────────────┬───────────────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────────────┐
│            FASTAPI CORE APPLICATION SERVICES (:8000)                   │
│   ├── /auth & /identity       ├── /marketplace & /orders               │
│   ├── /contracts & /escrow    ├── /batches & /disputes                 │
│   ├── /trust & /ratings       ├── /storage & /logistics                │
│   └── /ai (Gemini 2.5 Voice & LightGBM/XGBoost Inference)              │
└────────────┬─────────────────────────────┬─────────────────────────────┘
             │                             │
┌────────────▼─────────────┐ ┌─────────────▼─────────────┐ ┌─────────────▼─────────────┐
│  POSTGRESQL DATABASE     │ │  EXTERNAL CLOUD APIS      │ │  ML & MODEL ASSETS        │
│  SQLAlchemy 2.0 ORM      │ │  • Google Gemini 2.5      │ │  • LightGBM Price Regr.   │
│  21 Alembic Migrations   │ │  • Brevo REST Email (:443)│ │  • XGBoost Demand Regr.   │
│  Relational Integrity    │ │  • Tavily Web Search API  │ │  • Scikit-learn Pipelines │
│                          │ │  • Open-Meteo Weather API │ │  • Joblib Model Binaries  │
└──────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

> For exhaustive architectural diagrams, sequence flows, and database catalogs, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📱 Mobile APK: Installation & Voice Hotline Guide

AgriDirect includes a production-compiled Android application built with a native hardware bridge.

### Installation Instructions
1. Download the APK file `6ab5872552b44d4b270d416a.apk` from the project repository to your Android phone.
2. Enable **Install from Unknown Sources** in your Android Security Settings.
3. Install and launch **AgriDirect**.
4. Grant the **Microphone Permission** (`RECORD_AUDIO`) when prompted.

### How the Voice Hotline Works on Android
- When you tap the **"Jarvis AI"** button on the bottom-right or in the navigation bar, the app opens the full-screen Voice Hotline Modal.
- The app checks for native speech recognition. If running inside the Android WebView where Web Speech is restricted, it seamlessly activates the **Native MediaRecorder fallback**.
- Tap the microphone button, speak your inquiry in your native language (e.g., *"ଟମାଟୋର ଆଜିର ମଣ୍ଡି ଦର କେତେ?"* or *"टमाटर का आज का भाव क्या है?"* or *"What is the best crop to sow this month?"*).
- Tap the button again to stop recording. Your audio is streamed to the backend, analyzed by Gemini 2.5 Flash, and Jarvis responds with spoken voice guidance and interactive recommendations!

---

## 🚀 Quickstart & Developer Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **Python:** v3.10, v3.11, or v3.12
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/manojbarik07/AgriDirect.git
cd "SIH PROJECT 2026"
```

### 2. Backend Setup & Run (FastAPI)
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install all dependencies (including python-multipart and ML packages)
pip install -r requirements.txt

# Run database migrations (or create local tables)
alembic upgrade head

# Start FastAPI server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend will be running at `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).*

### 3. Frontend Setup & Run (Vite + React)
```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install npm packages
npm install

# Start Vite development server on port 5173
npm run dev
```
*Frontend will be running at `http://localhost:5173`. Vite automatically proxies `/api/v1` requests to `http://127.0.0.1:8000`.*

---

## 🧪 Testing & Verification Suite

The repository maintains an automated test suite across all application layers:

```bash
# 1. Run all Backend tests (244 passing tests)
cd backend
source .venv/bin/activate
pytest tests/ -q

# 2. Run Backend lint check
ruff check app/

# 3. Run ML model validation tests (25 passing tests)
cd ../ml
pytest tests/ -q

# 4. Run Frontend unit tests (62 passing tests)
cd ../frontend
npx vitest run

# 5. Validate Frontend production build
npm run build
```

---

## 📂 Project Directory Structure

```
SIH PROJECT 2026/
├── frontend/                         # React 18 + Vite + TailwindCSS 4 SPA
│   ├── src/
│   │   ├── api/                      # Axios client with automatic backend URL detection
│   │   ├── components/               # Notion-inspired UI primitives & feature widgets
│   │   │   ├── ai/                   # Jarvis Voice Assistant & VoiceCallModal
│   │   │   ├── contracts/            # Smart contract viewers & signing dialogs
│   │   │   ├── escrow/               # Milestone payment release cards
│   │   │   ├── batches/              # QR-keyed batch traceability components
│   │   │   └── ui/                   # Reusable Buttons, Cards, Inputs, Modals, Badges
│   │   ├── contexts/                 # AuthContext, CartContext, AssistantContext
│   │   ├── i18n/                     # Translations in English, Hindi, and Odia
│   │   ├── layouts/                  # Unified DashboardLayout, Sidebar, Navbar
│   │   ├── pages/                    # Role-specific views (Farmer, Buyer, Admin, etc.)
│   │   └── routes/App.tsx            # Protected role-based route definitions
│   ├── vite.config.ts                # Dev server configuration & proxy to port 8000
│   └── package.json
│
├── backend/                          # FastAPI Backend Application
│   ├── app/
│   │   ├── api/router.py             # Main router aggregating 23 domain sub-routers
│   │   ├── core/                     # Configuration, JSON logging, rate limiting
│   │   ├── db/                       # SQLAlchemy declarative base, session manager
│   │   ├── integrations/             # Brevo REST API email, Payment gateway, KYC
│   │   └── modules/                  # Domain-driven feature packages
│   │       ├── ai/                   # Gemini 2.5 voice assistant & ML routers
│   │       ├── identity/             # Authentication, JWT tokens, OTP management
│   │       ├── marketplace/          # Public listings, search, and filtering
│   │       ├── orders/               # Negotiation engine & order state machine
│   │       ├── escrow/               # Milestone payment accounts & releases
│   │       ├── contracts/            # Cryptographic smart contracts
│   │       ├── batches/              # Seed-to-fork batch traceability & QR codes
│   │       ├── storage/              # Sell-now vs store-then-sell economics
│   │       ├── trust/                # 5-pillar mathematical trust engine
│   │       └── logistics/            # Route planning & shipment tracking
│   ├── migrations/                   # Alembic database migration versions
│   ├── tests/                        # 244 pytest unit and integration tests
│   ├── requirements.txt              # Production Python package manifest
│   └── main.py
│
├── ml/                               # Machine Learning Workspace
│   ├── train.py                      # Training scripts for LightGBM & XGBoost
│   ├── preprocessing.py              # Encoders and feature engineering pipelines
│   ├── models/                       # Exported .joblib serialized models
│   └── tests/                        # 25 ML validation tests
│
├── ARCHITECTURE.md                   # Complete architectural specification & diagrams
├── README.md                         # Project documentation and guide
└── 6ab5872552b44d4b270d416a.apk      # Compiled Android application package
```

---

## 👥 Hackathon Team & Acknowledgements

Developed with dedication for the **Smart India Hackathon (SIH 2026)** to empower India's agrarian community through trustworthy, accessible, and cutting-edge artificial intelligence.

*Designed with respect for India's farmers — the true backbone of our nation.* 🌾🇮🇳
