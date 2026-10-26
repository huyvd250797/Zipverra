import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../lib/pwa-reliability.js';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const page=read('app/page.jsx');
const css=read('app/styles/desktop-redesign-v3914.css');
const layout=read('app/layout.jsx');

test('v3.9.15 runtime, PWA, package and desktop stylesheet are aligned',()=>{
  assert.equal(APP_VERSION,'3.9.15');
  assert.equal(JSON.parse(read('package.json')).version,'3.9.15');
  assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.15/);
  assert.match(page,/Zipverra · v3\.9\.15/);
  assert.ok(layout.indexOf('desktop-focused-v3913.css') < layout.indexOf('desktop-redesign-v3914.css'));
});
test('desktop redesign is breakpoint-scoped and never changes mobile presentation rules',()=>{
  assert.match(css,/\.zip3914-desktop-stage,\.zip3914-upload-section-title,\.zip3914-desktop-choose-repo\{display:none\}/);
  assert.match(css,/@media \(min-width:761px\)/);
  assert.doesNotMatch(css,/@media\s*\(max-width:760px\)/);
});
test('desktop-only stage distinguishes ZIP upload from reviewed ZIP',()=>{
  assert.match(page,/data-zip-stage=\{preview \? 'review' : 'upload'\}/);
  assert.match(page,/className="zip3914-desktop-stage"/);
  assert.match(page,/preview \? 'Kiểm tra bản cập nhật' : 'Cập nhật source'/);
  assert.match(css,/data-zip-stage="upload"/);
  assert.match(css,/data-zip-stage="review"/);
});
test('desktop Upload is a composed workspace with no empty Review side column',()=>{
  assert.match(css,/data-zip-stage="upload"\] \.side-column\{display:none!important\}/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(290px,\.78fr\)/);
  assert.match(css,/\.upload-panel>\.zip393-quick-actions/);
  assert.match(css,/\.upload-panel>\.drop-zone/);
  assert.match(css,/\.zip3914-desktop-choose-repo/);
  assert.match(page,/onClick=\{\(\) => setRepoSheetOpen\(true\)\}/);
});
test('source ZIP download and incoming ZIP chooser remain distinct actions',()=>{
  assert.match(page,/<SourceZipDownload owner=\{owner\}/);
  assert.match(page,/className=\{`drop-zone /);
  assert.match(page,/onChange=\{\(e\) => chooseFile\(e\.target\.files\?\.\[0\]\)\}/);
  assert.match(css,/SOURCE TRÊN GITHUB/);
  assert.match(page,/className="zip3913-desktop-review-toolbar"/);
});
test('Review is standalone desktop workspace: independent scrolling and separate non-overlapping commit panel',()=>{
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(288px,328px\)!important/);
  assert.match(css,/\.side-column>\.preview-panel/);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/\.zip392-action-dock\{display:block!important;position:static!important/);
  assert.match(page,/<ReviewRiskCenter summary=\{riskSummary\}/);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
});
test('critical warnings and final acknowledgement remain independent before any Push',()=>{
  assert.match(page,/riskSummary\.pendingCount > 0/);
  assert.match(page,/onSecurityDecision=\{\(\) => setSecurityDialogOpen\(true\)\}/);
  assert.match(page,/onMismatchConsent=\{\(value\) => \{ setProjectMismatchConfirmed\(value\); setConfirmed\(false\); \}\}/);
  assert.match(page,/onSyncConsent=\{\(value\) => \{ setSyncConfirmed\(value\); setConfirmed\(false\); \}\}/);
  assert.match(page,/const canSubmitPush = pushReadiness\.ready/);
});
test('repo selection never reorders shortcuts, verified commits retain the existing ranking logic',()=>{
  const choose=page.slice(page.indexOf('async function chooseRepo'),page.indexOf('async function chooseBranch'));
  const analysis=page.slice(page.indexOf('async function analyze'),page.indexOf('function finishVerified'));
  assert.doesNotMatch(choose,/recordVerifiedPushRepo\(|recordRepositorySelection\(/);
  assert.doesNotMatch(analysis,/recordVerifiedPushRepo\(/);
  assert.match(page,/recordVerifiedPushRepo\(`/);
});
test('desktop tabs skip delayed opacity exit, without altering mobile navigation delay',()=>{
  assert.match(page,/&& !window\.matchMedia\?\.\('\(min-width: 761px\)'\)\.matches/);
  assert.match(css,/\.pro-shell main \.content-grid \[data-mobile-view\]\{animation:none!important\}/);
});
test('compact laptop layout puts ZIP picker ahead of favorites and has no horizontal overflow intent',()=>{
  assert.match(css,/@media \(min-width:761px\) and \(max-width:1099px\)/);
  assert.match(css,/\.upload-panel>\.drop-zone\{grid-row:3\}/);
  assert.match(css,/\.upload-panel>\.zip393-quick-actions\{min-height:0;grid-row:4\}/);
  assert.match(css,/overflow-x:clip/);
});
test('redesign is presentation-only: no new GitHub APIs or credential stores',()=>{
  assert.doesNotMatch(css,/fetch\(|api\(|localStorage|sessionStorage|GITHUB_APP_CLIENT_SECRET|NEXT_PUBLIC_/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
  assert.match(page,/refreshExpiringAttestations/);
});
