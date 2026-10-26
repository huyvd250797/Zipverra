import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
const css = read('app/styles/smooth-motion-v388.css');
const modal = read('app/components/ModalSheet.jsx');
const page = read('app/page.jsx');
const root = read('app/layout.jsx');

test('v3.9.15 app, sw, cache and motion CSS are release-aligned',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'3.9.15');
  assert.match(read('lib/pwa-reliability.js'), /APP_VERSION = '3\.9\.15'/);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.15/);
  assert.ok(root.indexOf('accessibility-visual-qa-v387.css') < root.indexOf('smooth-motion-v388.css'));
});
test('native modal preserves content during prop-driven close and delays physical close',()=>{
  assert.match(modal, /lastContentsRef\.current/);
  assert.match(modal, /const rendered = open \? \{ title, children \} : lastContentsRef\.current/);
  assert.match(modal, /else if \(dialogRef\.current\?\.open\) startExitRef\.current\?\.\(false\)/);
  assert.match(modal, /closeTimerRef\.current = window\.setTimeout\(\(\) => closeNow\(notify\), duration\)/);
  assert.match(modal, /if \(dialog\.open\) dialog\.close\(\)/);
});
test('modal dismissal waits for animation and never approves confirmation implicitly',()=>{
  assert.match(modal, /const onCancel = event => \{ event\.preventDefault\(\); requestClose\(\); \}/);
  assert.match(modal, /if \(notify\) callbackRef\.current\?\.\(\)/);
  assert.match(read('app/components/InteractionFeedback.jsx'), /onClose=\{\(\) => onAnswer\(false\)\}/);
  assert.match(modal, /if \(dialog\.open\) return;/);
  assert.match(modal, /window\.clearTimeout\(closeTimerRef\.current\)/);
});
test('enter/leave styles include sheet slide, modal fade+scale, and backdrop crossfade',()=>{
  for (const key of ['zip388-slide-up','zip388-slide-down','zip388-dialog-enter','zip388-dialog-leave','zip388-dim-enter','zip388-dim-leave']) assert.match(css,new RegExp(`@keyframes ${key}`));
  assert.match(css,/zip-modal--sheet\.zip-modal--exiting/);
  assert.match(css,/\.zip-modal\[open\]\.zip-modal--exiting::backdrop/);
  assert.match(css,/pointer-events:none/);
});
test('tab switch reverses before next view and animates title without reloading app',()=>{
  assert.match(page, /setViewExiting\(true\)/);
  assert.match(page, /setActiveTab\(tab\); setViewExiting\(false\); \}, 175\)/);
  assert.match(page, /data-view-exiting=\{viewExiting \? "true" : undefined\}/);
  assert.match(css, /@keyframes zip388-view-out/);
  assert.match(css, /@keyframes zip388-view-in/);
});
test('smooth accordion fallback, reduced motion and no GitHub progress animation',()=>{
  assert.match(css, /@supports \(interpolate-size:allow-keywords\) and selector\(details::details-content\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.workspace-edit-pane/);
  assert.match(css, /\.branch-pr-merge/);
  assert.doesNotMatch(css,/\.progress-fill\s*\{/);
  assert.doesNotMatch(modal,/fetch\(|requestOnce\('commit'/);
  assert.doesNotMatch(page,/className="transfer-meter"/);
});
