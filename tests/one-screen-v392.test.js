import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../lib/pwa-reliability.js';
const read=(name)=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const page=read('app/page.jsx');
const css=read('app/styles/one-screen-v392.css');
const layout=read('app/layout.jsx');

test('v3.9.6 runtime, PWA cache, shell and final CSS layer match',()=>{
  assert.equal(APP_VERSION,'3.9.6');
  assert.equal(JSON.parse(read('package.json')).version,'3.9.6');
  assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.6/);
  assert.match(page,/Zipverra · v3\.9\.6/);
  assert.ok(layout.indexOf('smart-compact-v391.css') < layout.indexOf('one-screen-v392.css'));
});

test('open directly at Upload with a safe GitHub login path',()=>{
  assert.match(page,/useState\('home'\)/);
  assert.match(page,/href="\/api\/auth\/login"/);
  assert.match(page,/!auth\.loading && !auth\.authenticated && <a className="button primary full zip392-login"/);
  assert.match(page,/disabled=\{!auth\.authenticated \|\| busy \|\| Boolean\(pendingCommit \|\| pendingPR\)\}/);
});

test('repository and branch can be chosen inside Upload without changing the tab',()=>{
  assert.match(page,/className="zip392-target-switch" role="group"/);
  assert.match(page,/className="zip392-target-repo"[^\n]+onClick=\{\(\) => setRepoSheetOpen\(true\)\}/);
  assert.match(page,/className="zip392-target-branch"[^\n]+onClick=\{\(\) => setBranchSheetOpen\(true\)\}/);
  assert.match(page,/className="desktop-target-repo"[^\n]+onClick=\{\(\) => setRepoSheetOpen\(true\)\}/);
  assert.match(page,/<RepositoryPickerSheet open=\{repoSheetOpen\}/);
  assert.match(page,/<BranchPickerSheet open=\{branchSheetOpen\}/);
});

test('selected ZIP condenses into a summary while retaining a real user-activated file picker',()=>{
  assert.match(page,/className="zip392-source-compact" role="status"/);
  assert.match(page,/fileInput\.current\?\.click\(\)\} aria-label="Chọn ZIP khác"/);
  assert.match(page,/accept="\.zip,application\/zip,application\/x-zip-compressed"/);
  assert.match(page,/onChange=\{\(e\) => chooseFile\(e\.target\.files\?\.\[0\]\)\}/);
  assert.match(page,/zip392-reviewed/);
  assert.match(css,/\.zip392-source-compact/);
  assert.match(css,/\.upload-panel \.drop-zone/);
});

test('Review uses one dock and exactly one Push invocation, with original readiness gate',()=>{
  assert.equal((page.match(/onClick=\{push\}/g)||[]).length,1);
  assert.match(page,/className="zip392-action-dock zip396-action-dock" data-mobile-view="home"/);
  assert.match(page,/className="confirm-row zip392-dock-consent"/);
  assert.match(page,/disabled=\{!canSubmitPush\} aria-describedby="push-readiness-help" onClick=\{push\}/);
  assert.match(page,/const canSubmitPush = pushReadiness\.ready/);
  assert.match(page,/<ReviewRiskCenter summary=\{riskSummary\}/);
  assert.match(page,/requiresConsent && !sensitiveConsent/);
  assert.match(page,/projectMismatchConfirmed/);
});

test('high-risk, sync, pending and busy states still block the consent and submit controls',()=>{
  for(const flag of [
    'busy || !selectedChanges.length',
    '(requiresConsent && !sensitiveConsent)',
    "preview.identity?.severity === 'critical' && !projectMismatchConfirmed",
    'riskSummary.pendingCount > 0',
    'Boolean(pendingCommit || pendingPR)',
    'setSyncConfirmed(false)',
    'setConfirmed(false)'
  ]) assert.ok(page.includes(flag),flag);
  assert.match(page,/onSecurityDecision=\{\(\) => setSecurityDialogOpen\(true\)\}/);
  assert.match(page,/onSyncConsent=\{\(value\) => \{ setSyncConfirmed\(value\); setConfirmed\(false\); \}\}/);
});

test('mobile Review is bounded with safe-area Push dock above five-tab navigation',()=>{
  assert.match(css,/@media \(max-width:760px\)/);
  assert.match(css,/height:max\(190px,calc\(100dvh - 365px\)\)/);
  assert.match(css,/overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain/);
  assert.match(css,/position:fixed;z-index:90/);
  assert.match(css,/bottom:calc\(67px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.match(page,/className="mobile-bottom-nav"/);
  assert.match(css,/\.zip392-target-switch button/);
  assert.match(css,/min-height:44px/);
});

test('desktop keeps independent Review scroll and a separate, visible action row',()=>{
  assert.match(css,/@media \(min-width:1100px\)/);
  assert.match(css,/grid-template-rows:minmax\(0,1fr\) auto/);
  assert.match(css,/scrollbar-gutter:stable/);
  assert.match(css,/display:grid!important;gap:8px/);
  assert.match(css,/@media \(min-width:761px\) and \(max-width:1099px\)/);
});

test('no forced scrollIntoView to Review after ZIP analysis',()=>{
  const workflow=page.slice(page.indexOf('// Do not scroll the document'),page.indexOf('function goToDecision'));
  assert.doesNotMatch(workflow,/scrollIntoView/);
  assert.match(workflow,/previewRef\.current\?\.scrollTo\?\./);
  assert.doesNotMatch(workflow,/window\.scrollTo/);
});

test('Reduced Motion and virtual keyboard are respected; no blanket overflow hidden',()=>{
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:has\(\.review-toolbar input:focus\)/);
  assert.doesNotMatch(css,/body\s*\{[^}]*overflow\s*:\s*hidden/);
  assert.match(css,/safe-area-inset-left/);
  assert.match(css,/safe-area-inset-right/);
});
