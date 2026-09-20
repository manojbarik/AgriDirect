# Phase 7 — Farmer-Buyer Marketplace

This phase implements the core public farmer-buyer marketplace without AI matching. It connects farmer listings with buyer search, filtering, sorting, pagination, listing detail views, public farmer profiles, and buyer demand requests.

## Capabilities Delivered

### Farmer Capabilities
- **Add crop / crop plan:** Crop plans link farms to items in the public crop catalog (`/api/v1/marketplace/crops`).
- **Create listing:** Farmers specify title, description, grade/quality, unit, available quantity, unit price, currency, and availability/harvest dates (`POST /farmer/listings`). Starts as `DRAFT`.
- **Edit listing:** Farmers update any listing attributes via `PUT /farmer/listings/{id}`.
- **Pause listing:** Farmers pause published listings via `PUT /farmer/listings/{id}/pause`.
- **Delete listing:** Farmers permanently remove non-published listings (`DELETE /farmer/listings/{id}`) provided there is no existing order history. Published listings must be paused or cancelled first.
- **Specify quantity, expected price, location, harvest date, quality/grade:** Fully integrated into listing creation and editing forms.

### Buyer Capabilities
- **Browse crops & catalog:** View public crop catalog and search available produce.
- **Search:** Case-insensitive search across title, description, crop name, crop variety, and farmer name (`GET /marketplace/listings?q=...`).
- **Filter:** Filter by crop category, state, district, crop ID, grade (`Grade A`, `Grade B`, `Grade C`), and min/max unit price.
- **Sort:** Order results by `newest`, `price_asc`, `price_desc`, `quantity_desc`, `harvest_date`, and `state`.
- **View crop listing details:** Full page view (`/marketplace/listings/:id`) with crop specs, availability window, price, quantity, grade, location, and farmer info.
- **View public farmer profile:** View farmer's public profile (`/marketplace/farmers/:farmerId`), listing counts, farm locations, trust score/band, and average rating.
- **Create demand request:** Create demand requests directly from the buyer tools (`/buyer/demands`) or prefilled from a listing detail page (`/buyer/demands?crop_id=...`). Buyers can also view, update, filter by status, or cancel demands (`DELETE /buyer/demands/{id}`).

## New & Enhanced Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/marketplace/listings` | Public | Search published listings with filters, sorting (`newest`, `price_asc`, `price_desc`, `quantity_desc`, `harvest_date`, `state`), and pagination (`page`, `page_size`, `total`, `pages`). |
| GET | `/api/v1/marketplace/listings/{id}` | Public | Detailed view of a published listing with farmer and farm context. |
| GET | `/api/v1/marketplace/farmers/{id}` | Public | Public profile of a farmer showing farms, active listings count, trust score/band, and rating. |
| GET | `/api/v1/marketplace/locations` | Public | Returns distinct states and districts with active published listings. |
| GET | `/api/v1/marketplace/crops` | Public | Lists crop catalog with optional search filter (`?q=`). |
| DELETE | `/api/v1/farmer/listings/{id}` | FARMER | Permanently delete a listing (409 if published or has order history). |
| GET | `/api/v1/buyer/demands` | BUYER | List own buyer demands with optional `?status=` filter. |
| GET | `/api/v1/buyer/demands/{id}` | BUYER | View single demand request. |
| PUT | `/api/v1/buyer/demands/{id}` | BUYER | Update demand fields. |
| DELETE | `/api/v1/buyer/demands/{id}` | BUYER | Cancel demand request (`CANCELLED`). |

## Frontend Pages Added / Updated

1. **Marketplace Browse Page (`/marketplace`):** Search bar, category filter, state filter, grade filter, price range inputs, sort dropdown, responsive card grid, and pagination controls.
2. **Listing Detail Page (`/marketplace/listings/:id`):** Crop specifications, harvest window, location, price, seller info, and "Request this crop" button (prefills buyer demand form).
3. **Farmer Profile Page (`/marketplace/farmers/:farmerId`):** Public farmer view with trust score/band, rating average, active listing count, and list of farms with acreages/locations.
4. **Farmer Listings Page (`/farmer/listings`):** Updated with Edit form modal (description, grade, harvest dates), Delete modal confirmation, and Create form quality/harvest date fields.
5. **Buyer Demands Page (`/buyer/demands`):** Prefills crop selection via URL query parameter (`?crop_id=...`), supports status filtering (`DRAFT`, `CANCELLED`, `All`), and includes Cancel action.

## Testing & Quality Gate

- **Backend:** 65 tests passing (`pytest`), `ruff check` clean, `compileall` OK, `alembic upgrade head --sql` OK.
  - Public search with text `q` across titles, crop names, farmer names.
  - Filter matrix (category, state, grade, price range, crop ID).
  - Sorting (`price_asc`, `price_desc`, `newest`, `quantity_desc`, `harvest_date`).
  - Pagination (`page`, `page_size`, `total`, `pages`).
  - Listing detail 200 / 404.
  - Public farmer profile 200 / 404.
  - Farmer listing delete guard (409 if published, 204 if paused/draft).
  - Buyer demand CRUD (detail, update, status filter, cancel, 409 re-cancel).
- **Frontend:** `npm run lint` clean (ESLint), `npm run build` clean (`tsc -b && vite build` output 102 modules).

## Deferred to Phase 8

- AI-powered matching algorithms (rule-based score, vector/semantic similarity, crop/location compatibility).
- Direct order placement / transaction checkout (Phase 9/10).