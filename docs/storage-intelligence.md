# Storage Intelligence

The **Storage Intelligence** feature helps a farmer decide between selling immediately and
storing the crop for a number of days before selling — by comparing the two outcomes with the
expected (future) price, storage cost, expected post-harvest loss, and transaction cost.

Implemented in `backend/app/modules/storage/`.

## 1. Endpoints

| Method & Path | Auth | Description |
| --- | --- | --- |
| `GET /api/v1/storage/options` | none required here, intended for farmers | `?state=&district=` → demo facility directory |
| `POST /api/v1/storage/recommendation` | farmer flow | Comparison for one crop lot |

Both responses carry `is_demo: true` and a `disclaimer` — the facilities and costs are
synthetic demonstration data, and the price forecast is an AI estimate.

## 2. Recommendation request

```json
{
  "crop_name": "Rice",
  "state": "Odisha",
  "district": "Bhubaneswar",
  "quantity_kg": 500,
  "current_price_per_kg": 23,
  "predicted_price_per_kg": 26,
  "storage_days": 20,
  "expected_loss_rate_pct": 1.5,
  "transaction_cost_pct": 1.5
}
```

`predicted_price_per_kg` is **optional**. When omitted, the service calls the AI price engine
(`app.modules.ai.service.get_price_prediction`) and uses its forecast (labeled `AI forecast
(model v…)`).

## 3. Outcomes and breakeven

- **Sell now**: `estimated_revenue − transaction_cost = net_income`
- **Store then sell**: `estimated_revenue − storage_cost − lost_value − transaction_cost =
  net_income`, where `storage_cost = quantity × rate_per_kg_day × days` and
  `lost_value = loss_kg × predicted_price`.
- **Recommendation** is `STORE_THEN_SELL` when the stored net exceeds the sell-now net, else
  `SELL_NOW`, with a human-readable `recommendation_label` and `net_benefit_of_storing`.
- **Breakeven storage days** `d*` solves `store_net(d) = sell_now_net`:

  ```
  d* = [P_fut·(1 − tx − loss) − P_now·(1 − tx)] / rate_per_kg_day
  ```

  returned as `null` when no positive breakeven exists.

- **Confidence** is derived from how strongly the price gap favours one option
  (`0.55` base, capped at `0.95`).
- Default storage rate is `₹0.04/kg/day`; the demo facility directory shows facility-specific
  rates.

## 4. Frontend

- `frontend/src/api/storage.ts` — typed client.
- `frontend/src/pages/farmer/FarmerStoragePage.tsx` — `/farmer/storage`: crop-lot form,
  SELL NOW vs STORE THEN SELL side-by-side cards, breakeven, reasoning, and the demo facility
  directory.
- Entry points: farmer navigation "Operations → Storage Intel" and recommendations links.

## 5. Shortcomings (demo scope)

Facilities are static demo rows; there is no per-facility inventory or booking. Real
deployments need a storage-provider marketplace, inventory, and quoted rates per facility.