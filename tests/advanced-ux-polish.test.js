import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reviewReadiness, resolveTheme, themeChoice, trimSha, selectedRepoLabel } from '../lib/ux-polish.js';
import { createInteractionNotice } from '../lib/interaction-feedback.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const ready = { hasPreview:true, selectedCount:3, critical:0, authenticated:true, online:true, busy:false,
  pending:false, confirmed:true, syncDeleteCount:0, syncConfirmed:false };

test('v3.0 stable release keeps full PWA version and stylesheet', () => {
  assert.equal(JSON.parse(read('package.json')).version,'3.9.0');
  assert.match(read('lib/pwa-reliability.js'), /APP_VERSION = '3\.9\.0'/);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.0/);
  assert.match(read('app/layout.jsx'), /advanced-ux-polish\.css/);
  assert.match(read('app/page.jsx'), /v3\.9\.0/);
});

test('readiness cannot approve a missing preview, missing changes or unconfirmed review', () => {
  for (const args of [{ hasPreview:false }, { selectedCount:0 }, { confirmed:false }]) {
    assert.equal(reviewReadiness({...ready,...args}).ready,false);
  }
  assert.equal(reviewReadiness(ready).code,'READY');
  assert.equal(reviewReadiness(ready).ready,true);
});

test('Critical secrets block UI even when user checked confirmation', () => {
  const finding = reviewReadiness({...ready,critical:2});
  assert.equal(finding.code,'SECURITY');
  assert.equal(finding.ready,false);
  assert.equal(finding.tone,'warning');
  assert.equal(reviewReadiness({...ready,critical:2,sensitiveConsent:true}).ready,true);
  assert.doesNotMatch(JSON.stringify(finding),/ghp_|sk-proj-|secret_value/);
});

test('Sync deletion requires an independent explicit acknowledgement', () => {
  assert.equal(reviewReadiness({...ready,syncDeleteCount:4}).code,'SYNC');
  assert.equal(reviewReadiness({...ready,syncDeleteCount:4,syncConfirmed:true}).ready,true);
});

test('uncertain Git writes, connectivity, auth and busy states never enable Push', () => {
  for (const args of [{pending:true},{busy:true},{online:false},{authenticated:false}]) {
    assert.equal(reviewReadiness({...ready,...args}).ready,false);
  }
  assert.equal(reviewReadiness({...ready,pending:true}).code,'PENDING');
});

test('System theme follows OS preference; manual themes override it', () => {
  assert.equal(resolveTheme('system',true),'light');
  assert.equal(resolveTheme('system',false),'dark');
  assert.equal(resolveTheme('dark',true),'dark');
  assert.equal(resolveTheme('light',false),'light');
  assert.equal(themeChoice('invalid'),'dark');
});

test('SHA and destination helpers ignore invalid input', () => {
  assert.equal(trimSha('a'.repeat(40)),'a'.repeat(12));
  assert.equal(trimSha('not-a-sha'),'');
  assert.equal(selectedRepoLabel('me','repo'),'me/repo');
  assert.equal(selectedRepoLabel(null,'repo'),'');
});

test('Repos has compact launchpad and uses real selected authorization', () => {
  const main=read('app/page.jsx'); const ui=read('app/components/PolishedWorkspace.jsx');
  assert.match(main,/selected=\{chosenRepo\}/);
  assert.match(main,/onWorkspace=\{\(\) => \{ setWorkspaceOpen\(true\)/);
  assert.match(main,/repoTools=\{activeTab === 'repositories' && auth\.authenticated/);
  assert.match(main,/repo-refresh-icon/);
  assert.doesNotMatch(main,/repo-auth-minimal/);
  assert.match(ui,/disabled=\{!selected \|\| disabled\}/);
  assert.match(ui,/WorkspaceLaunchpad/);
  assert.doesNotMatch(ui,/fetch\(|localStorage|sessionStorage/);
});

test('Actionable empty states are read-only and do not create GitHub mutations',()=>{
  const main=read('app/page.jsx'); const ui=read('app/components/PolishedWorkspace.jsx');
  assert.match(main,/<RepositoryEmpty authenticated=\{auth\.authenticated\}/);
  assert.match(main,/<ActivityEmpty canUpload=\{chosenRepo\}/);
  assert.match(ui,/\/api\/auth\/install/);
  assert.match(ui,/Chưa có thao tác Push mới/);
  assert.doesNotMatch(ui,/requestOnce\(|commitPayload|git\/refs/);
});

test('Readiness is visible and remains behind user checkbox and server-backed Push', () => {
  const main=read('app/page.jsx');
  assert.match(main,/<ReviewReadiness state=\{pushReadiness\}/);
  assert.match(main,/disabled=\{!canSubmitPush\}/);
  assert.match(main,/!confirmed \|\| \(mode === 'sync' && stats\?\.delete > 0 && !syncConfirmed\)/);
  assert.match(main,/requestOnce\('commit', commitPayload\)/);
  assert.match(main,/\(requiresConsent && !sensitiveConsent\)/);
});

test('Outcome uses only verified GitHub result and provides safe copy SHA / external links', () => {
  const main=read('app/page.jsx');const ui=read('app/components/PolishedWorkspace.jsx');
  assert.match(main,/<PushOutcome result=\{result\} onCopy=\{copyCommitSha\}/);
  assert.match(main,/const outcome = await requestOnce\('commit', commitPayload\)/);
  assert.match(ui,/\^\[a-f0-9\]\{40\}\$/);
  assert.match(ui,/rel="noopener noreferrer"/);
  assert.equal(createInteractionNotice('sha-copied').tone,'info');
});

test('accessibility: skip link, landmark, focus, mobile touch and reduced motion',()=>{
  const main=read('app/page.jsx');const css=read('app/styles/advanced-ux-polish.css');
  assert.match(main,/href="#zipverra-main"/);
  assert.match(main,/id="zipverra-main" tabIndex=\{-1\}/);
  assert.match(main,/aria-label=\{`Mở \$\{tab\.label\}/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/opacity:0/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('System theme preference can be selected and matchMedia listener cleaned up',()=>{
  const main=read('app/page.jsx');
  assert.match(main,/theme === 'system'/);
  assert.match(main,/resolveTheme\(theme, prefersLight\)/);
  assert.match(main,/query\.addEventListener\?\.\('change', onThemeChange\)/);
  assert.match(main,/query\.removeEventListener\?\.\('change', onThemeChange\)/);
});
