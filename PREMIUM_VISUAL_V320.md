# Zipverra Pro v3.2.0 — Premium Visual Identity & Color System

## Scope

Direct upgrade from the user-supplied Zipverra Pro v3.1.0 full source. **This is a visual UX release**: no GitHub authorization, ZIP upload/download, PR, editor, History or Rollback data mutation logic was changed.

## Root cause: large emerald rectangle after navigation

The existing semantic `<main id="zipverra-main" tabIndex={-1}>` is intentionally programmatically focusable for skip-navigation and page transitions. The old global CSS `:where(...,[tabindex]):focus-visible { outline:3px solid ... !important }` unintentionally applied a strong focus outline to this *entire landmark* on iOS, which looked like a permanent large rectangular emerald border around Upload & Review.

**Fix:** The focus selector now excludes `[tabindex="-1"]` and the premium layer explicitly clears focus outline from the main landmark and other noninteractive `-1` regions. Buttons, links, inputs, selects, summaries and other genuine interactive controls **retain** a visible 2px keyboard focus ring. The skip-link remains accessible. This avoids hiding meaningful keyboard focus.

## Color palette — Graphite Navy + Emerald

| Token | Dark | Light |
| --- | --- | --- |
| Background | `#0B111B` | `#F5F7F9` |
| Surface | `#172432` | `#FFFFFF` |
| Elevated | `#213141` | `#E7EEF2` |
| Border | `#344756` | `#D7E1E7` |
| Primary Emerald | `#2ABF93` | `#087D65` |
| Text | `#F3F7FA` | `#172735` |
| Secondary | `#A9BBC9` | `#526B7D` |
| Error | `#FF9CA6` | `#B43F52` |

`app/styles/pro-design-system.css` owns semantic tokens. The new **last-imported** `app/styles/premium-visual-v320.css` applies presentation-only component overrides and fixes older high-specificity light-theme rules. Global `viewport.themeColor` is aligned to dark background.

## Micro-interactions

- Incoming screen content: 220ms transform + opacity.
- iPhone bottom sheet: 260ms rise/opacity; modal and backdrop fade 220ms.
- Touch feedback: 145ms, small scale on actual button press, no layout movement.
- Upload/progress width uses measured state rather than invented percentages.
- `prefers-reduced-motion: reduce` disables all new transitions and animations.
- No continuously pulsing accent borders or large blur/glow effects.

## Invariants preserved

- Five tabs, exactly one shared `?` help per screen.
- Modal/bottom-sheet body scroll locking from v3.1.0 remains unchanged.
- Security Scan / Sync confirmation / explicit Push and PR confirmation unchanged.
- Live Activity and safe rollback/recovery unchanged.
- Dark / Light / System preference unchanged.

## QA / verification boundaries

- Unit and visual-token tests are automated (`npm test`).
- Chromium layout fixture checks the actual stylesheet cascade, including programmatic landmark focus vs. real button focus, in both themes at 320/375/390/430/768/1280px.
- Static parser checks all JS/JSX/MJS sources, imports and stylesheets.
- `npm install` / production `next build` may fail in this packaging environment because npm registry returns `EAI_AGAIN`. Confirm Vercel CI build and test the live iPhone PWA before treating the release as fully production-verified.
