# Market Prices & Intelligence

The public **Market Prices** page (`/prices`) gives price discovery without login: expected
price for a crop, expected range, confidence, a 5-day projected trend, and nearby-market
context — all clearly labeled as demonstration/AI estimates.

## 1. Backing API (public, no auth)

| Method & Path | Description |
| --- | --- |
| `GET /api/v1/ai/public/price-preview` | `?crop=&state=&district=` → `{crop_name, predicted_price, currency, unit, price_range_min, price_range_max, confidence_score, best_model_name, model_version, is_synthetic, disclaimer, estimated_at}` |
| `GET /api/v1/ai/public/crops` | List of crop names available for the public preview |

These reuse the trained `price_prediction_model.joblib` served by the AI module, but with an
anonymous rate limit (60/min/IP, bucket `ai`). All outputs remain marked `is_synthetic`.

## 2. Frontend

- `frontend/src/pages/PriceIntelligencePage.tsx` — public route `/prices`, light/professional
  styling:
  - Crop selector (from `/ai/public/crops`) + state/district inputs.
  - Stat cards: expected price, range, confidence bar, recommended window.
  - AI recommendation callout with the confidence band.
  - 5-day projected trend (Recharts bar/line chart, labeled synthetic projection).
  - Nearby-market context cards (demo, marked as such).
- Navbar links "Market Prices" in desktop and mobile menus.

## 3. Branding & honesty

The page keeps the "AgriDirect" branding. Every AI number is labeled an estimate and can't be
confused with official mandi prices. A separate, authenticated farmer view adds storage
decision support at `/farmer/storage` — see [storage-intelligence.md](storage-intelligence.md).

## 4. Shortcomings (demo scope)

The 5-day trend is a simple synthetic projection derived from the single-point prediction.
Nearby markets are static demo rows. Production would stream real mandi price feeds and use a
time-series forecast.