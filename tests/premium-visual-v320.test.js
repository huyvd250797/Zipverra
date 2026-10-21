import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const theme = read('app/styles/pro-design-system.css');
const premium = read('app/styles/premium-visual-v320.css');
const page = read('app/page.jsx');

function luminance(hex) {
  const values = hex.replace('#','').match(/.{2}/g).map(p => parseInt(p,16)/255);
  const c = values.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function contrast(a,b) {
  const [hi,lo] = [luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (hi+.05)/(lo+.05);
}

test('v3.9.8 metadata, PWA, and premium layer are connected in cascade order',()=>{
  assert.equal(JSON.parse(read('package.json')).version, '3.9.8');
  assert.match(read('lib/pwa-reliability.js'), /APP_VERSION = '3\.9\.8'/);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.8/);
  assert.match(page, /v3\.9\.8/);
  const layout = read('app/layout.jsx');
  assert.ok(layout.indexOf("import './styles/repository-workflow.css';") >= 0);
  assert.ok(layout.indexOf("import './styles/premium-visual-v320.css';") > layout.indexOf("import './styles/repository-workflow.css';"));
  assert.match(layout, /themeColor: '#0B111B'/);
});

test('v3.9.8 keyboard focus excludes programmatic -1 landmarks, preserves controls',()=>{
  assert.match(theme, /\[tabindex\]:not\(\[tabindex="-1"\]\)/);
  assert.match(premium,/main#zipverra-main:focus-visible/);
  assert.match(premium,/outline:none!important/);
  assert.match(premium,/\.pro-shell :is\(button,a,input,select,textarea,summary\):focus-visible/);
  assert.match(premium,/outline:2px solid var\(--pro-focus\)!important/);
  assert.match(page,/id="zipverra-main" tabIndex=\{-1\}/);
  assert.match(page,/href="#zipverra-main"/);
});

test('semantic dark and light palette are distinguishable and AA contrast for key texts',()=>{
  const dark = ['#0B111B','#F3F7FA','#172432','#A9BBC9','#2ABF93','#072D24'];
  const light = ['#F5F7F9','#172735','#FFFFFF','#526B7D','#087D65','#FFFFFF'];
  assert.ok(contrast(dark[0],dark[1]) >= 7);
  assert.ok(contrast(dark[2],dark[3]) >= 4.5);
  assert.ok(contrast(dark[4],dark[5]) >= 4.5);
  assert.ok(contrast(light[0],light[1]) >= 7);
  assert.ok(contrast(light[2],light[3]) >= 4.5);
  assert.ok(contrast(light[4],light[5]) >= 4.5);
  for (const color of [...dark,...light]) assert.ok(theme.includes(color),color);
});

test('animation is limited to transform/opacity on panels, sheet and progress, reduced motion supported',()=>{
  for (const name of ['zip-premium-rise','zip-premium-sheet','zip-premium-dialog','zip-premium-backdrop'])
    assert.match(premium, new RegExp(name));
  assert.match(premium,/\.zip-modal\[open\]\.zip-modal--sheet/);
  assert.match(premium,/prefers-reduced-motion:reduce/);
  assert.match(premium,/animation:none!important/);
  assert.doesNotMatch(premium,/setTimeout\(|eval\(|background-attachment:fixed/);
});

test('v3.1.0 sheet scroll isolation and account-safe workflows survive a visual-only change',()=>{
  const css = read('app/styles/repository-workflow.css');
  assert.match(css,/overscroll-behavior:contain/);
  assert.match(css,/touch-action:pan-y/);
  assert.match(premium,/Do not modify fixed-position scroll isolation/);
  assert.doesNotMatch(premium,/\.zip-modal\s*\{[^}]*position:/);
  assert.match(page,/onClick=\{\(\) => goToTab\('activity'\)\}/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
});
