# Zipverra Pro v3.9.9 — Acceptance Checklist

- [ ] `/api/version` reports `3.9.9`, and the updated PWA has reloaded while no Push is pending.
- [ ] On iPhone 320/375/390/430px widths, there are **four** equally accessible bottom tabs: Upload, Activity, History, Settings. No Repos tab or horizontal overflow.
- [ ] On PC/tablet, sidebar contains four items and no Repos navigation.
- [ ] On signed-out Upload, GitHub login is available. No source ZIP download action is shown.
- [ ] After login but before choosing a repository, neither source ZIP action nor disabled ZIP uploader is shown.
- [ ] Selecting any authorized repository exposes **Tải ZIP** immediately below the Repo/Branch chooser. Favorite/recent choices still work.
- [ ] Tapping **Tải ZIP** prepares the GitHub **main branch** archive, shows progress, and supports cancel/error states.
- [ ] Once prepared, iPhone **Lưu vào Tệp** launches the native share sheet from a direct user gesture. Cancel does not falsely report saved. Browser-download fallback works.
- [ ] ZIP prepared for repo A cannot be shared after switching to repo B. Changing repository cancels preparation.
- [ ] With an active ZIP Review, the source-download bar is hidden to leave room for Review and Security.
- [ ] History > Branches & Pull Requests is available for the selected repository, and still supports viewing/merging PRs under existing authorizations and confirmations.
- [ ] Settings > Công cụ GitHub contains Quick Edit, dashboard and manual repository entry; no accidental write and unsaved work guard remains.
- [ ] Sync Delete, Critical Security Scan, project mismatch, consent and final Push steps cannot be skipped.
- [ ] Push, PR, Verify Push and Recovery work on a disposable test repository.
- [ ] Dark/Light Mode, Safari/PWA touch and keyboard, and desktop Chrome are tested on actual app build.
