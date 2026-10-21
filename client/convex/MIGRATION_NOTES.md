# Express to Convex migration: gap report

Scope: every Express endpoint the client calls, the Convex function that replaces it, and the differences.
Client call sites were checked by grep. client/src is being edited in parallel, so line numbers may have moved.

## Endpoint map

| Express endpoint | Convex function | Status | Differences |
|---|---|---|---|
| GET /api/menu | `menu.getMenu({ availableOnly? })` | Covered | Returns a bare array, not `{success,data}`. Fields are camelCase and use `_id` / `sortOrder` / `imageUrl` / `isVeg` / `isAvailable`. Items are grouped by `categorySlug`. No `format=flat`. No "Other" group for uncategorised items. `availableOnly` was added in this change. |
| GET /api/menu/categories | `menu.getCategories()` | Covered | Returns `_id` and `sortOrder`, not `id` and `sort_order`. Returns a bare array. |
| POST /api/menu/categories | `menu.createCategory({ name, slug?, icon?, sortOrder? })` | Covered (validation added) | Returns the new `_id` (string), not the object. A duplicate slug returns the existing id instead of an error. Default sortOrder is count+1 (Express uses 0). |
| PUT /api/menu/:id | `menu.updateMenuItem({ id, ...optional fields })` | Covered (validation added) | `id` is a Convex id string. Express also accepts `category_id`, but updateMenuItem cannot move an item to another category yet. Gap. |
| PATCH /api/menu/:id/toggle | `menu.toggleAvailability({ id, isAvailable })` | Covered | Express requires the `:id/toggle` path. Client code using `/availability` has no Express route at all. |
| DELETE /api/menu/:id | `menu.deleteMenuItem({ id })` | Covered | Express returns 404 for a missing id. Convex `delete` on a missing id is a no-op. |
| POST /api/menu | `menu.createMenuItem({ categorySlug, name, description, price, imageUrl, images?, makingVideoUrl?, isVeg, isSpicy, isAvailable })` | Covered (validation added) | Express takes `category_id` or `categoryId` (numeric) and defaults most fields. Convex requires `categorySlug` and every flag. An unknown `categorySlug` now throws. |
| GET /api/orders?limit=N | `orders.getOrders({ limit? })` | Covered | Returns a bare array with `items` embedded, camelCase fields, and `createdAt` as ms. Express returns `{success,data}` with snake_case. |
| GET /api/orders?table=N&limit=N | `orders.getOrders({ tableNumber, limit? })` | Covered | `table` in Express maps to `tableNumber` in Convex. Uses the by_table index. |
| GET /api/orders?status=a,b | `orders.getOrders({ status })` | Covered (extended) | `status` now accepts a comma list. Filtering uses a scan with `take(limit)`. |
| POST /api/orders | `orders.createOrder({ tableNumber, items[], voiceStorageId?, voiceNoteUrl?, generalNote?, totalAmount? })` | Covered (validation added) | Returns `{ orderId, orderNumber, success }`, not the full order. Express accepts `table_number`, `table`, `menu_item_id`, `qty`, `note`, `general_note`, and base64 voice. Convex has no base64 path. Use generateUploadUrl then `voiceStorageId`. `totalAmount` is now optional and computed when omitted. Item `menuItemId` is now stored (it was dropped before). |
| GET /api/orders/:id | `orders.getOrderById({ orderId })` | Covered | Accepts an order number or a Convex id. The numeric SQLite id has no equivalent. |
| PATCH /api/orders/:id/status | `orders.updateOrderStatus({ orderId, status })` | Covered (validation added) | Argument is `orderId`, not `id`. Accepts a Convex id or an `ORD-` number. Invalid status and not-found now throw, matching Express 400 and 404. Still returns `true` on success, not the order. |
| POST /api/waiter/call | `waiter.createCall({ tableNumber, reason?, assignedEmployee*?, routingDetail? })` | Covered (extended) | `reason` defaults to "waiter". Returns `{ callId, success, data }`. `data` is additive. The assigned-employee fields are echoed but not stored, as in Express. |
| GET /api/waiter/calls | `waiter.getActiveCalls()` (new) or `waiter.getCalls({ status: "pending" })` | Covered (added) | Express returns pending calls only, newest first. `getActiveCalls` matches that. |
| PATCH /api/waiter/calls/:id/resolve | `waiter.resolveCall({ callId })` | Covered (validation added) | Argument is `callId`. Not-found now throws. Express requires a numeric id. |
| GET /api/stats | `stats.getStats()` (new) | Covered (added) | Same keys as `db.getRestaurantStats()`, snake_case: total_orders, total_revenue, today_orders, today_revenue, active_orders, active_waiter_calls, total_menu_items, available_menu_items, orders_by_status, popular_items. "Today" is the UTC day, as in SQLite `date('now')`. |

