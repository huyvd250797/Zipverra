import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInteractionNotice, shouldAnnounceEvent } from '../lib/interaction-feedback.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');

test('v3.9.0 has separate optional motion layer loaded last',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'3.9.0');
  const layout=read('app/layout.jsx');
  assert.ok(layout.indexOf('pro-design-system.css') < layout.indexOf('pro-motion.css'));
  for(const css of ['--motion-quick','--motion-enter','--motion-steady','--motion-curve','pro-toast-region','pro-skeleton','pro-enter','pro-toast-enter','prefers-reduced-motion:reduce'])
    assert.ok(read('app/styles/pro-motion.css').includes(css),css);
});
test('notification catalogue is immutable-by-copy, bounded and never includes untrusted strings',()=>{
  const notice=createInteractionNotice('repo-selected');
  notice.title='Tampered!';
  assert.equal(createInteractionNotice('repo-selected').title,'Repository đã được chọn');
  assert.equal(createInteractionNotice('arbitrary-token-or-error'),null);
});
test('unknown notices are suppressed, success is gated on actual verification',()=>{
  assert.equal(createInteractionNotice('UNKNOWN'),null);
  assert.equal(shouldAnnounceEvent('push-verified'),false);
  assert.equal(shouldAnnounceEvent('pr-verified',false),false);
  assert.equal(shouldAnnounceEvent('push-verified',true),true);
  assert.equal(shouldAnnounceEvent('pr-verified',true),true);
  assert.equal(shouldAnnounceEvent('action-failed'),true);
});
test('toast has accessible announcement and dismissal with stale-id guard',()=>{
  const ui=read('app/components/InteractionFeedback.jsx');
  const page=read('app/page.jsx');
  assert.match(ui,/role=\{notice\.tone === 'error' \? 'alert' : 'status'\}/);
  assert.match(ui,/aria-live=\{notice\.tone === 'error' \? 'assertive' : 'polite'\}/);
  assert.match(ui,/window\.clearTimeout\(timer\)/);
  assert.match(ui,/startClose\(notice\.id\)/);
  assert.match(page,/dismissQueuedNotice\(current, id\)/);
  assert.match(page,/<FeedbackToast notice=\{notifications\.active\} queuedCount=\{notifications\.queued\.length\} onDismiss=\{dismissNotice\}/);
});
test('toast never echoes raw GitHub error or secret payload',()=>{
  for(const event of ['repo-selected','zip-invalid','review-ready','no-changes','push-verified','pr-verified','action-failed','network-offline','network-online']) {
    const notice=createInteractionNotice(event);
    assert.ok(notice?.duration>=3000 && notice.duration<=6500);
    assert.match(notice.tone,/^(success|info|warning|error)$/);
    assert.ok(!JSON.stringify(notice).includes('ghp_'));
  }
  const src=read('lib/interaction-feedback.js');
  assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|access_token|NEXT_PUBLIC_/);
});
test('only verified GitHub operation emits final success toast',()=>{
  const page=read('app/page.jsx');
  assert.match(page,/function finishVerified\(outcome\)[\s\S]*?notify\('push-verified', true\)/);
  assert.match(page,/const pr = await requestOnce\('pull-request\/create', prData\);[\s\S]*?notify\('pr-verified', true\)/);
  assert.match(page,/if \(!preview \|\| !selectedChanges\.length \|\| \(requiresConsent && !sensitiveConsent\) \|\| !confirmed/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
});
test('skeleton appears for async chunks, authorization and ZIP analysis',()=>{
  const page=read('app/page.jsx');
  const ui=read('app/components/InteractionFeedback.jsx');
  for(const name of ['HistoryPanel','WorkspacePanel','BranchPrPanel','ProDashboard','PushProfiles','ActivityJournal'])
    assert.match(page,new RegExp(`<LoadingSkeleton kind="panel" label="Đang tải ${name}`));
  assert.match(page,/loadingRepos && <LoadingSkeleton kind="repos"/);
  assert.match(page,/auth\.loading \? <LoadingSkeleton kind="inline"/);
  assert.match(page,/phase === PUSH_STAGES\.ANALYZING \|\| phase === PUSH_STAGES\.PREFLIGHT/);
  assert.match(ui,/aria-busy="true"/);
  assert.match(ui,/aria-hidden="true"/);
});
test('motion is transform/opacity only, safe on iPhone and disabled in reduced motion',()=>{
  const css=read('app/styles/pro-motion.css');
  assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
  assert.match(css,/touch-action:manipulation/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.pro-shell main\[data-active-view\]/);
  assert.match(css,/\.pro-stepper-rail>span/);
  assert.match(css,/animation:pro-soft-shimmer 1\.7s linear infinite/);
  assert.match(css,/\.pro-skeleton-avatar:after,\.pro-skeleton-title:after,\.pro-skeleton-lines span:after \{animation:none!important;\}/);
});
test('tab transitions preserve main workflow state, data-mobile-view and five tabs',()=>{
  const page=read('app/page.jsx');
  assert.match(page,/function goToTab\(tab\)/);
  assert.match(page,/setActiveTab\(tab\)/);
  assert.match(page,/<UXViewIntro activeTab=\{activeTab\} key=\{activeTab\}/);
  assert.match(page,/data-active-view=\{activeTab\}/);
  assert.equal((page.match(/\{id:'(?:repositories|home|activity|history|settings)',label:/g)||[]).length,5);
  assert.match(page,/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
});
