# PCR 3.0 — Automation Testing Plan

## Stack

| Layer | Tool |
|-------|------|
| Unit + Integration | Vitest 4 + React Testing Library |
| Network mocking | MSW (Phase 2) |
| E2E | Playwright (Phase 3) |
| CI | GitLab CI (Phase 4) |

---

## Phase 1 — Unit Test Coverage

**Goal:** Cover all business-critical lib functions and key UI components with unit tests. Enforce minimum coverage thresholds.

### Scope

| Area | Target Files | Status |
|------|-------------|--------|
| `src/lib/` | `http.ts`, `studioConfig.ts`, `publishHistoryService.ts`, `storage.ts`, `authService.ts`, `s3Service.ts`, `utils.ts` | Done - maintain |
| `src/features/events/` | `eventUtils.ts`, `EventDetail.tsx`, `EventForm.tsx` | Done - maintain |
| `src/features/studio/` | `DestinationModal`, `GfxMultiSelect`, `GfxPanel`, `MeetingUrlPanel`, `MessageLog`, `MonitorArea`, `VideoPlayerPopup` | Done - maintain |
| `src/features/studio/` | `QButtonRow`, `QButtonTable`, `SourceSlotRow`, `SourcesSidebar` | Done - maintain |
| `src/components/` | `ProtectedRoute.tsx`, `ui/ConfirmDialog.tsx` | Done - maintain |
| `src/pages/` | `GfxPage.tsx` | Done - maintain |
| `src/pages/` | `LoginPage.tsx`, `CallbackPage.tsx`, `LandingPage.tsx` | Not started - High |
| `src/pages/` | `EventsPage.tsx`, `PublishHistoryPage.tsx`, `PublishPage.tsx` | Not started - High |
| `src/pages/` | `StudioPage.tsx`, `VideoEditorPage.tsx`, `LayoutBuilderPage.tsx` | Not started - Medium |
| `src/pages/` | `AssetsPage.tsx`, `MultiviewerPage.tsx`, `SubscriptionPlansPage.tsx`, `NotFoundPage.tsx` | Not started - Low |

### Coverage Thresholds (enforced in vite.config.ts)

```
lines:      80%
functions:  80%
branches:   75%
statements: 80%
```

### Deliverables

- [x] `src/lib/__tests__/http.test.ts` — 30 tests
- [x] `src/lib/__tests__/studioConfig.test.ts` — 46 tests
- [x] `src/lib/__tests__/publishHistoryService.test.ts` — 59 tests
- [x] `vite.config.ts` — add 3 new files to coverage include + thresholds (thresholds enforced on lib files only; component thresholds deferred until test coverage improves)
- [x] Fix failing tests in `QButtonRow`, `QButtonTable`, `SourceSlotRow`, `SourcesSidebar`
- [x] Fix failing tests in `GfxPage`
- [ ] Add tests for untested pages (priority order above)

---

## Phase 2 — Integration Tests (MSW)

**Goal:** Test full feature flows within the React tree with HTTP mocked at the network layer.

### Setup
- Install `msw` as a devDependency
- Create `src/mocks/handlers.ts` — request handlers per feature
- Create `src/mocks/server.ts` — MSW Node server for tests
- Add `server.listen/resetHandlers/close` lifecycle to `test-setup.ts`

### Scenarios

| Flow | Components Involved |
|------|-------------------|
| Login flow | `LoginPage` → `authService` → redirect to `state.from` |
| Event list fetch + render | `EventsPage` → `EventCard` list |
| Create event | `EventForm` → confirm dialog → list refresh |
| Workspace switch | `WorkspacePicker` → session update → page reload |
| Publish history load | `PublishHistoryPage` → table render with real data shape |
| Go live navigation | `EventDetail` → studio navigation guard |

---

## Phase 3 — E2E Tests (Playwright)

**Goal:** Test critical user journeys in a real browser against a running dev server.

### Setup
- Install `@playwright/test`
- Create `playwright.config.ts` at project root
- Create `e2e/` folder alongside `src/`

### Critical Flows

| Journey | Steps |
|---------|-------|
| Authentication | Login → redirect to originally requested page |
| Event lifecycle | Create → edit → delete with confirm dialog |
| Studio go-live | Event detail → GO LIVE → studio page loads |
| GFX management | Load bands → toggle on/off → edit content |
| Video editor | Mark in/out → export clip |
| Publish to social | Select platform → fill credentials → publish |

### Test IDs
All elements have `id` attributes per project rules — use `page.locator('#element-id')` for stable selectors.

---

## Phase 4 — CI Pipeline (GitLab CI)

**Goal:** Block merges when tests fail or coverage drops below threshold.

### Pipeline Jobs

```yaml
unit-tests:
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

e2e-tests:
  script:
    - npm ci
    - npx playwright install --with-deps
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
```

### Branch Rules
- Merge to `main` blocked if unit coverage < 80%
- Merge to `main` blocked if any test fails
- E2E runs on `dev` → `main` merges only

---

## Current Status

| Phase | Status | Tests |
|-------|--------|-------|
| Phase 1 - Unit | In Progress | 24 files, 540 total — 540 passing, 0 failing |
| Phase 2 - Integration | Not Started | - |
| Phase 3 - E2E | Not Started | - |
| Phase 4 - CI | Not Started | - |
