# Project Design System (DESIGN.md)

This document outlines the core design language, tokens, and component architecture for the project.

## 1. Typography

The project uses a custom three-tier typography system tailored for readability, a modern technical aesthetic, and accessibility.

- **Primary Headings (`var(--font-heading)`)**: `Poppins`
  - *Usage*: Page titles (h1–h6), landing page display text.
  - *Vibe*: Modern, geometric, humanist.
- **Body & UI Labels (`var(--font-sans)`)**: `Roboto`
  - *Usage*: General body text, form labels, buttons.
  - *Vibe*: Highly legible, neutral, excellent for complex UIs at 14px-16px.
- **Technical Text (`var(--font-mono)`)**: `Roboto Mono`
  - *Usage*: Timecodes, UUIDs, code snippets, network protocols.
  - *Vibe*: Crisp, monospaced, technical.

### Font Sizing Hierarchy
*Note: Font sizes have been upscaled globally to ensure WCAG compliance and readability (e.g., small text minimum is 14px).*
- `text-xs` / `text-sm`: 14px (0.875rem)
- `text-base`: 16px (1rem)
- `text-lg`: 18px (1.125rem)
- `text-xl`: 20px (1.25rem)
- `text-2xl`: 24px (1.5rem)
- `text-3xl`: 30px (1.875rem)
- `text-4xl`: 36px (2.25rem)

---

## 2. Color Palette

The application uses a strict dark-mode-first aesthetic with a deep indigo/black background and vibrant accents.

### Backgrounds
- **Primary BG**: `#060b14` (Deep application background)
- **Secondary BG**: `#0d1424` (Cards, elevated surfaces, dropdowns)
- **Component BG**: `rgba(255, 255, 255, 0.04)` (Inputs, standard buttons)

### Text & Borders
- **Primary Text**: `rgba(255, 255, 255, 0.95)` (Headings, primary body)
- **Secondary Text**: `rgba(255, 255, 255, 0.72)` (Subtitles, descriptions)
- **Muted Text**: `rgba(255, 255, 255, 0.58)` (Placeholders, disabled text)
- **Primary Border**: `rgba(255, 255, 255, 0.15)` (Standard dividers, input borders)

### Accents
- **Active Accent**: `#e40b18` (Primary brand red, live indicators, primary buttons)
- **Select Accent**: `#3b82f6` (Secondary interactions, active focus rings)

---

## 3. Component Architecture

### Core Libraries
1. **Styling**: `Tailwind CSS (v4)`
   - All styling is handled via Tailwind utility classes. Global CSS overrides are minimized and kept strictly in `@layer base` inside `src/index.css`.
2. **Icons**: `Lucide React`
   - Used universally for all SVG iconography.
3. **Headless UI**: `Radix UI`
   - Used for complex, accessible interactive components (`Dialog`, `Select`, `DropdownMenu`, `Toast`).

### Internal UI Library (`src/components/ui/`)
To maintain consistency, the project is building an internal UI component library that wraps Radix primitives with standard Tailwind styling.
- **Current Components**: 
  - `Dialog.tsx`
  - `Select.tsx`
  - `Toast.tsx`
  - `ConfirmDialog.tsx`

### Form Elements
- Standard inputs (`<input type="text">`, `<textarea>`) are globally styled in `src/index.css` (inside `@layer base`) to have a minimum height of `42px`, a base font size of `16px` (to prevent iOS zoom), and a standard translucent background. 
- Custom padding or focus states (like icons inside inputs) are applied via Tailwind classes (e.g., `pl-10`, `focus:border-[#e40b18]`) directly on the HTML elements.
