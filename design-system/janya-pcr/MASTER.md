# Janya PCR Design System (Global Master File)

This document is the Source of Truth for the Janya PCR application user interface. It establishes styling, layout, typography, and contrast rules designed specifically for high-contrast accessibility in professional broadcast contexts (optimized for users aged 40+).

---

## 1. Accessibility & Readability Floor (Aged 40+)

*   **Body Copy / Input Values / Button Labels**: Minimum `16px` (`text-base`). No exceptions for readable copy.
*   **Tags / Badges / Input Labels / Tooltips**: Minimum `14px` (`text-sm`).
*   **Disabled / Micro-indicators**: Absolute minimum `12px` (`text-xs`). Eliminate all `10px` and `11px` sizes from user-facing readable text.
*   **Touch Targets**: Minimum height of `40px` to `42px` for all buttons, inputs, and dropdown triggers to facilitate easy clicking.
*   **Spacing**: Ensure comfortable line-height (`leading-relaxed` or `leading-normal`) and spacing between rows to prevent visual crowding.

---

## 2. Design Tokens

### Color Palette (WCAG Compliant)

| Role | Color Value / Hex | Usage |
| :--- | :--- | :--- |
| **Primary Text** | `rgba(255, 255, 255, 0.95)` | Highly readable title, input values, active status |
| **Secondary Text** | `rgba(255, 255, 255, 0.72)` | Body copy, secondary metadata, descriptions |
| **Muted Text** | `rgba(255, 255, 255, 0.58)` | Inactive states, labels, secondary helper text, placeholders |
| **Primary BG** | `#060b14` (Deep Navy Black) | Main screen, layouts background |
| **Secondary BG** | `#0d1424` (Midnight Blue) | Cards, popups, panel layouts background |
| **Component BG** | `rgba(255, 255, 255, 0.04)` | Selects, inputs, date pickers default background |
| **Primary Border**| `rgba(255, 255, 255, 0.15)` | Distinct boundaries for card elements, lists, input containers |
| **Active Accent** | `#e40b18` (Brand Red) | Live states, active toggles, primary notifications |
| **Select Accent** | `#3b82f6` (System Blue) | Hover, selection checkboxes, checked states, focus indicator |

---

## 3. Component Specs

### 1. Selects & Dropdowns
*   Height: $\ge$ `40px` (min-h-10 / py-2 px-3.5)
*   Text: `text-base` (16px)
*   Dropdown menu item: `text-base` with `px-4 py-2.5` padding.

### 2. Inputs & Date Pickers
*   Height: $\ge$ `40px` (py-2 px-3)
*   Text: `text-base` (16px)
*   Calendar icon clickable padding, and `color-scheme: dark` to ensure a dark-themed popup.

### 3. Tables & Lists
*   Table row height: $\ge$ `52px`
*   Header cell padding: `px-4 py-3`, text `text-sm` (14px) bold and uppercase.
*   Body cell padding: `px-4 py-3`, text `text-base` (16px).
*   First and last columns: Clear alignment with checkboxes and labels.

### 4. Buttons
*   Height: $\ge$ `40px`
*   Text: `text-base` or `text-sm` (for compact toolbar actions)
*   Hover transition: `transition-all duration-200` (no layout-shifting scales).

---

## 4. Forbidden Anti-Patterns (Do NOT Use)
*   ❌ **Micro text size**: Never use `text-[10px]` or `text-[11px]` for readable status or labels.
*   ❌ **Dim gray opacity**: Avoid using white opacities under `50%` (such as `text-white/20`, `text-white/30`, `text-white/35`) for readable characters.
*   ❌ **Default browser date pickers**: Standard light-gray inputs with white calendar dropdowns are prohibited.
*   ❌ **Cluttered elements**: Keep spacing uniform and distinct. Use solid backgrounds or distinct borders rather than letting elements bleed into one another.