### Notes on the old Express routes

- **/api/stats does not exist in Express.** The only route is GET /api/orders/stats (orders.js). AdminDashboard.jsx fetches `/api/stats`, so `serverStats` stays null today. Convex `stats.getStats` fixes this. OverviewModule accepts the `stats` prop but does not read its fields.
- Express `POST /api/menu/upload` (media upload) has no Convex equivalent. Convex `orders.generateUploadUrl` covers voice notes only. The client does not call `/api/menu/upload` in the grep results.
- Express `/api/tables/*` (info, qr, batch-qr) and `/api/staff`, `/api/auth`, corrections, and settlements are outside this list. Convex has corrections, settlements, staff, and auth files already.

## Changed signatures (existing functions)

These were all additive or tightened. Existing callers still work unless they relied on the errors being swallowed.

- `menu.getMenu` now takes an optional `availableOnly`.
- `menu.createCategory` now throws on empty name. It also trims.
- `menu.createMenuItem` now throws on empty name, negative price, or unknown `categorySlug`.
- `menu.updateMenuItem` now throws on missing id, empty name, or negative price. Strings are trimmed.
- `orders.getOrders` now takes optional `limit`. `status` may be a comma list.
- `orders.createOrder` now takes an optional `totalAmount`. It validates `tableNumber` and `items`.
- `orders.updateOrderStatus` now throws on invalid status or missing order (it used to return `false`).
- `waiter.createCall` now takes an optional `reason` and returns `data` as well.
- `waiter.resolveCall` now throws on missing call (it used to return `false`).

Client callers using `useMutation` will see these as thrown errors. The current client wraps them in try/catch.

## Menu data status

| Source | Categories | Menu items |
|---|---|---|
| Express `server/restaurant.db` (read-only check) | 5 | 20 (4 orders) |
| Express `server/seed.js` definition | 5 | 20 |
| Convex deployment (`menu:getMenu`, read-only) | 5 | 8 |

Convex holds the older 8-item seed (Crispy Garlic Calamari, Artisan Bruschetta, and so on). Different dish names from Express. The Express DB has 20 different dishes.

`seed.js` `seedExpressMenu` is an internalMutation that inserts the Express menu only when `categories` AND `menuItems` are both empty. The deployment is not empty, so running it today does nothing. To load the Express menu into Convex, delete the existing 8 items and 5 categories first (through the dashboard or a new admin function), then run `npx convex run seed:seedExpressMenu`. This has not been done.

## Open gaps (not fixed here)

1. Convex `updateMenuItem` cannot change `categorySlug`. Express PUT can change `category_id`.
2. Numeric Express ids (from SQLite) do not map to Convex. Any client data still keyed by numeric id needs a Convex id or the order number.
3. Order numbers are `ORD-T{table}-{4 random digits}`. Collisions are possible but unlikely. Express uses 7 digits.
4. Express `createOrder` runs a DB transaction. Convex mutations are already atomic.
5. `getOrders` with a status filter scans instead of using the index when a table is also set. Fine at restaurant scale.
