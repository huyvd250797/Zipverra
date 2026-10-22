import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../lib/pwa-reliability.js';
import { quickActionRepos } from '../lib/quick-actions.js';
import { recordRepositorySelection } from '../lib/repository-suggestions.js';
import { updateRecentRepositories } from '../lib/mobile-ui.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('app/page.jsx');
const css = read('app/styles/desktop-focused-v3913.css');

test('v3.9.14 metadata, public cache and desktop-only layer are aligned', () => {
  assert.equal(APP_VERSION, '3.9.14');
  assert.equal(JSON.parse(read('package.json')).version, APP_VERSION);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.14/);
  assert.match(page, /Zipverra · v3\.9\.14/);
  assert.ok(read('app/layout.jsx').indexOf('upload-hub-v399.css') < read('app/layout.jsx').indexOf('desktop-focused-v3913.css'));
});
test('desktop stage is based on a completed Preview, not just a selected archive', () => {
  assert.match(page, /data-zip-stage=\{preview \? 'review' : 'upload'\}/);
  assert.match(css, /data-zip-stage="upload"/);
  assert.match(css, /data-zip-stage="review"/);
  assert.match(css, /@media \(min-width:761px\)/);
  assert.doesNotMatch(css, /@media\s*\(max-width:760px\)/);
});
test('desktop upload alone is centered and the empty Review is suppressed', () => {
  assert.match(css, /data-zip-stage="upload"\] \.side-column\{display:none!important\}/);
  assert.match(css, /grid-template-columns:minmax\(0,790px\)!important/);
  assert.match(css, /data-zip-stage="upload"\] \.upload-panel/);
});
test('after analysis, desktop review replaces Upload and preserves gated Push in an independent row', () => {
  assert.match(css, /data-zip-stage="review"\] \.form-column\{display:none!important\}/);
  assert.match(css, /grid-template-rows:minmax\(0,1fr\) auto!important/);
  assert.match(css, /data-zip-stage="review"\] \.zip392-action-dock/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(page, /<ReviewRiskCenter summary=\{riskSummary\}/);
  assert.match(page, /disabled=\{!canSubmitPush\}/);
});
test('review stage allows replacing ZIP without adding a GitHub write action', () => {
  assert.match(page, /className="zip3913-desktop-review-toolbar"/);
  assert.match(page, /className="button secondary zip3913-change-zip"/);
  assert.match(page, /onClick=\{\(\) => fileInput\.current\?\.click\(\)\}/);
  assert.doesNotMatch(css, /fetch\(|api\(/);
});
test('selecting repo, selecting profile and analyzing do not mutate repo ranking', () => {
  assert.doesNotMatch(page, /saveRecent\(/);
  for (const [a,b] of [['async function selectAndApplyProfile','function logLocalAction'], ['async function chooseRepo','async function chooseBranch'], ['async function analyze','function finishVerified']]) {
    const section = page.slice(page.indexOf(a),page.indexOf(b));
    assert.doesNotMatch(section, /recordVerifiedPushRepo\(/);
    assert.doesNotMatch(section, /setRecents\(|recordRepositorySelection\(/);
  }
  assert.equal((page.match(/recordVerifiedPushRepo\(`/g)||[]).length,2);
});
test('only confirmed SHA records ranking, including verified PR branch; duplicate verification is deduped', () => {
  const fn = page.slice(page.indexOf('function recordVerifiedPushRepo'),page.indexOf('useEffect(() => {',page.indexOf('function recordVerifiedPushRepo')));
  assert.match(fn, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(fn, /proActivityRef\.current\.some/);
  assert.match(fn, /item\.kind === 'push' && item\.state === 'success'/);
  assert.match(fn, /recordRepositorySelection\(current, value, repos\)/);
  const direct = page.slice(page.indexOf('function finishVerified'),page.indexOf('async function completeVerified'));
  const pr = page.slice(page.indexOf('async function completeVerified'),page.indexOf('async function retryPendingPR'));
  assert.ok(direct.indexOf('recordVerifiedPushRepo') > direct.indexOf('setPhase(PUSH_STAGES.SUCCEEDED)'));
  assert.match(pr, /recordVerifiedPushRepo\(`/);
});
test('successful Push goes to first quick slot, selection only highlights without reordering', () => {
  const repos=['o/Alpha','o/Beta','o/Gamma','o/Delta'].map(full_name=>({full_name}));
  const previous=['o/Beta','o/Gamma'];
  let shortcuts=quickActionRepos({repos,recents:previous,selected:'o/Alpha',favorites:['o/Delta']});
  assert.deepEqual(shortcuts.map(s=>s.repo),['o/Beta','o/Gamma','o/Delta']);
  const afterVerified=updateRecentRepositories(previous,'o/Alpha');
  const usage=recordRepositorySelection([], 'o/Alpha',repos);
  shortcuts=quickActionRepos({repos,recents:afterVerified,favorites:['o/Delta'],usage,selected:'o/Alpha'});
  assert.equal(shortcuts[0].repo,'o/Alpha');
  assert.equal(shortcuts[0].active,true);
});
