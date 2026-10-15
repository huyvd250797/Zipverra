# Zipverra Pro v3.3.0 — Unified Component Design System

## Component foundation

`app/components/UnifiedUI.jsx` introduces UiButton, UiIconButton, UiCard, UiInput, UiBadge and UiProgress. All are presentation-only and never access GitHub APIs, local/session storage or credentials. `app/styles/unified-components-v330.css` is imported last so the new design layer unifies controls across the app without rewriting sensitive mutation handling. It preserves existing Graphite Navy/Emerald dark/light tokens, focus-visible styles, Reduced Motion and iOS modal scroll lock.

## Repository Picker

The modal opens with sections (only when applicable): **Dùng nhiều**, **Gần đây**, **Đã ghim**. Up to three chips per group; each chip is a single-tap choice. Suggestions are hidden while searching. The complete authorized list remains below the search field. Every time a modal opens its content scroll position resets to zero.

- Frequent = count >= 2, ranked by count then last use. Existing account Activity may seed counts when upgrading.
- Recent = last-used order, excluding duplicates already shown in Frequent.
- Pinned = the existing list of favorites, capped to three.
- Local metadata is account-scoped (login), contains only repository names, counts and timestamps. Legacy v3.2.0 recents/favorites are migrated once from device-wide storage.
- Suggestions are intersected with the latest server-authorized GitHub App repository list. They never authorize access themselves.
- Changing selected repo still runs the existing ZIP/Review and dirty Workspace confirmation guards.

## Important exclusions

This release does not introduce a backend database, new API permissions, PR auto-merge or changed Git mutation semantics. Production Next.js build, real iPhone/VoiceOver and live GitHub E2E remain deployment acceptance gates.
