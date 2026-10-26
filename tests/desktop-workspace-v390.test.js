import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../lib/pwa-reliability.js';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const page = read('app/page.jsx');
const css = read('app/styles/desktop-workspace-v390.css');
const layout = read('app/layout.jsx');

test('v3.9.16 desktop workbench is a responsive layer loaded after prior mobile styles',()=>{
  assert.equal(APP_VERSION,'3.9.16');
  assert.equal(JSON.parse(read('package.json')).version,'3.9.16');
  assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.16/);
  assert.ok(layout.indexOf('large-archive-v389.css') < layout.indexOf('desktop-workspace-v390.css'));
  assert.match(css,/\.desktop-workspace-nav,\.desktop-session-bar,\.desktop-topbar-path\{display:none\}/);
  assert.match(css,/@media \(min-width:1100px\)/);
  assert.match(css,/@media \(min-width:761px\)/);
});

test('persistent desktop navigation preserves four existing tabs and routes via existing guard',()=>{
  assert.match(page,/const DESKTOP_TAB_ORDER = Object\.freeze\(\['home','activity','history','settings'\]\)/);
  assert.match(page,/DESKTOP_TAB_ORDER\.map\(id/);
  assert.match(page,/onClick=\{\(\) => goToTab\(id\)\}/);
  assert.match(page,/onClick=\{\(\) => goToTab\(tab\.id\)\}/);
  assert.match(page,/function goToTab\(tab\)/);
  assert.match(page,/!canLeaveWorkspace\(tab\)/);
  assert.match(page,/aria-current=\{activeTab === id \? 'page' : undefined\}/);
});

test('desktop renders active panels and mobile uses four tabs',()=>{
  assert.match(css,/main\[data-active-view/); // panel visibility is scoped to main
  for(const section of ['home','activity','history','settings']){
    assert.ok(css.includes(`data-active-view="${section}"`));
  }
  assert.match(css,/main\[data-active-view="home"\] \.repository-panel\{display:none!important\}/);
  assert.match(css,/\.desktop-workspace-nav\{display:flex/);
  assert.doesNotMatch(css,/@media\s*\(max-width:760px\)/);
  assert.match(read('app/globals.css'),/\.mobile-bottom-nav\{display:grid/);
});

test('upload stays paired with independent Review; GitHub guards and confirmation remain intact',()=>{
  assert.match(css,/main\[data-active-view="home"\] \.content-grid\{grid-template-columns/);
  assert.match(css,/main\[data-active-view="home"\] \.preview-panel\{min-height:0;max-height/);
  assert.match(page,/<ReviewRiskCenter summary=\{riskSummary\}/);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
  assert.match(page,/setFileDetailsOpen\(false\)/);
  assert.match(page,/await refreshExpiringAttestations/);
  assert.doesNotMatch(css,/pointer-events:\s*auto\s*!important/);
});

test('desktop respects keyboard accessibility and reduced motion',()=>{
  assert.match(css,/\.desktop-rail-link:focus-visible/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.desktop-workspace-nav.*overflow-y:auto/);
  assert.match(css,/overscroll-behavior:contain/);
  assert.match(css,/scrollbar-width:thin/);
});
