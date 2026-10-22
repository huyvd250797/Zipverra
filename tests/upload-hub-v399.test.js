import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOBILE_TABS } from '../lib/mobile-ui.js';
import { APP_VERSION } from '../lib/pwa-reliability.js';
const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const page = read('app/page.jsx');
const css = read('app/styles/upload-hub-v399.css');

test('v3.9.14 runtime, PWA and Upload Hub stylesheet are release-aligned', () => {
  assert.equal(APP_VERSION, '3.9.14');
  assert.equal(JSON.parse(read('package.json')).version, APP_VERSION);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.14/);
  const imports=read('app/layout.jsx');
  assert.ok(imports.indexOf('minimal-interface-v398.css') < imports.indexOf('upload-hub-v399.css'));
});
test('Repos is removed from both mobile and desktop navigation, without removing repo picker', () => {
  assert.deepEqual(MOBILE_TABS, ['home','activity','history','settings']);
  assert.match(page,/const DESKTOP_TAB_ORDER = Object\.freeze\(\['home','activity','history','settings'\]\)/);
  assert.doesNotMatch(page,/\{id:'repositories',label:'Repos'/);
  assert.doesNotMatch(page,/goToTab\('repositories'\)/);
  assert.doesNotMatch(page,/<WorkspaceLaunchpad/);
  assert.match(page,/<RepositoryPickerSheet open=\{repoSheetOpen\}/);
});
test('Download ZIP appears only after repo selection and directly within Upload', () => {
  assert.equal((page.match(/<SourceZipDownload\b/g)||[]).length,1);
  assert.match(page,/\{chosenRepo && !preview && <SourceZipDownload owner=\{owner\} repo=\{repo\}/);
  assert.ok(page.indexOf('<SourceZipDownload')>page.indexOf('className="zip392-target-switch"'));
  assert.ok(page.indexOf('<SourceZipDownload')<page.indexOf('<QuickActions'));
  assert.match(page,/disabled=\{!chosenRepo \|\| busy/);
});
test('Download ZIP retains explicit two-stage iPhone save flow without auto-sharing', () => {
  const ui=read('app/components/SourceZipDownload.jsx');
  assert.match(ui,/isPreparing \? 'Đang tải\.\.\.' : 'Tải ZIP'/);
  assert.match(ui,/download\.shareSupported \? 'Lưu vào Tệp'/);
  assert.match(ui,/navigator\.share\(\{ files: \[file\]/);
  assert.match(ui,/onClick=\{download\.shareSupported \? saveToFiles : downloadInBrowser\}/);
  assert.match(ui,/if \(!selected \|\| !owner \|\| !repo\) return null;/);
  assert.match(ui,/\[identity\]/);
});
test('Download ZIP still targets main branch explicitly rather than selected Push branch', () => {
  const ui=read('app/components/SourceZipDownload.jsx');
  assert.match(ui, /Branch <b>main<\/b>/);
  assert.match(ui, /\/api\/github\/source-zip\?owner=/);
});
test('PR and Quick Edit remain reachable in secondary, collapsed sections', () => {
  assert.match(page,/data-mobile-view="history" onToggle=\{event => setPrToolsOpen/);
  assert.match(page,/prToolsOpen && <BranchPrPanel/);
  assert.match(page,/className="zip399-advanced-tools"/);
  assert.match(page,/workspaceOpen && <WorkspacePanel hostView="settings"/);
  assert.match(read('app/components/WorkspacePanel.jsx'),/data-mobile-view=\{hostView\}/);
});
test('four equally sized tabs and compact download card avoid horizontal scroll', () => {
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.upload-panel \.source-zip-download/);
  assert.match(css,/min-width:0/);
  assert.match(css,/\.mobile-bottom-nav \.mobile-nav-item/);
});
test('security, confirmation and recovery gates remain independent of UI refactor', () => {
  assert.match(page,/disabled=\{!canSubmitPush\}/);
  assert.match(page,/requiresConsent && !sensitiveConsent/);
  assert.match(page,/!confirmed \|\| \(mode === 'sync' && stats\?\.delete > 0 && !syncConfirmed\)/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
  assert.match(page,/refreshExpiringAttestations/);
  assert.match(page,/<RecoveryCenter/);
});
