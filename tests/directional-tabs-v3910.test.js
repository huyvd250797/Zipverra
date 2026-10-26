import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../lib/pwa-reliability.js';
import { MOBILE_TABS } from '../lib/mobile-ui.js';
import { TAB_ORDER, tabSlideDirection, canSlideTabs } from '../lib/tab-transitions.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const page=read('app/page.jsx');
const css=read('app/styles/directional-tabs-v3910.css');

test('v3.9.11 PWA cache, React UI and CSS layer are synchronized',()=>{
  assert.equal(APP_VERSION,'3.9.16');
  assert.equal(JSON.parse(read('package.json')).version,'3.9.16');
  assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.16/);
  assert.match(page,/Zipverra · v3\.9\.16/);
  const layout=read('app/layout.jsx');
  assert.ok(layout.indexOf('upload-hub-v399.css')<layout.indexOf('large-upload-progress-v3915.css'));
});
test('tab order matches four navigation destinations',()=>{
  assert.deepEqual([...TAB_ORDER],MOBILE_TABS);
  assert.equal(Object.isFrozen(TAB_ORDER),true);
});
test('all forward and backward jumps derive their direction from taskbar order',()=>{
  for(let i=0;i<TAB_ORDER.length;i++)for(let j=0;j<TAB_ORDER.length;j++){
    assert.equal(tabSlideDirection(TAB_ORDER[i],TAB_ORDER[j]),i===j?'none':i<j?'forward':'backward');
  }
  assert.equal(tabSlideDirection('missing','home'),'none');
  assert.equal(tabSlideDirection('home','missing'),'none');
});
test('native transitions disabled when reduced motion is requested or unsupported',()=>{
  assert.equal(canSlideTabs({startViewTransition(){}},{matchMedia:()=>({matches:false})}),true);
  assert.equal(canSlideTabs({startViewTransition(){}},{matchMedia:()=>({matches:true})}),false);
  assert.equal(canSlideTabs({},{matchMedia:()=>({matches:false})}),false);
  assert.equal(canSlideTabs(null,null),false);
});
test('both old and new views animate concurrently in opposite directions without dimming',()=>{
  for(const name of ['zip410-old-forward','zip410-new-forward','zip410-old-backward','zip410-new-backward']) assert.match(css,new RegExp(`@keyframes ${name}`));
  for(const state of ['forward','backward']) for(const snapshot of ['old','new'])
    assert.ok(css.includes(`html[data-zip-tab-direction="${state}"]::view-transition-${snapshot}(zipverra-tab)`));
  assert.match(css,/::view-transition-old\(root\)/);
  assert.match(css,/::view-transition-new\(root\)/);
  assert.match(css,/animation:none!important/);
  assert.doesNotMatch(css,/opacity\s*:\s*0/);
  assert.match(css,/240ms/);
});
test('rollback baseline uses the stable four-tab navigation without importing experimental motion',()=>{
  assert.match(page,/function goToTab\(tab\)/);
  assert.match(page,/setActiveTab\(tab\)/);
  assert.match(page,/scheduleTabViewport\(window, document, activeTab, activityRef\.current\)/);
  assert.doesNotMatch(read('app/layout.jsx'),/import '\.\/styles\/directional-tabs-v3910\.css'/);
});
test('Push still enters Activity and retains all server mutation safeguards',()=>{
  const start=page.indexOf('async function push()');
  const end=page.indexOf('return <>',start);
  const push=page.slice(start,end);
  assert.match(push,/goToTab\('activity'\)/);
  assert.match(push,/!canSubmitPush/);
  assert.match(push,/requestOnce\('commit', commitPayload\)/);
  assert.match(page,/refreshExpiringAttestations/);
});
test('fallback is horizontal, has no dark-screen pause and supports reduced motion',()=>{
  assert.match(css,/zip410-fallback-forward/);
  assert.match(css,/zip410-fallback-backward/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/filter\s*:\s*brightness\(/);
  assert.doesNotMatch(css,/background\s*:\s*#000/);
});

test('Push closes the consent sheet before entering Activity after explicit confirmation',()=>{
  const push=page.slice(page.indexOf('async function push()'),page.indexOf('return <>',page.indexOf('async function push()')));
  assert.match(push,/setDecisionSheetOpen\(false\)/);
  assert.match(push,/goToTab\('activity'\)/);
  assert.match(push,/!canSubmitPush/);
});
