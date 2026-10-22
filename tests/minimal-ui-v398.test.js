import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../lib/pwa-reliability.js';
import { reviewReadiness } from '../lib/ux-polish.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page=read('app/page.jsx');
const actions=read('app/components/QuickActions.jsx');
const risk=read('app/components/ReviewRiskCenter.jsx');

test('v3.9.10 runtime, package, visible app version and PWA cache agree',()=>{
 assert.equal(APP_VERSION,'3.9.10');
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.10/);
 assert.match(page,/Zipverra · v3\.9\.10/);
});
test('opening the application cannot automatically restore a repository',()=>{
 for(const needle of ['quickRestoreEnabled','autoRestoredAccountRef','lastAuthorizedRepo','QUICK_RESTORE_KEY','setQuickRestorePreference']) assert.ok(!page.includes(needle), needle);
 assert.doesNotMatch(actions,/Tự chọn repo gần nhất|autoRestore|onAutoRestoreChange/);
 assert.doesNotMatch(read('lib/quick-actions.js'),/lastAuthorizedRepo|QUICK_RESTORE_KEY/);
 assert.match(page,/const \[owner, setOwner\] = useState\(''\)/);
 assert.match(page,/const \[repo, setRepo\] = useState\(''\)/);
});
test('recent and pinned repo shortcuts remain manual, scoped to authorized repos',()=>{
 assert.match(actions,/onClick=\{\(\) => onChoose\(item\.repo\)\}/);
 assert.match(actions,/onClick=\{onOpenPicker\}/);
 assert.match(read('lib/quick-actions.js'),/allowed\.has\(item\.repo\.toLowerCase\(\)\)/);
 assert.doesNotMatch(actions,/Đổi repo\/áp dụng Profile sẽ không tự Push/);
});
test('Upload hides redundant hints and does not show a useless pre-ZIP analysis CTA',()=>{
 assert.doesNotMatch(page,/zip-missing-repo|Chọn ZIP để tự phân tích/);
 assert.match(page,/\{desc && <p>\{desc\}<\/p>\}/);
 assert.match(page,/Chọn repository/);
 assert.match(page,/: file && !busy && <button className="button secondary full"/);
});
test('advanced capacity limits remain accessible without occupying the normal Upload flow',()=>{
 const s=page.slice(page.indexOf('<details className="workflow-options">'),page.indexOf('</details>',page.indexOf('<details className="workflow-options">')));
 assert.match(s,/className="limits"/);
 assert.match(s,/120 MiB ZIP \/ 240 MiB giải nén/);
 assert.match(s,/2\.500 file · 2,5 MB\/file/);
});
test('normal operation copy is shorter but security and Sync warnings still carry meaning',()=>{
 assert.match(page,/Sync có thể xóa file trên GitHub/);
 assert.match(page,/Nên bỏ các file này khỏi ZIP và thu hồi\/đổi khóa/);
 assert.match(risk,/Nghiêm trọng/);
 assert.doesNotMatch(actions,/zip393-quick-note|zip393-restore-toggle/);
 assert.doesNotMatch(read('app/components/PushProfiles.jsx'),/Profiles chỉ chứa tên repository/);
});
test('safety gates are unchanged for Critical security, project mismatch, Sync and confirmation',()=>{
 const r=reviewReadiness({hasPreview:true,selectedCount:2,critical:1,authenticated:true,online:true,confirmed:true});
 assert.equal(r.ready,false);
 assert.match(page,/\(requiresConsent && !sensitiveConsent\)/);
 assert.match(page,/preview\.identity\?\.severity === 'critical' && !projectMismatchConfirmed/);
 assert.match(page,/mode === 'sync' && stats\?\.delete > 0 && !syncConfirmed/);
 assert.match(page,/requestOnce\('commit', commitPayload\)/);
 assert.match(page,/disabled=\{!canSubmitPush\}/);
});
test('minimal responsive layer follows previous theme styles without reducing readability',()=>{
 const layout=read('app/layout.jsx');
 const css=read('app/styles/minimal-interface-v398.css');
 assert.ok(layout.indexOf('professional-copy-v397.css') < layout.indexOf('minimal-interface-v398.css'));
 assert.match(css,/\.drop-zone\.locked/);
 assert.match(css,/main\[data-active-view="home"\]>\.pro-stepper/);
 assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:52px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('one mobile Push step and independent risk review remain intact',()=>{
 assert.match(page,/className="zip396-mobile-only"/);
 assert.match(page,/onClick=\{focusRiskCenter\}/);
 assert.match(page,/onClick=\{openDecisionSheet\}/);
 assert.match(page,/className="zip396-sheet-consent"|className="confirm-row zip396-sheet-consent"/);
 assert.equal((page.match(/onClick=\{push\}/g)||[]).length,1);
 assert.equal((page.match(/onClick=\{\(\) => push\(\)\}/g)||[]).length,1);
});
