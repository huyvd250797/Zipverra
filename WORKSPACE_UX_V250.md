# Zipverra Pro v2.5.0 — Workspace UX & Navigation

## User journey

Repos → choose authorized repository + branch → Repository Explorer → browse folders / search → open file → Code / Edit / Review / History. Global ZIP Push continues at Repos → Upload → Review → Confirm → Activity.

- Explorer: scrollable breadcrumbs, directory-first list, search within folder or exact repository-level name search, pinned folder shortcuts held in component state only.
- Code: read-only syntax highlights and line numbers for the first 900 lines; file size limits from v1.9 still apply.
- Edit: UTF-8 source editor (max 64 KiB), indentation insertion at caret or selection, reset requiring explicit confirmation, commit message and Review Changes button. An explicit user gesture is required for every write.
- Review: signed server preview, redacted security warnings, bounded diff, explicit checkbox and Commit & Save File. No auto-retry after ambiguous server save; verification remains read-only.
- History: file-specific GitHub commit links; client-side loaded-commit search in global History view.
- Pull Requests: Branch/PR segmented control is purely presentational; merge still requires typed MERGE and GitHub SHA checks.

## Unsaved content protection

1. Editing creates an in-memory dirty marker, mirrored to the global shell through `onDirtyChange`.
2. Leaving Workspace via bottom navigation asks for confirmation and **keeps the draft in memory** after consent.
3. Changing owner/repository/branch/Push Profile or logging out asks for confirmation to **discard** the draft; Cancel stops the action.
4. Returning to file listing or opening a new folder/file asks before discarding changes. Browser/PWA reload uses `beforeunload` where browsers support it, but iOS may terminate PWA without an event: **drafts are not durable**.
5. No source or tokens are persisted to localStorage, sessionStorage or service-worker cache by this feature.

## Constraints and verification

- Repository Explorer only edits existing UTF-8 text files up to 64 KiB; no binary editing, new-file creation or branch auto-create.
- File list/commit pages are bounded by existing GitHub API implementations. Global file search is name/path-oriented, not full-text indexed search.
- CSS uses shared `--pro-*` color tokens, native focus and reduced-motion; supports the 5-tab PWA and safe-area layout.
- Before production release, verify Next build, Safari/iPhone layouts, unsaved-guard behavior and safe GitHub E2E in a disposable repository.
