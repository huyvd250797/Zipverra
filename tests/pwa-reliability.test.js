import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { APP_VERSION, isNewVersion, shouldCheckAgain, validPublicVersion,
  validRollbackJournal, recoveryItems, safeToActivateUpdate } from '../lib/pwa-reliability.js';
import { GET } from '../app/api/version/route.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = name => readFileSync(join(root, name), 'utf8');
const SHA = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);

test('v2.6 metadata, PWA stylesheet and service worker are present', () => {
  assert.equal(APP_VERSION, '3.4.0');
  assert.equal(JSON.parse(src('package.json')).version, APP_VERSION);
  assert.match(src('app/layout.jsx'), /pwa-reliability\.css/);
  assert.ok(existsSync(join(root, 'public/offline.html')));
  assert.ok(existsSync(join(root, 'public/sw.js')));
  assert.match(src('app/page.jsx'), /v3\.4\.0/);
});
test('public version API responds no-store without leaking authentication', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { version: APP_VERSION });
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.equal(response.headers.get('Set-Cookie'), null);
});
test('version validation does not accept arbitrary strings or URL injection', () => {
  assert.equal(validPublicVersion('3.4.0'), true);
  assert.equal(validPublicVersion('../evil'), false);
  assert.equal(validPublicVersion('3.4.0?foo=bar'), false);
  assert.equal(isNewVersion({ version:'2.6.1' }), true);
  assert.equal(isNewVersion({ version:'3.4.0' }), false);
  assert.equal(isNewVersion({ version:'https://malicious.test' }), false);
});
test('update checks are throttled but handle a backwards clock', () => {
  assert.equal(shouldCheckAgain(100_000, 110_000), false);
  assert.equal(shouldCheckAgain(100_000, 160_000), true);
  assert.equal(shouldCheckAgain(100_000, 90_000), true);
});
test('updates are blocked for active writes, drafts and uncertain Git operations', () => {
  assert.equal(safeToActivateUpdate({}), true);
  assert.equal(safeToActivateUpdate({ busy:true }), false);
  assert.equal(safeToActivateUpdate({ dirty:true }), false);
  assert.equal(safeToActivateUpdate({ pending:true }), false);
  const hook = src('app/components/PwaReliability.jsx');
  assert.match(hook, /validRollbackJournal/);
  assert.match(hook, /safeToActivateUpdate/);
  assert.match(hook, /ZIPVERRA_ACTIVATE_UPDATE/);
  assert.doesNotMatch(hook, /localStorage\.setItem|sessionStorage\.setItem/);
});
test('only authorized repository metadata is shown in Recovery Center', () => {
  const push = { owner:'alice', repo:'ok', branch:'main', expectedHead: SHA };
  const pr = { owner:'alice', repo:'secret', sourceBranch:'zipverra/feature', expectedSourceHead:SHA };
  const rollback = { owner:'alice', repo:'ok', branch:'main', expectedHead:HEAD, targetSha:SHA };
  assert.equal(validRollbackJournal(rollback), true);
  assert.equal(validRollbackJournal({ ...rollback, targetSha:'bad' }), false);
  assert.deepEqual(recoveryItems({ push, pr, rollback, authorized:['alice/ok'] }).map(v=>v.type), ['push','rollback']);
  assert.deepEqual(recoveryItems({ push, pr, rollback, authorized:[] }), []);
  assert.equal(JSON.stringify(recoveryItems({ push, authorized:['alice/ok'] })).includes('token'),false);
});
test('Service Worker never caches API, auth, RSC or private navigation HTML', () => {
  const sw = src('public/sw.js');
  assert.match(sw, /request\.method !== 'GET'/);
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw, /url\.pathname\.startsWith\('\/_next\/'\)/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /fetch\(request\)\.catch/);
  assert.match(sw, /caches\.match\('\/offline\.html'\)/);
  assert.doesNotMatch(sw, /cache\.put\(request|cache\.add\('\/api\//);
});
test('Service Worker only skips waiting after explicit user message', () => {
  const sw = src('public/sw.js');
  assert.match(sw, /event\.data\?\.type === 'ZIPVERRA_ACTIVATE_UPDATE'/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /clients\.claim\(\)/);
  const install = sw.slice(sw.indexOf("self.addEventListener('install'"),sw.indexOf("self.addEventListener('activate'"));
  assert.doesNotMatch(install, /skipWaiting\(\)/); // comment mentions it, but does not call self method
});
test('offline fallback contains no private data or GitHub mutations', () => {
  const html = src('public/offline.html');
  assert.match(html, /Không có kết nối Internet/);
  assert.doesNotMatch(html, /access_token|fetch\(|\/api\/github|github\.com/);
});
test('foreground resume checks auth without retrying commit, PR or rollback', () => {
  const page = src('app/page.jsx');
  assert.match(page, /pwa\.resumeTick/);
  assert.match(page, /!auth\.authenticated \|\| busy \|\| workspaceDirty/);
  assert.match(page, /fetch\('\/api\/auth\/session', \{ cache:'no-store'/);
  assert.match(page, /beforeunload/);
  assert.match(page, /<RecoveryCenter push=\{pendingCommit\}/);
  assert.match(page, /requestOnce\('commit', commitPayload\)/);
});
test('PWA recovery panel distinguishes read-only verify from user-initiated PR flow', () => {
  const panel = src('app/components/RecoveryCenter.jsx');
  assert.match(panel, /onVerifyPush/);
  assert.match(panel, /onCheckPR/);
  assert.match(panel, /onOpenHistory/);
  assert.doesNotMatch(panel, /fetch\(|\/api\/github\/commit|localStorage/);
});
test('fast splash no longer blocks UI for 650ms minimum / 5.5s max', () => {
  const splash = src('app/components/SplashScreen.jsx');
  assert.match(splash, /setMinimumElapsed\(true\), 180/);
  assert.match(splash, /setTimedOut\(true\), 1800/);
});

test('Service Worker runtime handles offline navigation and bypasses private network requests', async () => {
  const { runInNewContext } = await import('node:vm');
  const handlers = {};
  const html = { status: 200, kind: 'public-offline' };
  const cache = { '/offline.html': html, '/icon.svg': { status: 200, kind: 'public-icon' } };
  let fetches = 0;
  const sandbox = {
    self: {
      location: { origin: 'https://zipverra.example' },
      addEventListener(type, fn) { handlers[type] = fn; },
      clients: { async claim() {} },
      skipWaiting() { throw Error('unexpected activation'); },
    },
    URL,
    Response: { error: () => ({ status: 0 }) },
    caches: {
      async match(path) { return cache[path] || null; },
      async open() { return { async addAll() {} }; },
      async keys() { return []; },
      async delete() { return true; },
    },
    fetch: async () => { fetches++; throw Error('offline'); },
    Set,
  };
  runInNewContext(src('public/sw.js'), sandbox);
  const requestEvent = (pathname, mode = 'cors') => {
    const event = { request: { method: 'GET', url: `https://zipverra.example${pathname}`, mode }, response: null,
      respondWith(value) { this.response = value; } };
    handlers.fetch(event);
    return event;
  };
  const api = requestEvent('/api/github/commit');
  assert.equal(api.response, null, 'GitHub API must bypass SW cache completely');
  const auth = requestEvent('/api/auth/session');
  assert.equal(auth.response, null, 'session API must bypass SW cache');
  const next = requestEvent('/_next/static/chunk.js');
  assert.equal(next.response, null, 'RSC / JS bundles are not handled by private cache');
  const offlineNav = requestEvent('/secret-repo', 'navigate');
  assert.deepEqual(await offlineNav.response, html, 'network navigation may fall back only to generic offline HTML');
  const icon = requestEvent('/icon.svg');
  assert.equal((await icon.response).kind, 'public-icon');
  assert.equal(fetches, 1, 'cached public icon and API pass-through never hit SW fetch()');
});

test('PWA manifest keeps stable installation identity and standalone scope', async () => {
  const { default: manifest } = await import('../app/manifest.js');
  const info = manifest();
  assert.equal(info.id, '/');
  assert.equal(info.scope, '/');
  assert.equal(info.start_url, '/');
  assert.equal(info.display, 'standalone');
});
