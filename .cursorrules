# PCR 3.0 - Project Rules

## Behavioral Guidelines

> Reduce common LLM coding mistakes. These bias toward caution over speed - use judgment for trivial tasks.

### Think Before Coding

- State assumptions explicitly. If uncertain, ask before implementing.
- If multiple interpretations of the request exist, present them - do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what is confusing and ask.

### Simplicity First

- Write the minimum code that solves the problem. Nothing speculative.
- No features, abstractions, "flexibility", or "configurability" beyond what was asked.
- No error handling for impossible scenarios (see Quality Rules).
- If a 200-line implementation could be 50, rewrite it.
- Ask: would a senior engineer call this overcomplicated? If yes, simplify.

### Surgical Changes

- Touch only what the request requires. Every changed line must trace directly to the user's intent.
- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor working code. Match existing style even if you would do it differently.
- If you notice unrelated dead code, mention it - do not delete it.
- Remove imports/variables/functions that YOUR changes made unused. Do not remove pre-existing dead code unless asked.

### Goal-Driven Execution

- Transform tasks into verifiable goals before coding:
  - "Add validation" -> "Write tests for invalid inputs, then make them pass"
  - "Fix the bug" -> "Write a test that reproduces it, then make it pass"
  - "Refactor X" -> "Ensure tests pass before and after"
- For multi-step tasks, state a brief plan with explicit verification per step:
  ```
  1. [Step] -> verify: [check]
  2. [Step] -> verify: [check]
  ```
- Strong success criteria let you loop independently; weak criteria ("make it work") force constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Stack

- **Framework**: React 19 with TypeScript
- **Build tool**: Vite
- **Package manager**: npm
- **Routing**: React Router v7 (`react-router-dom`) - `BrowserRouter` at root (`main.tsx`), `Routes`/`Route` in `App.tsx`. Protected routes use `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) which checks for `pcr_token` in localStorage and redirects to `/login` with `state={{ from: location }}` if missing. After login, navigate to `location.state.from` to return the user to their originally requested page.
- **Styling**: Tailwind CSS (utility-first, no custom CSS unless unavoidable)
- **Icons**: Lucide React (`lucide-react`)
- **Linting**: ESLint
- **Formatting**: Prettier

---

## Project Structure

```
src/
  assets/        # Static assets (images, fonts)
  components/    # Reusable UI components
    ui/          # Primitive/base components (Button, Input, Card, etc.)
  features/      # Feature-specific components and logic
  hooks/         # Custom React hooks
  lib/           # Utility functions and helpers
  pages/         # Top-level route/page components
  types/         # Shared TypeScript types and interfaces
