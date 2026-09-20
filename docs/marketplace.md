# Marketplace

The public marketplace is the discovery layer: farmers publish supply (listings), buyers
publish purchase intent (demands), and the platform matches, filters, searches, and ranks
both sides. It also feeds the AI matching engine.

## 1. Actors and Assets

| Asset | Owned by | Public visibility |
| --- | --- | --- |
| `crops` catalog | system (seeded) | all crops, varieties, categories, default unit |
| `crop_listings` | farmer | **published** listings only (draft/paused/cancelled are private) |
| `buyer_demands` | buyer | used privately by buyer + AI matching |
| farms / crop plans | farmer | summarized on farmer profile page |

## 2. Public endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /marketplace/crops` | Catalog, optional search `q` |
| `GET /marketplace/locations` | Facet list: states/districts with ≥1 published listing |
| `GET /marketplace/listings` | Search + filter + sort + paginate published listings |
| `GET /marketplace/listings/{id}` | Listing detail incl. farmer summary (trust band, location) |
| `GET /marketplace/farmers/{id}` | Public farmer profile page |

## 3. Listing lifecycle (Farmer)

```
DRAFT  →  PUBLISHED  →  PAUSED  →  PUBLISHED …
   └──────────────────> CANCELLED (soft delete)
```

- `POST /farmer/listings` creates a listing (draft). `PUT .../publish` exposes it.
- `available_quantity`, `unit_price`, `grade`, availability window drive search facets.
- Only `PUBLISHED` appears on the public marketplace and in matching.

## 4. Search & Ranking

`GET /marketplace/listings` parameters (binding examples):

| Param | Meaning |
| --- | --- |
| `q` | full-text-ish filter over crop/title/description |
| `crop_name` / `category` / `grade` | catalog filters |
| `state`, `district` | location facets |
| `min_price`, `max_price` | price band on `unit_price` |
| `sort` | `newest` / `price_asc` / `price_desc` / `relevance` |
| `limit`, `offset` | bounded pagination |

Responses are page envelopes: `{items, total, limit, offset}`.

## 5. AI entry points

- `POST /ai/match/farmers` — rank listings/farms against a buyer request (see
  [ai-matching.md](ai-matching.md)).
- `POST /ai/match/buyers` — rank demands against a farmer's listing.
- `POST /ai/price-prediction` / `POST /ai/demand-prediction` — ML forecasts that inform
  listing/demand pricing and quantity (see `ml-price-prediction.md`, `ml-demand-prediction.md`).

## 6. Verification gating

- Farmer listings are only matchable/sellable once the farmer profile is verified.
- Buyer demands feed matching; buyer payment-method verification is required before paying.
- Both are reviewed by ADMIN (see [api.md](api.md) `/admin/*`).

## 7. Trust signals on the marketplace

- Public farmer profile surfaces the farmer's **trust score band** plus location/status, so
  buyers can see an explainable reliability signal before engaging
  (see [trust-score.md](trust-score.md)).