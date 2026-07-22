# Subscription Feature Gating & Dashboard - Implementation Plan

## Context

Enforce plan-based feature limits across the app and provide a unified subscription dashboard for usage tracking and plan management.

**Key insight**: Publishing comes from two sources with separate quotas:
- **Studio publishing** (Go Live from events/studio) consumes **Meeting Hours**
- **MAM VOD-to-Live publishing** (streaming recorded assets from MAM) consumes **MAM Publishing Hours** (separate pool)
- **MAM uploads** consume **Upload Count**
- **Platform selection** (2/4/6 simultaneous) applies to both studio and MAM as a UI disable

## Quota System (per plan, per billing cycle)

| Plan | Meeting Hours | MAM Publishing Hours | Uploads/month | Platform Limit |
|---|---|---|---|---|
| Starter (`pcr-starter-30h`) | 30h | 30h | 30 | 2 |
| Professional (`pcr-professional-60h`) | 60h | 60h | 60 | 4 |
| Enterprise (`pcr-enterprise-90h`) | 90h | 90h | 90 | 6 |

Usage resets per **billing cycle** (subscription's `current_term_started_at` → `current_term_ends_at`).

## Features to Gate

### 1. Studio Publishing (Go Live from studio page)
- **Trigger**: User creates event OR publishes to live from studio
- **Quota**: Meeting Hours
- **Consumed**: Scheduled event duration = `(event.endDateTime - event.startDateTime) / 3600` hours
- **Gating**: Block at BOTH event creation AND publish time if insufficient hours
- **Modal**: "You've used X of Y meeting hours this period (resets [date]). Upgrade for more." + CTA to `/subscription`

### 2. MAM VOD-to-Live Publishing (stream recorded asset live)
- **Trigger**: User publishes VOD asset to live from MAM/Assets page
- **Quota**: MAM Publishing Hours (30/60/90 - separate from meeting hours)
- **Consumed**: Stream duration = `publishHistory.endTime - publishHistory.startTime`
- **Gating**: Block before publish if available publishing hours < estimated duration
- **Modal**: "You've used X of Y publishing hours this period (resets [date]). Upgrade for more." + CTA to `/subscription`

### 3. MAM Upload (upload/ingest asset into MAM)
- **Trigger**: User uploads asset to MAM
- **Quota**: Upload Count (30/60/90 per billing cycle)
- **Consumed**: 1 upload = 1 count
- **Gating**: Block before upload if upload count at limit (e.g., 30/30)
- **Modal**: "You've used X of Y uploads this period (resets [date]). Upgrade for more." + CTA to `/subscription`

### 4. Platform Selection (2/4/6 simultaneous platforms)
- **Applies to**: Both studio publishing AND MAM publishing
- **Gating**: UI disable only (no modal)
- **Behavior**: Disable/hide 3rd+ platform selector buttons based on plan limit

**Modal style**: UpgradeModal component with variant for each type
- Shows current usage vs limit
- Shows billing period reset date
- CTA: "View Plans →" navigates to `/subscription`

---

## Architecture

### Global Subscription Context

Create `src/features/subscription/SubscriptionContext.tsx`:
- Wraps authenticated app (inside `ProtectedRoute`)
- On mount: fetches `v1/recurly/subscription/{gatewayId}` and `v1/recurly/subscriptionplans?product=pcr`
- `gatewayId` = `${channelName}_${channelId}` from storage
- Exposes:
  - `isSubscribed: boolean`
  - `activePlanCode: string | null`
  - `planLimits: { maxPlatforms: number; maxUploads: number; maxMeetingHours: number; maxPublishingHours: number } | null`
  - `billingPeriodStart: Date | null`
  - `billingPeriodEnd: Date | null`

Create `src/features/subscription/useSubscription.ts`:
- Simple `useContext(SubscriptionContext)` wrapper

### Publishing Type Identification

**Studio Publishing** (Go Live from studio):
- `inputType: 'live'`
- Consumed: Meeting Hours quota

**MAM VOD-to-Live Publishing** (stream asset live from MAM):
- `inputType: 'vod'` AND `outputMode: 'rtmp'`
- Consumed: MAM Publishing Hours quota

**MAM Upload** (ingest asset into MAM):
- `inputType: 'vod upload'` OR `outputMode: 'vod upload'`
- Consumed: Upload Count quota

### Usage Hooks (lazy, fetched by each feature)

**`useMeetingHoursUsage()`** (`src/features/subscription/useMeetingHoursUsage.ts`):
- Fetch events API (`v2/ProducerEvent/producerEventPlaylist`) for billing period
- Sum scheduled hours: `(event.endDateTime - event.startDateTime) / 3600` for all events in billing period
- **Note**: Uses scheduled duration from `startDateTime` and `endDateTime` (Unix timestamps from API response)
- Returns `{ hoursUsed: number; limit: number; isAtLimit: boolean; canCreateHours: (hours: number) => boolean; loading: boolean }`

**`useUploadUsage()`** (`src/features/subscription/useUploadUsage.ts`):
- Fetch publish history with billing period filter
- Count records where `inputType.toLowerCase() === 'vod upload'` OR `outputMode.toLowerCase().includes('vod upload')`
- Returns `{ used: number; limit: number; isAtLimit: boolean; loading: boolean }`

**`useMamPublishingHoursUsage()`** (`src/features/subscription/useMamPublishingHoursUsage.ts`):
- Fetch publish history with billing period filter
- Sum hours for records where `inputType === 'vod'` AND `outputMode === 'rtmp'`
- Calculate: `(record.endTime - record.startTime) / 3600` (from publishHistory.startTime and endTime)
- Returns `{ hoursUsed: number; limit: number; isAtLimit: boolean; canPublishHours: (hours: number) => boolean; loading: boolean }`

---

## Files to Create

| File | Purpose |
|---|---|
| `src/features/subscription/SubscriptionContext.tsx` | Global subscription context + provider |
| `src/features/subscription/useSubscription.ts` | Context consumer hook |
| `src/features/subscription/useMeetingHoursUsage.ts` | Studio meeting hours quota hook |
| `src/features/subscription/useUploadUsage.ts` | MAM upload count quota hook |
| `src/features/subscription/useMamPublishingHoursUsage.ts` | MAM publishing hours quota hook |
| `src/components/ui/UpgradeModal.tsx` | Gating modal (insufficient quota warning) |
| `src/components/ui/UsageCard.tsx` | Reusable quota progress card component |
| `src/pages/SubscriptionPage.tsx` | Dashboard page (replaces SubscriptionPlansPage) |

## Files to Modify

| File | Change |
|---|---|
| `src/components/ProtectedRoute.tsx` | Wrap outlet with `<SubscriptionProvider>` |
| `src/App.tsx` | Change route from `/subscription-plans` to `/subscription` (points to SubscriptionPage) |
| `src/pages/SubscriptionPlansPage.tsx` | **DELETE** (replaced by SubscriptionPage.tsx) |
| `src/features/events/useEvents.ts` | Gate event creation/save: check `useMeetingHoursUsage().canCreateHours(duration)` before saving new events |
| `src/features/studio/SocialPublishPanel.tsx` | Gate publish: check `useMeetingHoursUsage()` before calling `batchGoLive()` |
| `src/features/assets/MediaPublishModal.tsx` | Gate upload: check `useUploadUsage()` before upload; Gate VOD-to-Live: check `useMamPublishingHoursUsage()` |
| Studio/MAM platform selector | Disable 3rd+ platform buttons based on `planLimits.maxPlatforms` |

---

## Subscription Dashboard Page (SubscriptionPage.tsx)

Replaces `SubscriptionPlansPage` at route `/subscription`.

### No Active Subscription State
Display:
- Hero message: "Start publishing with PCR"
- Grid of 3 plan cards (Starter, Professional, Enterprise)
- Each card: name, price, features, "Subscribe" CTA → Recurly checkout

### Active Subscription State
Display top section:
- Current plan badge (e.g., "Professional Plan")
- Billing period: "Jan 5 - Feb 4"
- "Cancel Subscription" button → confirm modal → API call to cancel

Display usage dashboard (3 cards):
1. **Meeting Hours Card** (UsageCard component)
   - Progress bar + percentage
   - "X / Y hours used this period"
   - Billing period dates
   - Status: "On track" / "Approaching limit" / "Limit reached"

2. **MAM Publishing Hours Card**
   - Progress bar + percentage
   - "X / Y hours used this period"
   - Billing period dates
   - Status indicator

3. **Uploads Card**
   - Progress bar + percentage
   - "X / Y uploads used this period"
   - Billing period dates
   - Status indicator

Display bottom section:
- "Explore Plans" button → scrolls to OR opens plan cards
- 3 plan cards (same as no-subscription state, current plan highlighted)
- Each card: "Current Plan" or "Upgrade" button

---

## UpgradeModal Design

Shows when user attempts gated action without sufficient quota.

```
┌─────────────────────────────────────────┐
│  🔒  Limit Reached               [X]    │
│                                         │
│  You've used 30 of 30 uploads this      │
│  billing period (resets Jan 5).         │
│                                         │
│  Upgrade to increase your limits.       │
│                                         │
│         [Close]  [View Plans →]         │
└─────────────────────────────────────────┘
```

- Uses `@radix-ui/react-dialog`
- "View Plans →" navigates to `/subscription`
- Shows: feature type, current usage, limit, reset date

---

## Verification Plan

1. **Dashboard - No subscription**: Verify plan cards display; "Subscribe" CTA works
2. **Dashboard - Active subscription**: Verify usage cards show correct X/Y values; billing period dates correct; "Cancel" button works
3. **Meeting hours gating (Studio)**:
   - Verify event creation blocks if insufficient meeting hours
   - Verify publish blocks if insufficient meeting hours
   - Modal shows correct usage X/Y and reset date
4. **MAM publishing hours gating**:
   - Verify VOD-to-Live publish blocks if insufficient publishing hours
   - Modal shows correct usage X/Y and reset date
5. **Upload gating**:
   - Verify upload blocks if at limit
   - Modal shows correct usage X/Y and reset date
6. **Platform selection**:
   - With Starter (2 platforms), verify 3rd platform selector disabled
   - With Professional (4 platforms), verify 5th disabled, etc.
7. **Modal CTAs**: "View Plans →" navigates to `/subscription`
8. **Billing period**: Verify reset dates are correct for all usage cards

---

## Implementation Status

### ✅ COMPLETED & PRODUCTION-READY

**Subscription Infrastructure (100%)**
- ✅ `SubscriptionContext.tsx` — Global subscription state provider with plan limits
- ✅ `useSubscription.ts` — Context consumer hook
- ✅ `useMeetingHoursUsage.ts` — Fetches events, sums scheduled duration
- ✅ `useMamPublishingHoursUsage.ts` — Fetches publish history for VOD-to-Live
- ✅ `useUploadUsage.ts` — Counts MAM upload records
- ✅ `UsageCard.tsx` — Progress indicator with status colors
- ✅ `UpgradeModal.tsx` — Quota-exceeded modal with "View Plans" CTA
- ✅ `SubscriptionPage.tsx` — Dashboard with usage cards + plan comparison
- ✅ App.tsx routing — `/subscription` endpoint live
- ✅ ProtectedRoute wrapper — SubscriptionProvider enabled

**Studio Go Live Publishing Gating (100%)**
- ✅ `SocialPublishPanel.tsx` integrated with `useMeetingHoursUsage`
- ✅ Quota check in `batchGoLive()` — blocks if at limit
- ✅ Low-quota warning — logs alert if < 10% hours remaining
- ✅ User feedback — UpgradeModal shows reset date + "View Plans" CTA
- ✅ Message logging — blocks with "meeting hours limit reached" warning

**How it works:**
1. User clicks "Go Live" in studio with multiple platforms selected
2. System checks: do they have meeting hours available?
3. If at/over limit → show UpgradeModal, prevent publish
4. If < 10% hours left → log warning in studio message log
5. If ok → proceed with publish to all selected platforms

**Event Creation Gating (100%)**
- ✅ `useEvents.ts` — `checkEventQuota()` helper function
- ✅ `EventForm.tsx` — Accepts quota props, shows UpgradeModal
- ✅ `EventModal.tsx` — Passes quota props to EventForm
- ✅ `EventsCalendar.tsx` — Wired quota hooks, passes to EventModal

**MAM Upload & Publish-to-Live Gating (100%)**
- ✅ `MediaPublishModal.tsx` — Integrated with `useUploadUsage` + `useMamPublishingHoursUsage`
- ✅ Upload gating — blocks if upload count at limit
- ✅ Publish-to-Live gating — blocks if publishing hours at limit
- ✅ UpgradeModal feedback with correct reset dates

**Platform Selection Limits (100%)**
- ✅ `SocialPublishPanel.tsx` — Platform selector disabled for 3rd+ channels
- ✅ Logic: disable if (ineligible OR (atPlatformLimit AND notSelected))
- ✅ Users can deselect but can't add beyond plan limit (2/4/6)

---

## Resolved Items

1. ✅ **Publish history record type identification**: 
   - Studio: `inputType: 'live'` → Meeting Hours
   - MAM VOD-to-Live: `inputType: 'vod'` AND `outputMode: 'rtmp'` → Publishing Hours
   - MAM Upload: `inputType: 'vod upload'` OR `outputMode: 'vod upload'` → Upload Count

2. ✅ **Meeting hours calculation**: Use scheduled duration from event API response
   - Fields: `event.startDateTime` and `event.endDateTime` (Unix timestamps)
   - Formula: `(endDateTime - startDateTime) / 3600` = hours
   - Source: `v2/ProducerEvent/producerEventPlaylist` API

3. ✅ **Stream duration**: Use `publishHistory.endTime - publishHistory.startTime` (already available)

4. ✅ **Dashboard page**: Replaces SubscriptionPlansPage at `/subscription` route

5. ✅ **Platform selection**: UI disable (3rd+ buttons disabled) on both studio and MAM

## Implementation Notes

### Meeting Hours Calculation
- **Current approach**: Use scheduled duration from event API response
- **Fields used**: `event.startDateTime` and `event.endDateTime` (Unix timestamps in seconds)
- **Calculation**: `(endDateTime - startDateTime) / 3600` = hours scheduled
- **API endpoint**: `v2/ProducerEvent/producerEventPlaylist`

### Future Enhancement (if needed)
- Backend may provide actual session duration field (e.g., `sessionDuration`, `actualDuration`)
- When available, could track actual broadcast time consumed instead of scheduled time
- For now, scheduled duration ensures users can't schedule events beyond their quota
