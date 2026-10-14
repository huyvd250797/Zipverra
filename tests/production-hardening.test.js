import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readLimitedJson, RequestBodyError, MAX_JSON_BODY_BYTES } from '../lib/request-body.js';
import { positionTabViewport, scheduleTabViewport } from '../lib/tab-scroll.js';
import config from '../next.config.mjs';

const source = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

function post(body, headers = {}) {
  return new Request('https://zipverra.example/api/github/preflight', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body,
  });
}

test('bounded JSON parser accepts a normal GitHub request without modifying values', async () => {
  const data = { owner: 'demo', repo: 'project', branch: 'main', paths: ['src/app.tsx'] };
  assert.deepEqual(await readLimitedJson(post(JSON.stringify(data))), data);
});

test('declared and actual oversized JSON are both rejected before any GitHub mutation', async () => {
  await assert.rejects(() => readLimitedJson(post('{}', { 'Content-Length': String(MAX_JSON_BODY_BYTES+1) })),
    e => e instanceof RequestBodyError && e.status === 413);
  const big = `{"blob":"${'a'.repeat(1000)}"}`;
  await assert.rejects(() => readLimitedJson(post(big), 200),
    e => e instanceof RequestBodyError && e.status === 413);
});

test('malformed JSON and missing body have safe error messages', async () => {
  await assert.rejects(() => readLimitedJson(post('{broken')), e => e.status === 400 && !e.message.includes('broken'));
  const empty = new Request('https://zipverra.example/api/github/preflight', {method:'POST'});
  await assert.rejects(() => readLimitedJson(empty), e => e.status === 400);
  assert.match(source('lib/http.js'), /readLimitedJson\(request\)/);
});

test('global response headers prevent framing and content sniffing; SW retains no-store', async () => {
  assert.equal(config.poweredByHeader, false);
  const rules = await config.headers();
  const general = rules.find(rule => rule.source === '/:path*');
  const sw = rules.find(rule => rule.source === '/sw.js');
  assert.ok(general && sw);
  const map = Object.fromEntries(general.headers.map(x=>[x.key,x.value]));
  assert.equal(map['X-Frame-Options'],'DENY');
  assert.equal(map['X-Content-Type-Options'],'nosniff');
  assert.equal(map['Referrer-Policy'],'strict-origin-when-cross-origin');
  assert.match(sw.headers.find(x => x.key === 'Cache-Control').value,/no-store/);
});

function viewport(mobile) {
  const calls = [], tasks = [], styles = { scrollBehavior:'smooth' };
  const doc = {documentElement:{style:styles,scrollTop:800},body:{scrollTop:800}};
  const win = {
    matchMedia: () => ({ matches:mobile }),
    scrollTo: (...args) => calls.push(['window', ...args]),
    requestAnimationFrame: callback => {tasks.push(callback); return tasks.length;},
    cancelAnimationFrame: () => {},
  };
  const flush = () => tasks.shift()?.();
  return {win,doc,calls,flush,styles};
}

test('Activity tab scrolls to absolute page top on iPhone AFTER rendering, twice for Safari layout', () => {
  const v = viewport(true);
  const cleanup = scheduleTabViewport(v.win,v.doc,'activity',null);
  assert.equal(v.calls.length,0); // not before React layout update
  v.flush();
  assert.equal(v.calls.length,1);
  assert.equal(v.doc.documentElement.scrollTop,0);
  assert.equal(v.doc.body.scrollTop,0);
  v.flush();
  assert.equal(v.calls.length,2);
  assert.equal(v.calls[1][1].top,0);
  assert.equal(v.calls[1][1].behavior,'instant');
  assert.equal(v.styles.scrollBehavior,'smooth');
  cleanup();
});

test('Desktop still aligns Activity panel, while other tabs go to top',()=>{
  const v = viewport(false); let aligned=0;
  const element = {isConnected:true,scrollIntoView:(opt)=>{aligned++;assert.equal(opt.block,'start');}};
  positionTabViewport(v.win,v.doc,'activity',element);
  assert.equal(aligned,1);assert.equal(v.calls.length,0);
  positionTabViewport(v.win,v.doc,'repositories',element);
  assert.equal(v.calls.length,1);
});

test('Navigation scroll cleanup avoids stale animation and restores smooth-scroll preference',()=>{
  const v=viewport(true);
  const cleanup=scheduleTabViewport(v.win,v.doc,'activity',null);
  cleanup();v.flush();
  assert.equal(v.calls.length,0);
  assert.equal(v.styles.scrollBehavior,'smooth');
});

test('Live Push Flow appears before Recovery Center and Recent Actions; no push retry added',()=>{
  const page=source('app/page.jsx');
  assert.ok(page.indexOf('id="activity-live-flow"') < page.indexOf('<RecoveryCenter push={pendingCommit}'));
  assert.ok(page.indexOf('<RecoveryCenter push={pendingCommit}') < page.indexOf('<ActivityJournal items={proActivity}'));
  assert.match(page,/setPhase\(PUSH_STAGES\.UPLOADING\);[\s\S]*?goToTab\('activity'\)/);
  assert.match(page,/useEffect\(\(\) => \{\s*return scheduleTabViewport\(window, document, activeTab, activityRef\.current\);/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
  assert.doesNotMatch(source('lib/tab-scroll.js'),/fetch\(|localStorage|sessionStorage|requestOnce\(/);
});

test('Production errors do not echo internal error.message or repeat operations',()=>{
  const error=source('app/error.jsx'), notFound=source('app/not-found.jsx');
  assert.match(error,/function ErrorBoundary/);
  assert.doesNotMatch(error,/error\.message|requestOnce\(|fetch\(/);
  assert.match(notFound,/Không tìm thấy trang/);
  assert.match(source('app/layout.jsx'),/production-hardening\.css/);
});
