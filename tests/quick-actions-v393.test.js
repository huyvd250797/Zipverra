import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { quickActionRepos, quickProfile, profileDiffers } from '../lib/quick-actions.js';
import { APP_VERSION } from '../lib/pwa-reliability.js';
const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const repos=['team/Finzaro','team/Zipverra','team/SendInt','team/TestPilot','team/Extra'].map(full_name=>({full_name}));
const now=Date.now();

test('v3.9.15 version and CSS cascade are aligned',()=>{
  assert.equal(APP_VERSION,'3.9.15');
  assert.equal(JSON.parse(read('package.json')).version,'3.9.15');
  assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.15/);
  assert.match(read('app/page.jsx'),/Zipverra · v3\.9\.15/);
  const layout=read('app/layout.jsx');
  assert.ok(layout.indexOf('one-screen-v392.css') < layout.indexOf('quick-actions-v393.css'));
});

test('quick access prioritizes latest verified Push, pinned, frequent; never leaks unauthorized repository',()=>{
  const result=quickActionRepos({repos,favorites:['bad/private','team/SendInt','team/Finzaro'],recents:['team/Zipverra','bad/secret','team/Finzaro'],
    usage:[{repo:'team/TestPilot',count:3,lastUsed:now},{repo:'bad/secret',count:100,lastUsed:now}],selected:'team/Finzaro'});
  assert.deepEqual(result.map(r=>r.repo),['team/Zipverra','team/Finzaro','team/SendInt','team/TestPilot']);
  assert.deepEqual(result.map(r=>r.origin),['recent','recent','pinned','frequent']);
  assert.equal(result.find(r=>r.repo==='team/Finzaro').active,true);
});

test('quick picks are case-insensitive, deduplicated and capped at four',()=>{
  const result=quickActionRepos({repos,favorites:['TEAM/FINZARO','team/finzaro','team/SendInt'],
    recents:['TEAM/FINZARO','team/Zipverra'],limit:50});
  assert.deepEqual(result.map(x=>x.repo),['team/Finzaro','team/Zipverra','team/SendInt']);
  assert.ok(result.length<=4);
});

test('profile shortcut only exists for an authorized repo and a valid local profile',()=>{
  const profiles=[{repo:'bad/private',branch:'main',mode:'sync',strategy:'direct',updatedAt:1},
    {repo:'team/Finzaro',branch:'release/2026',mode:'sync',strategy:'pr',updatedAt:100}];
  assert.equal(quickProfile(profiles,repos,'bad/private'),null);
  assert.equal(quickProfile(profiles,repos,'team/Finzaro')?.branch,'release/2026');
  assert.equal(quickProfile([{repo:'team/Finzaro',branch:'../invalid',mode:'sync',strategy:'pr'}],repos,'team/Finzaro'),null);
});

test('profile difference is shown before explicit user action',()=>{
  const profile={repo:'team/Finzaro',branch:'main',mode:'sync',strategy:'pr'};
  assert.equal(profileDiffers(profile,{branch:'main',mode:'merge',strategy:'direct'}),true);
  assert.equal(profileDiffers(profile,{branch:'main',mode:'sync',strategy:'pr'}),false);
  assert.equal(profileDiffers(null,{branch:'main',mode:'merge',strategy:'direct'}),false);
});

test('last-repository auto-restore is fully removed from source and UI',()=>{
  const page=read('app/page.jsx');
  const actions=read('app/components/QuickActions.jsx');
  const helpers=read('lib/quick-actions.js');
  const css=read('app/styles/quick-actions-v393.css');
  assert.doesNotMatch(page,/lastAuthorizedRepo|QUICK_RESTORE_KEY|setQuickRestorePreference|autoRestoredAccountRef|quickRestoreEnabled/);
  assert.doesNotMatch(actions,/autoRestore|onAutoRestoreChange|Tự chọn repo gần nhất|Đổi repo\/áp dụng Profile/);
  assert.doesNotMatch(helpers,/lastAuthorizedRepo|QUICK_RESTORE_KEY/);
  assert.doesNotMatch(css,/zip393-restore-toggle|zip393-quick-note/);
  assert.match(actions,/onClick=\{\(\) => onChoose\(item\.repo\)\}/);
});

test('Upload shortcuts share the existing safe picker and profile callbacks, not new Push action',()=>{
  const page=read('app/page.jsx');
  const component=read('app/components/QuickActions.jsx');
  assert.match(page,/<QuickActions/);
  assert.match(page,/onChoose=\{chooseRepo\}/);
  assert.match(page,/onApplyProfile=\{applyProfile\}/);
  assert.match(page,/onSaveProfile=\{saveProfile\}/);
  assert.match(page,/auth\.authenticated && !loadingRepos && !preview/);
  assert.match(component,/onClick=\{\(\) => onChoose\(item\.repo\)\}/);
  assert.match(component,/onClick=\{\(\) => onApplyProfile\(profile\)\}/);
  assert.doesNotMatch(component,/\bpush\(/);
  assert.match(component,/aria-pressed=\{pinned\}/);
  assert.match(component,/item\.repo\.split\('\/'\)\[0\]/); // Owner is visible, avoiding same-name repo ambiguity
});

test('Profile apply preserves draft warnings and explicit Sync risk confirmation',()=>{
  const page=read('app/page.jsx');
  const scope=page.slice(page.indexOf('async function applyProfile'),page.indexOf('function logLocalAction'));
  assert.match(scope,/askConfirmation/);
  assert.match(scope,/file && phase !== PUSH_STAGES\.SUCCEEDED/);
  assert.match(scope,/profile\.mode === 'sync'/);
  assert.match(scope,/!repos\.some\(r => r\.full_name\.toLowerCase\(\) === profile\.repo\.toLowerCase\(\)\)/);
  assert.match(scope,/reset\(\);goToTab\('home'\)/);
  assert.match(scope,/return true/);
  assert.match(read('app/components/PushProfiles.jsx'),/if\(await onApply\(stored\)\)/);
});

test('quick UI remains compact, responsive and never hides safety details',()=>{
  const css=read('app/styles/quick-actions-v393.css');
  const page=read('app/page.jsx');
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:340px\)/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/focus-visible/);
  assert.match(css,/data-theme="light"/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(page,/onClick=\{push\}/);
  assert.match(page,/ReviewRiskCenter/);
});
