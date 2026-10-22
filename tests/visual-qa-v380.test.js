import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reviewReadiness } from '../lib/ux-polish.js';
import { reviewDisclosureDefaultOpen } from '../lib/premium-workflow.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('app/page.jsx');
const css = read('app/styles/visual-qa-v380.css');
const layout = read('app/layout.jsx');

test('v3.9.14 consistent runtime, service worker cache, footer and stylesheet order',()=>{
  assert.equal(JSON.parse(read('package.json')).version, '3.9.14');
  assert.match(read('lib/pwa-reliability.js'), /APP_VERSION = '3\.9\.14'/);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.14/);
  assert.match(page, /Zipverra · v3\.9\.14/);
  assert.ok(layout.indexOf('modal-motion-v360.css') < layout.indexOf('visual-qa-v380.css'));
});

test('large file review stays bounded with keyboard scrolling and no page-height explosion',()=>{
  assert.match(css, /\.review-list\s*\{[^}]*max-height:clamp\(/s);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /overscroll-behavior-y:contain/);
  assert.match(read('app/components/VirtualReviewList.jsx'), /className="change-list review-list zip395-review-list" role="region" tabIndex=\{0\}/);
  assert.equal(reviewDisclosureDefaultOpen(2500), false);
  assert.equal(reviewDisclosureDefaultOpen(10), true);
});

test('return actions use gated original consent instead of duplicating commit controls',()=>{
  assert.match(page, /function goToDecision\(\)/);
  assert.match(page, /setFileDetailsOpen\(false\)/);
  assert.match(page, /decisionRef\.current/);
  assert.match(page, /decision\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(page, /className="review-return-bar"/);
  assert.match(page, /className="review-return-bottom"/);
  assert.equal((page.match(/onClick=\{push\}/g)||[]).length,1);
  assert.match(page, /disabled=\{!canSubmitPush\}/);
  assert.match(page, /ref=\{decisionRef\} tabIndex=\{-1\}/);
});

test('changing selection always invalidates both confirmations and blocks unsafe actions',()=>{
  assert.match(page, /function updateSelection\(path\)[\s\S]*?setConfirmed\(false\); setSyncConfirmed\(false\);/);
  assert.match(page, /function bulkSelection\(keep\)[\s\S]*?setConfirmed\(false\); setSyncConfirmed\(false\);/);
  assert.match(page, /setConfirmed\(false\); setSyncConfirmed\(false\); setSensitiveConsent\(false\);[\s\S]*?setStatus\(changes\.length/);
  assert.match(page, /securityReport\?\.critical, sensitiveFindings\.length/);
  const args = {hasPreview:true,selectedCount:2000,critical:0,authenticated:true,online:true,busy:false,pending:false,confirmed:true,syncDeleteCount:2,syncConfirmed:true};
  assert.equal(reviewReadiness(args).ready,true);
  for(const changes of [{confirmed:false},{syncConfirmed:false},{critical:1},{pending:true},{online:false}]){
    assert.equal(reviewReadiness({...args,...changes}).ready,false);
  }
});

test('mobile safe zones, touch targets, motion preferences and focused landmarks remain visible',()=>{
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /--zip-v380-target:44px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /env\(safe-area-inset-bottom,0px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /word-break:break-word/);
});