```

---

## Code Conventions

### TypeScript
- Use strict TypeScript (`strict: true` in tsconfig).
- Prefer `interface` for object shapes, `type` for unions/aliases.
- No `any` - use `unknown` and narrow types explicitly.
- Export types from the file they are defined in; do not create barrel re-export files unless the folder has 3+ exports.

### React
- Functional components only - no class components.
- Co-locate component state and logic; extract to a custom hook only when reused across 2+ components.
- Props interfaces are defined directly above the component they belong to.
- Use named exports for all components (no default exports in component files).
- Keep components under ~150 lines; split if larger.

### React 19 - New APIs and Preferred Patterns

#### `ref` as a prop (replaces `forwardRef`)
- Function components now accept `ref` directly as a prop - **do not use `forwardRef`** (deprecated in React 19).
- `forwardRef` still works but should not be used in new code.
```tsx
// ✅ React 19
function MyInput({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <input ref={ref} {...props} />
}
// ❌ Old pattern - do not use
const MyInput = forwardRef<HTMLInputElement, Props>((props, ref) => <input ref={ref} {...props} />)
```

#### `<Context>` as a provider (replaces `<Context.Provider>`)
- Render `<MyContext value={val}>` directly - **do not use `<MyContext.Provider>`** (deprecated in React 19).
```tsx
// ✅ React 19
<ThemeContext value="dark">{children}</ThemeContext>
// ❌ Old pattern - do not use
<ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
```

#### `use()` - read promises and context in render
- `use(promise)` suspends the component until the promise resolves (requires a `<Suspense>` boundary).
- `use(Context)` reads context and can be called conditionally (unlike `useContext`).
- Do **not** pass promises created during render - only stable/cached promises.
```tsx
const data = use(fetchPromise)       // suspends until resolved
const theme = use(ThemeContext)      // reads context, callable after early returns
```

#### `useActionState` - async action state management
- Preferred over manual `useState` + `isPending` for data mutations and form submissions.
- Returns `[state, dispatchAction, isPending]`.
```tsx
const [error, submitAction, isPending] = useActionState(async (prev, formData) => {
  // perform mutation, return next state
}, null)
```

#### `useOptimistic` - optimistic UI
- Display an optimistic value during an async operation; auto-reverts on error.
```tsx
const [optimisticItems, setOptimisticItems] = useOptimistic(items)
```

#### `useFormStatus` - form pending state
- Reads `pending` and other status from the nearest parent `<form>`. Use in design-system submit buttons.
```tsx
const { pending } = useFormStatus()
```

#### Ref cleanup functions
- `ref` callbacks may return a cleanup function called on unmount (replaces manual null-checks).
```tsx
<div ref={(el) => { /* setup */; return () => { /* cleanup */ } }} />
```

#### `useDeferredValue` - initial value
- Pass a second argument as the initial value for the first render, avoiding a Suspense fallback flash.
```tsx
const deferred = useDeferredValue(value, '')
```

#### Actions in `<form>`
- Pass async functions to `action`/`formAction` on `<form>` elements. React manages pending state automatically and resets the form on success.

### React Rules (react.dev/reference/rules)

#### Purity
- Components must be idempotent - always return the same output for the same props/state/context.
- Never run side effects during render. Use `useEffect` or event handlers for all side effects.
- Never mutate props or state directly - always use setter functions or create new values.
- Never mutate values after they have been passed to JSX.
- Reading external mutable state (e.g. `window.location.pathname`) during render violates purity - capture it via `useState(() => ...)` initializer instead.

#### Hooks
- Only call hooks at the top level - never inside loops, conditions, nested functions, or after early returns.
- Only call hooks from React function components or custom hooks.
- Exception: `use()` may be called conditionally (it is not a hook in the traditional sense).

#### Performance hooks
- Use `useMemo` for expensive derived values (e.g. array transforms, `Intl.NumberFormat` calls) to avoid recomputation on every render. Deps array must be precise.
- Use `useCallback` for functions passed as props or used in dependency arrays, to maintain stable references across renders. Always use functional updates (`setState(prev => ...)`) inside `useCallback` when closing over state.
- Do not `useMemo`/`useCallback` trivial primitives or inline JSX - only apply where the cost of recomputation or referential instability is real.

#### Effects
- Each `useEffect` should do one thing - split effects with separate concerns into separate `useEffect` calls.
- Always return a cleanup function when the effect registers listeners, timers, or subscriptions.

### Naming
- Components: `PascalCase` (e.g., `UserCard.tsx`)
- Hooks: `camelCase` prefixed with `use` (e.g., `useAuth.ts`)
- Utilities / helpers: `camelCase` (e.g., `formatDate.ts`)
- Constants: `SCREAMING_SNAKE_CASE`
- CSS classes: Tailwind utilities only; no custom class names unless absolutely necessary

### Styling (Tailwind CSS)
- Use Tailwind utility classes directly on JSX elements.
- Use `cn()` (from `clsx` + `tailwind-merge`) for conditional class merging.
- Use canonical opacity shorthand: `bg-white/7` not `bg-white/[0.07]`. Write opacity as an integer percentage without brackets.
- Use canonical spacing/sizing scale values instead of arbitrary brackets when a scale equivalent exists: `min-w-45` not `min-w-[180px]`, `min-w-8` not `min-w-[2rem]`, `w-150` not `w-[600px]`.
- Use canonical shorthand utilities: `shrink-0` not `flex-shrink-0`.
- Use unbracketed data attribute variants: `data-highlighted:bg-white/8` not `data-[highlighted]:bg-white/8`.
- **Tailwind v4 renamed utilities - always use the v4 name:**
  - Gradients: `bg-linear-to-{dir}` not `bg-gradient-to-{dir}` (e.g. `bg-linear-to-r`, `bg-linear-to-b`)
  - Shadows: `shadow-xs` not `shadow-sm`; `shadow-sm` not `shadow`
  - Blur: `blur-xs` not `blur-sm`; `blur-sm` not `blur`; `backdrop-blur-xs` not `backdrop-blur-sm`
  - Border radius: `rounded-xs` not `rounded-sm`; `rounded-sm` not `rounded`
  - Drop shadow: `drop-shadow-xs` not `drop-shadow-sm`; `drop-shadow-sm` not `drop-shadow`
  - Outline: `outline-hidden` not `outline-none`
  - Ring: explicit width required - `ring-3` not bare `ring`
- Avoid inline `style` props unless for truly dynamic values (e.g., calculated widths).
- Responsive design uses Tailwind breakpoint prefixes (`sm:`, `md:`, `lg:`, etc.).
- All interactive elements (`button`, `a`, role="button") must include `cursor-pointer`.
- Primary button background color is `#e40b18` (Janya brand red) with hover `#cc0a15`. Text is always `text-white`.
- **Default theme is dark.** Design and build all UI in dark mode first.
- Dark mode is class-based (`darkMode: 'class'` in Tailwind config). The `dark` class is always present on `<html>` - do not rely on `prefers-color-scheme`.
- Use `dark:` prefix for any light mode overrides if light mode is ever added later.

### Icons (Lucide React)
- Import icons individually: `import { ChevronRight, User } from 'lucide-react'`
- Default icon size is `16` or `20`; always pass `size` explicitly.
- Icons are purely decorative by default - add `aria-label` only when they convey meaning.

---

## Layout Conventions

- **Shell layout** (authenticated pages): `ProtectedRoute` owns the full-page shell - `flex h-screen flex-col` with `<Navbar />` (full width), `<main className="flex-1 overflow-hidden bg-[#060b14]">` (bounded content area), and `<Footer />` (full width). Page components rendered via `<Outlet />` must NOT apply `min-h-screen` or their own background - the shell provides both.
- **Page scroll**: Each page component is responsible for its own scroll. Use `flex h-full flex-col` on the page root, with an inner `flex-1 overflow-y-auto` for scrollable content. This allows pages to pin elements (e.g. pagination bars) to the bottom of the viewport by placing them outside the scrollable div as `shrink-0` siblings.
- Navbar and Footer always span full viewport width; never constrain them with `max-w-*`.
- Content width constraints (`max-w-*`, `mx-auto`) belong inside the page component's own content div, not on the shell elements.

## File Conventions

- One component per file.
- File name matches the exported component/hook name exactly.
- `index.ts` barrel files only at the feature or pages level, not inside `components/ui/`.

---

## Quality Rules

- No `console.log` in committed code - use a logger utility or remove before committing.
- No commented-out code blocks - delete unused code.
- No unused imports - ESLint will catch these; fix before committing.
- Validate only at system boundaries (form inputs, API responses) - do not add defensive checks for internal code.
- Do not add error handling for scenarios that cannot happen.

### Storage
- Never access `localStorage` or `sessionStorage` directly.
- Always use the utility functions from `src/lib/storage.ts`:
  - `setStorage(key, value, storage?)` - encodes and writes. Objects are auto JSON-stringified.
  - `getStorage<T>(key, storage?)` - decodes and reads. Auto JSON-parses if the value is an object.
  - `removeStorage(key, storage?)` - removes a key.
- Default storage type is `'local'` (localStorage). Pass `'session'` for sessionStorage.
- Values are base64-encoded with non-ASCII support (`encodeURIComponent` + `btoa`).

---

## Element IDs

> **Non-negotiable rule enforced on every PR and every generated file.**

- **Every interactive and structural JSX element must have an `id` attribute.** This includes all `div`, `section`, `form`, `button`, `input`, `select`, `textarea`, `a`, `canvas`, `video`, `audio`, and modal/panel root elements.
- IDs must be **developer-friendly and self-describing** - a developer must immediately understand what the element is and where it lives from the ID alone, without reading any surrounding code.
- Use a **feature prefix** followed by a descriptive name: `{feature}-{element-description}`.
  - Examples: `ve-btn-export-selection`, `ve-timeline`, `studio-panel-gfx`, `events-modal-title`
- For **dynamic/repeated elements** (list items, overlays, tracks), append the unique identifier: `ve-overlay-item-{id}`, `ve-picker-asset-{aid}`.
- For **buttons**, always include `btn-` in the name: `ve-btn-mark-in`, `studio-btn-go-live`.
- IDs must be **unique across the page** - use the feature prefix to guarantee this.
- Apply IDs to modals, panels, toolbars, forms, inputs, buttons, separators, labels, and any element a developer may need to target for testing or debugging.
- **Never generate an element without an `id`.** If you are unsure what the ID should be, derive it from the feature name and the element's purpose. Missing IDs are a bug.

---

## Naming Conventions

> **Non-negotiable rule enforced on every PR and every generated file.**

- **Every name - variables, props, object fields, object keys, state, functions, types, interfaces, constants - must be developer-friendly and self-describing.** A developer must understand the purpose without reading any surrounding code.
- **This applies everywhere:** component props, hook return values, API response mappings, WebSocket packet fields, state objects, context values, utility parameters - no exceptions.
- Avoid single-letter names (except loop counters `i`, `j` in tight loops), abbreviations, and ambiguous shorthand.
  - Bad: `val`, `d`, `t`, `s`, `cb`, `fn`, `tmp`, `res`, `data`, `eu`, `q`, `si`
  - Good: `selectedEventId`, `videoDuration`, `handleExportClick`, `isLoading`, `markInTime`
- **Boolean state/variables** must be prefixed: `is`, `has`, `can`, `should`.
  - Examples: `isLoading`, `hasSelection`, `canExport`, `shouldAutoPlay`
- **Event handlers** must be prefixed with `handle` or `on`: `handleSaveClick`, `onOverlaySelect`.
- **Refs** must end with `Ref`: `videoRef`, `audioElsRef`, `scrubTrackRef`.
- **State setters** follow the React convention: `setVideoLoaded`, `setMarkIn`.
- **Constants** use `SCREAMING_SNAKE_CASE`: `FRAME_COUNT`, `OV_COLORS`, `AR_MAP`.
- When naming things, prefer the full word over the abbreviation unless the abbreviation is a widely-known domain term (e.g. `fps`, `url`, `api`, `id`, `css`, `json` are acceptable).
- **Never use opaque shorthand in new code.** If you find yourself writing a name that requires context to understand, rename it.

---

## Commit Guidelines

- Commits use imperative mood: `Add`, `Fix`, `Remove`, `Update`, `Refactor`
- Keep commits focused - one logical change per commit.
- Do not commit code that fails ESLint or TypeScript checks.

---

## Confirmation Dialogs

- All **update** (save/edit) and **delete** operations must be confirmed via `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) before executing.
- Use `variant="danger"` for destructive (delete) actions; omit or use `variant="default"` for updates.
- `ConfirmDialog` does **not** close on outside click - the user must explicitly confirm or cancel.
- Do not use `window.confirm` or inline confirm prompts.

---

## Reference Projects

### Old Angular App (Janya UI)
- **Path**: `D:\Git Projects\Janya_UI\Janya_UI`
- **Purpose**: Reference for existing UI patterns, business logic, API endpoints, and feature behavior when building PCR 3.0.
- **Trigger**: When the user says **"refer angular"** or **"check angular"**, explore this project for relevant context before implementing or answering.
- **Rule**: Analyze and explain only - never edit or write files in this project.

---

## What NOT to Do

- **Never make edits to files outside this project directory** (`D:\Git Projects\PCR 3.0`). If a task references another project, analyse and explain only - do not write or edit files in that other project.
- Do not use `any` types.
- Do not add features or refactor code beyond what is explicitly requested.
- Do not create helpers/utilities for one-off operations.
- Do not use `default export` for React components.
- Do not use CSS modules or styled-components - Tailwind only.
- Do not install a new dependency without checking if the existing stack already covers the need.
- Do not use em dashes (`—`) in any output, comments, or documentation - use a regular hyphen (`-`) instead.

### React 19 - Deprecated Patterns (do not use in new code)
- **`forwardRef`** - deprecated. Pass `ref` as a prop directly.
- **`<Context.Provider>`** - deprecated. Use `<Context value={...}>` directly.
- **`useFormState`** (from `react-dom`) - renamed to `useActionState` (from `react`).
- **Ref null cleanup** - do not use `ref={(el) => { if (!el) cleanup() }}` pattern; return a cleanup function instead.

---

## Multi-Project Boundary — STRICT (mandatory)

This repository contains two separate projects:
- `web/` — this project
- `janya-conference/` — the other project

**You must NEVER edit, create, or delete any file outside of `web/` without explicit per-change permission from the user.**

- **Reading** files in `janya-conference/` requires permission once per session - a single approval covers all reads for the remainder of that session.
- Each individual **edit, create, or delete** in `janya-conference/` or any other project directory requires its own explicit approval before proceeding.
- Do not assume edit/create/delete permission granted for one file applies to any other file.
- If a task seems to require touching `janya-conference/`, stop and ask the user first.
- **Git commits must be independent per project.** Never stage or commit `janya-conference/` files when committing `web/` changes. Only stage files under `web/` when making commits in this project.
- This rule takes priority over all other instructions.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

---

## Core Libraries & Implementations

- **Canvas/Graphics**: `konva` and `react-konva`. Use declarative `react-konva` components for rendering. Optimize by separating canvas state from React component state where necessary to avoid unnecessary re-renders.
- **Audio Waveforms**: `wavesurfer.js`. Maintain the WaveSurfer instance via a ref and ALWAYS clean it up in a `useEffect` return function to prevent memory leaks.
- **Accessible UI Primitives**: Radix UI (`@radix-ui/react-*`). Used for Dialog, DropdownMenu, Select, and Toast. Always use these unstyled primitives and style them exclusively with Tailwind CSS rather than building custom accessible components from scratch.
- **Testing**: `vitest` with `@testing-library/react`. Tests should focus on component behavior and user interactions rather than implementation details.
- **Authentication**: `oidc-client-ts`. Handles OpenID Connect integration.
- **Security**: `@marsidev/react-turnstile` for Cloudflare Turnstile CAPTCHA implementation.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
