# v3.4.0 — Mobile Layout & Navigation

## Scope

1. Repositories: one single active-repo / branch hub with fast Push ZIP, Workspace and History controls. Repository picker maintains Frequent / Recent / Pinned quick picks and GitHub App authorization filtering.
2. Download Source ZIP appears only in Repos, with the previously implemented GitHub commit-based ZIP filename and iOS Save to Files behavior.
3. Upload & Review retain existing protected GitHub mutation workflow but remove repeated repository and download blocks.
4. Activity focuses Live Push first; Recovery Center and local action log remain available.
5. Five navigation tabs, safe area, scroll lock and accessible contextual Help remain intact.
6. Added existing declared raster manifest assets from the current SVG source.

## Acceptance checklist

- Test 320/375/390/430/768/1280 widths with Dark/Light/System theme, no horizontal scroll.
- Open Repo/Branch picker on a scrolled screen, scroll its inner content; ensure background remains locked and scroll position restores.
- Switch tabs while source download prepares; its in-memory progress must not be reset by tab unmount.
- Upload ZIP; review, secrets, Sync deletion and confirmation must remain visible and required.
- Push should auto-show Activity from the top, with Live Progress above Recent Actions.
- Verify a real Vercel build, GitHub App E2E and iPhone PWA. Local static/unit tests do not replace this.
