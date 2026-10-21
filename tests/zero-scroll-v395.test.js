import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clampWorkspaceHeight, keyboardOccluded, virtualWindow } from '../lib/viewport-layout.js';
import { installViewportLayout } from '../lib/viewport-layout-client.js';
import { APP_VERSION } from '../lib/pwa-reliability.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');

test('v3.9.6 version synchronized across runtime, PWA and UI',()=>{
  assert.equal(APP_VERSION,'3.9.6');
  assert.equal(JSON.parse(read('package.json')).version, APP_VERSION);
  assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.6/);
  assert.match(read('app/page.jsx'),/Zipverra · v3\.9\.6/);
});
test('v3.9.6 visual stylesheet is imported after adaptive sheets',()=>{
  const s=read('app/layout.jsx');
  assert.ok(s.indexOf('adaptive-sheets-v394.css') < s.indexOf('zero-scroll-v395.css'));
  assert.ok(s.includes("import './styles/zero-scroll-v395.css'"));
});
test('virtual list does not window a short file list',()=>{
  assert.deepEqual(virtualWindow({length:8,scrollTop:900,viewportHeight:250}),{start:0,end:8,padTop:0,padBottom:0,virtual:false});
});
test('virtual list bounds the number of rows for 2500 ZIP changes',()=>{
  for(const scrollTop of [0,47,400,1100,50000,100000]){
    const w=virtualWindow({length:2500,scrollTop,viewportHeight:350});
    assert.equal(w.virtual,true);
    assert.ok(w.end-w.start <= 19);
    assert.equal(w.padTop+w.padBottom+(w.end-w.start)*46,2500*46);
  }
});
test('virtual window covers the visible viewport at typical positions',()=>{
  for(const top of [0,46,123,568,7000,95000,113000]){
    const v=virtualWindow({length:2500,scrollTop:top,viewportHeight:240});
    const visibleStart=Math.floor(top/46);
    const visibleEnd=Math.min(2500,Math.ceil((top+240)/46));
    assert.ok(v.start <= visibleStart);
    assert.ok(v.end >= visibleEnd);
  }
});
test('virtual list handles empty and malformed inputs safely',()=>{
  for(const length of [null,-3,0,NaN]) assert.equal(virtualWindow({length,scrollTop:0,viewportHeight:200}).end,0);
});
test('desktop workspace geometry accounts for banners and short laptop screens',()=>{
  assert.equal(clampWorkspaceHeight({viewportHeight:768,gridTop:140}),610);
  assert.equal(clampWorkspaceHeight({viewportHeight:768,gridTop:630}),260);
  assert.equal(clampWorkspaceHeight({viewportHeight:NaN,gridTop:100}),0);
});
test('keyboard detector only hides dock when keyboard overlaps editable field',()=>{
  assert.equal(keyboardOccluded({layoutHeight:844,visualHeight:540,editableFocused:true}),true);
  assert.equal(keyboardOccluded({layoutHeight:844,visualHeight:540,editableFocused:false}),false);
  assert.equal(keyboardOccluded({layoutHeight:844,visualHeight:800,editableFocused:true}),false);
});
test('layout observer is disposable and removes applied inline presentation state',()=>{
  const styles=new Map(); const dataset={}; const listeners=new Map(); const removed=[];
  const style={setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)};
  const documentElement={clientHeight:768};
  const main={style,dataset,ownerDocument:{documentElement,activeElement:null,addEventListener:(e,fn)=>listeners.set(e,fn),removeEventListener:e=>removed.push(e)},querySelector:()=>({getBoundingClientRect:()=>({top:120})})};
  const dock={getBoundingClientRect:()=>({height:110})};
  const win={innerWidth:1366,innerHeight:768,requestAnimationFrame:fn=>{fn();return 0},cancelAnimationFrame:()=>{},addEventListener:()=>{},removeEventListener:()=>{}};
  const off=installViewportLayout({main,dock,win});
  assert.equal(styles.get('--zip395-workspace-height'),'630px');
  assert.equal(styles.get('--zip395-dock-height'),'110px');
  assert.equal(dataset.keyboardOccluded,'false');
  off();
  assert.equal(styles.has('--zip395-dock-height'),false);
  assert.equal(styles.has('--zip395-workspace-height'),false);
  assert.equal('keyboardOccluded' in dataset,false);
  assert.deepEqual(removed.sort(),['focusin','focusout']);
});
test('review no longer forces mobile page to jump when a ZIP is analyzed',()=>{
  const page=read('app/page.jsx');
  const relevant=page.slice(page.indexOf('const lastPositionedPreviewRef'),page.indexOf('function goToReview()'));
  assert.doesNotMatch(relevant,/window\.scrollTo/);
  assert.match(relevant,/lastPositionedPreviewRef\.current === preview/);
});
test('review has a single Push trigger and retains the same readiness gate',()=>{
  const page=read('app/page.jsx');
  assert.equal((page.match(/onClick=\{push\}/g)||[]).length,1);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
  assert.match(page,/setConfirmed\(false\); setSyncConfirmed\(false\); setSensitiveConsent\(false\)/);
});
test('virtual list permits scrolling all changes without an explicit load-more button',()=>{
  const component=read('app/components/VirtualReviewList.jsx');
  const page=read('app/page.jsx');
  assert.match(component,/changes\.slice\(view\.start,view\.end\)/);
  assert.match(component,/onToggle\(item\.path\)/);
  assert.match(component,/onDiff\(item\)/);
  assert.doesNotMatch(page,/Hiển thị thêm .*?file/);
  assert.match(read('app/styles/zero-scroll-v395.css'),/height:46px;min-height:46px;max-height:46px/);
});
test('mobile action dock reserves its actual measured height and respects focus',()=>{
  const css=read('app/styles/zero-scroll-v395.css');
  assert.match(css,/--zip395-dock-height/);
  assert.match(css,/data-keyboard-occluded="true"/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/font-size:16px/);
});
