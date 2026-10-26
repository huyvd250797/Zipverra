import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../lib/pwa-reliability.js';
import {quickActionRepos} from '../lib/quick-actions.js';
import {usageFromActivity} from '../lib/repository-suggestions.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const page=read('app/page.jsx');
const css=read('app/styles/smooth-tab-performance-v3911.css');
const sha=x=>x.repeat(40);

test('v3.9.11 aligns runtime, package, cache and final motion layer',()=>{
 assert.equal(APP_VERSION,'3.9.15');
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.15/);
 assert.match(page,/Zipverra · v3\.9\.15/);
 const layout=read('app/layout.jsx');
 assert.ok(layout.indexOf('desktop-redesign-v3914.css') < layout.indexOf('large-upload-progress-v3915.css')); 
});
test('choosing a repository, applying a Profile and analysing ZIP never reshuffle quick picks',()=>{
 const choose=page.slice(page.indexOf('async function chooseRepo'),page.indexOf('async function chooseBranch'));
 const analyze=page.slice(page.indexOf('async function analyze()'),page.indexOf('function finishVerified'));
 const profiles=page.slice(page.indexOf('async function selectAndApplyProfile'),page.indexOf('function logLocalAction'));
 for (const scope of [choose,analyze,profiles]) {
   assert.doesNotMatch(scope,/saveRecent\(|recordVerifiedPushRepo\(|recordRepositorySelection\(/);
 }
});
test('repo ranking is recorded only after verified GitHub commit for Direct Push and PR',()=>{
 const verified=page.slice(page.indexOf('function recordVerifiedPushRepo'),page.indexOf('useEffect(() => {',page.indexOf('function recordVerifiedPushRepo')));
 assert.match(verified,/recordRepositorySelection\(current, value, repos\)/);
 assert.match(verified,/item\.kind === 'push' && item\.state === 'success'/);
 assert.match(verified,/sha\.toLowerCase\(\)/);
 const direct=page.slice(page.indexOf('function finishVerified'),page.indexOf('async function completeVerified'));
 const pr=page.slice(page.indexOf('async function completeVerified'),page.indexOf('async function retryPendingPR'));
 assert.ok(direct.indexOf('recordVerifiedPushRepo(')>0);
 assert.ok(direct.indexOf('recordVerifiedPushRepo(')<direct.indexOf("logLocalAction({kind:'push'"));
 assert.ok(pr.indexOf('recordVerifiedPushRepo(')>0);
 assert.ok(pr.indexOf('recordVerifiedPushRepo(')<pr.indexOf("logLocalAction({kind:'push'"));
});
test('Push attempts and failure paths never promote a repository',()=>{
 const push=page.slice(page.indexOf('async function push()'),page.indexOf('return <>',page.indexOf('async function push()')));
 assert.doesNotMatch(push,/recordVerifiedPushRepo\(/);
 assert.match(push,/requestOnce\('commit', commitPayload\)/);
 assert.match(push,/await completeVerified\(outcome, commitPayload\)/);
});
test('most recent verified Push is first, even when other repositories are pinned',()=>{
 const repos=['team/A','team/B','team/C','team/D'].map(full_name=>({full_name}));
 const before=quickActionRepos({repos,recents:['team/A','team/B'],favorites:['team/C','team/D']});
 assert.deepEqual(before.map(x=>x.repo),['team/A','team/B','team/C','team/D']);
 const after=quickActionRepos({repos,recents:['team/D','team/A','team/B'],favorites:['team/C','team/D']});
 assert.deepEqual(after.map(x=>x.repo),['team/D','team/A','team/B','team/C']);
});
test('migration from local Activity excludes selections, edits and unverified attempts',()=>{
 const events=[
   {repo:'team/A',kind:'push',state:'failed',sha:sha('a'),at:100},
   {repo:'team/B',kind:'quick-edit',state:'success',sha:sha('b'),at:101},
   {repo:'team/C',kind:'push',state:'success',sha:sha('c'),at:103},
   {repo:'team/A',kind:'push',state:'success',sha:sha('d'),at:104},
   {repo:'team/D',kind:'push',state:'success',sha:'invalid',at:110},
 ];
 assert.deepEqual(usageFromActivity(events,200).map(x=>x.repo),['team/A','team/D','team/C','team/B']); // historical v3.9.14 migration behavior
});
test('only the work surface is snapshotted and simultaneous slide avoids nested entrance effects',()=>{
 assert.match(css,/#zipverra-main \{view-transition-name:none!important/);
 assert.match(css,/\.pro-view-intro \{view-transition-name:none!important/);
 assert.match(css,/#zipverra-main > \.content-grid \{view-transition-name:zipverra-tab/);
 assert.match(css,/zip410-switching[\s\S]*animation:none!important/);
 assert.match(css,/zip410-old-forward/);
 assert.match(css,/zip410-new-backward/);
 assert.doesNotMatch(css,/opacity:0|brightness\(/);
});
test('viewport scroll correction does not run twice while transition is active',()=>{
 assert.match(page,/scheduleTabViewport\(window, document, activeTab, activityRef\.current\)/);
 assert.match(page,/function goToTab\(tab\)/);
 assert.match(css,/195ms/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
