# Visual QA & Stable UI Release — v3.8.0

## What changed

The original safety-gated Commit & Push section stays immediately after summary, risk, and Sync deletion consent. File details are optional. Expanding them no longer yields unbounded document height: the change list itself scrolls in a constrained region. A return button is at both the top and bottom of details; clicking it collapses details and focuses the existing consent section, **without** checking consent or sending a GitHub request.

### Automated validations

- `npm test`: 301/301 Node tests passing on the provided source (296 inherited, 5 v3.8 tests).
- `tests/visual-qa-v380.test.js` validates selector wiring, bounded scroll, focus destination, one and only one gated `onClick={push}`, no stale checkbox confirmation, and version/cache synchronization.
- Original GitHub safety, auth/session, worker parser, SSR/static and modal lifecycle tests remain active.
- Static browser viewport fixture is provided in `qa/visual-fixture.html` for Chromium smoke checks. It uses mock data and must not be treated as authenticated Next.js E2E.

### Manual viewport/device matrix — requires real browser & user credentials

| Test | Desktop 1280+ | iPhone 320–430 | iPad 768 | Standalone iOS PWA |
|---|---:|---:|---:|---:|
| Repos, Upload, Activity, History, Settings no overflow | Pending | Pending | Pending | Pending |
| 2,500-file expanded Review scroll stays bounded | Pending | Pending | Pending | Pending |
| Return to consent section and keyboard focus | Pending | Pending | Pending | Pending |
| Critical secrets block Push; Sync requires consent | Pending | Pending | Pending | Pending |
| Repository/Branch sheets, keyboard, opener focus, scroll restoration | Pending | Pending | Pending | Pending |
| Dark/light/system, reduced motion, VoiceOver | Pending | Pending | Pending | Pending |
| GitHub Direct Push / PR / Recovery real server outcomes | Pending | Pending | Pending | Pending |

### CI/Vercel validation commands

```bash
npm install --no-audit --no-fund
npm test
npm run build
```

### Release criteria

Do not declare production certification until Vercel build and all high-risk manual cases pass with an authorized **test repository**. GitHub API write handlers are unchanged by this release. Do not auto-retry after a network error during `commit`: use existing Activity verification to resolve an uncertain result.

### Rollback

If a regression appears, redeploy the last verified v3.6.0 source in Vercel or revert the Git commit. Existing account/session state, GitHub repositories, branch permissions and cookie secrets must stay intact. After deploying, confirm the PWA version indicator and service-worker update banner before resuming operations.
