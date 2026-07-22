# Subscription V2 - Session Resume

> Quick reference for picking up where we left off.

## Current state (as of 2026-05-10)

Building **subscription V2** as a parallel implementation to the existing Recurly-based flow. Old flow stays untouched until V2 proves out.

### Backend project location

`D:\Git Projects\janya-controller-api\JanyaApi\` - .NET API in a separate repo. Edit permission granted for these 4 files only:

- `Models\Subscription.cs`
- `Interface\ISubscriptionRepository.cs`
- `Reprository\SubscriptionRepository.cs` (note typo "Reprository")
- `Controllers\SubscriptionController.cs`

Read-only files (already inspected): `Model\DbHelper.cs`, `Response.cs`.

---

## Completed

### Admin slices 1-3 (all shipped, working end-to-end)

- **Plans CRUD** - list/get/create/update/toggle-status. Routes at `/admin/plans`.
- **Gateways CRUD** - same five operations, `/admin/gateways`.
- **Plan-Gateway Mappings** - full CRUD inside Plan edit page > Pricing tab.
- **Quotas** - upsert via Plan edit page > Quotas tab.
- All 8 backend endpoints under `v1/subscription/...` shipped, FE Admin Console working at `/admin/*` with its own sidebar layout.

### Consumer backend endpoints (slice 4 - shipped)

4 BE endpoints implemented in this session:

1. `GET /v1/subscription/me` - current user's active/trialing/grace-period subscription joined with plan + quota
2. `POST /v1/subscription/trial` - claim a 7-day trial. Atomic dual-insert into `UserSubscriptions` + `UserSubscriptionHistory`. Rejects if user already trialing/active or already claimed trial.
3. `GET /v1/subscription/plans/public?country=&currency=` - one mapping per plan (deduped via `ROW_NUMBER`), filtered by country/currency, joined with quota.
4. `GET /v1/subscription/me/history?pagesize=&pagenum=` - paginated `UserSubscriptionHistory` for current user.

### Consumer frontend - partial

- `src/types/subscriptionV2.ts` - `PublicPlan`, `SubscriptionApiResponse<T>`
- `src/lib/subscriptionV2Api.ts` - `getPublicPlans` with `callApi` error-unwrap helper
- `src/features/subscriptionV2/usePublicPlans.ts` - hook
- `src/pages/SubscriptionV2Page.tsx` - pricing display page with country picker (auto-detects from `navigator.language`), responsive grid, Most-Popular badge for the middle card when 3 plans exist.
- Route `/subscription-v2` wired in `App.tsx` inside `ProtectedRoute`.

---

## NEXT (in priority order)

1. **Wire the "Start Free Trial" CTA** on `SubscriptionV2Page` -> `POST /v1/subscription/trial`. Confirm dialog + toast. Disable button if user already has subscription (need GET /me).
2. **Replace `SubscriptionContext`** to call new `GET /v1/subscription/me` instead of Recurly endpoint. Drop hardcoded `src/lib/planLimits.ts` - quotas come from API.
3. **"Current plan" badge** on V2 cards - mark the user's current plan card differently, swap CTA to "Current Plan" / "Manage".
4. **Billing history page** - new route consuming `GET /v1/subscription/me/history`.
5. **Bind quota gating to features** - update `useEvents.ts`, `SocialPublishPanel.tsx`, `MediaPublishModal.tsx` to read from new context.

---

## Deferred (waiting on payment provider integration)

- `POST /v1/subscription/checkout` - gateway-specific payment init
- `POST /v1/subscription/webhook/{gatewayCode}` - gateway webhook receiver
- `POST /v1/subscription/cancel` - cancel current subscription via gateway API

---

## Database tables (all created)

- `SubscriptionPlans`, `SubscriptionGateways`, `SubscriptionPlanGatewayMappings`, `SubscriptionQuotas` (admin-config)
- `UserSubscriptions` - 12 columns. Status: `'trialing' | 'active' | 'cancelled'` only (no past_due/expired/paused for V1).
- `UserSubscriptionHistory` - 13 columns, EventType: `TRIAL_STARTED | PAYMENT_INITIATED | PAYMENT_SUCCESS | PAYMENT_FAILED | CANCELLED`. Has filtered unique idempotency index on `(GatewayTransactionId, EventType) WHERE GatewayTransactionId IS NOT NULL`.

---

## Established conventions

- **`SafeDbValue()` no surrounding quotes** - DbHelper self-quotes strings, returns `1`/`0` for bools, `null` literal for nulls, raw for numbers
- **No `dbo.` prefix** in SQL table names
- **`SELECT *` when all columns needed** - explicit columns only for joined reads or column-renames
- **`IN()` over `OR` chains** in CHECK constraints
- **`'cancelled'` (UK spelling)** for status everywhere - `CancelledAt` column, `CANCELLED` event type
- **Lean envelope** for create endpoints: `{code:1, Message:"Success", id:0, planId/gatewayId/mappingId/subscriptionId}` instead of full data. ID returned in domain-named field, not `id` (which the existing Janya envelope uses for status indicators).
- **Error logs only in catch** - no `_log.Information(...)` calls per user directive
- **Body for state mutations** - even single-bool toggles use body, not query (consistent with PATCH semantics, future-proofs for additional fields)
- **DbHelper return types**: `QueryType.Select` returns JSON string or `"[]"`. `QueryType.Insert` with `returnId=true` uses `ExecuteScalarAsync` and returns the OUTPUT'd ID as `long?`. Cast `dynamic` to `string` explicitly when LINQ-style ops are needed.

---

## Open items / things to verify

- **`GetPlanByIdAsync` returns `Ok` with no data when plan not found** - subtle UX issue when user navigates to `/admin/plans/9999`. Could tighten to 404 if desired.
- **`Amout` typo** was renamed to `Amount` in DB and code - confirmed in current SQL queries.
- **`JsonStringEnumConverter` for `BillingCycle`** - assumed to be registered. Verify if returns of `BillingCycle: "MONTHLY"` (string) vs `0` (int) in API responses.

---

## Resume command

Tomorrow, just say: *"check session resume, what were we doing?"* or *"continue subscription V2 work"* and Claude will pick up from the NEXT list above.
