import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(join(root,name),'utf8');
const page=read('app/page.jsx');
const hub=read('app/components/PolishedWorkspace.jsx');
const css=read('app/styles/mobile-layout-v340.css');

test('v3.8.0 ships its mobile layout layer last and PWA version matches',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'3.8.0');
  const layout=read('app/layout.jsx');
  assert.match(layout,/import '\.\/styles\/mobile-layout-v340\.css'/);
  assert.ok(layout.indexOf('unified-components-v330.css')<layout.indexOf('mobile-layout-v340.css'));
  assert.match(read('lib/pwa-reliability.js'),/APP_VERSION = '3\.8\.0'/);
  for(const name of ['icon-192.png','icon-512.png','apple-touch-icon.png'])assert.ok(existsSync(join(root,'public',name)),name);
});
test('Repos uses one authorized repo and branch hub, not duplicated pickers',()=>{
  assert.equal((page.match(/<WorkspaceLaunchpad/g)||[]).length,1);
  assert.doesNotMatch(page,/className="zip-workflow-picker"/);
  assert.match(page,/onChooseRepo=\{\(\) => setRepoSheetOpen\(true\)\}/);
  assert.match(page,/onChooseBranch=\{\(\) => setBranchSheetOpen\(true\)\}/);
  assert.match(hub,/aria-label=\{selected \? `Thay đổi repository/);
  assert.match(hub,/className="zip-hub-branch"/);
  assert.match(hub,/disabled=\{!selected \|\| disabled\}/);
  assert.match(page,/RepositoryPickerSheet/);
  assert.match(read('app/components/RepositoryWorkflowSheets.jsx'),/repositoryQuickPicks/);
});
test('Repos owns a single persistent Source ZIP Download, separate from Upload',()=>{
  assert.equal((page.match(/<SourceZipDownload\b/g)||[]).length,1);
  assert.match(page,/className="panel repository-panel"[\s\S]*?<SourceZipDownload/);
  assert.match(page,/className="panel upload-panel"/);
  assert.match(page,/className="zip-missing-repo"/);
  assert.match(page,/className=\{`drop-zone/);
});
test('Upload preserves reviewed diff, critical security, Sync and explicit commit confirmation',()=>{
  for (const token of ['securityReport?.blocked','syncConfirmed','confirmed','canSubmitPush','pendingCommit','pendingPR','onClick={push}','<ReviewReadiness'])assert.ok(page.includes(token),token);
  assert.match(page,/onClick=\{goToReview\}/);
  assert.match(page,/data-mobile-view="activity"/);
  assert.match(page,/onClick=\{startNextVersion\}/);
});
test('Activity stays ahead of recovery log; all five tabs and modal scroll locks survive',()=>{
  assert.ok(page.indexOf('id="activity-live-flow"')<page.indexOf('<RecoveryCenter'));
  assert.ok(page.indexOf('<RecoveryCenter')<page.indexOf('<ActivityJournal'));
  const base=read('lib/mobile-ui.js');
  for(const name of ['home','repositories','activity','history','settings'])assert.ok(base.includes(`'${name}'`));
  const overlay=read('app/components/ModalSheet.jsx');
  assert.match(overlay,/lockModalScroll/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Mobile layout deliberately reduces nested surfaces and hides empty Review until necessary',()=>{
  assert.match(css,/\.repository-panel\s*\{[\s\S]*?background:transparent!important/);
  assert.match(css,/\.preview-panel:has\(\.pro-empty-preview\)\s*\{display:none;\}/);
  assert.match(css,/\.mobile-bottom-nav/);
  assert.match(css,/\.zip-hub-shortcuts button/);
});
