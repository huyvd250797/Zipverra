import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../lib/pwa-reliability.js';
import { summarizeReviewRisks } from '../lib/review-risk-center.js';
import { reviewReadiness } from '../lib/ux-polish.js';
const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const page = read('app/page.jsx');
const css = read('app/styles/professional-copy-v397.css');

test('v3.9.13 package, PWA and final stylesheet match', () => {
  assert.equal(APP_VERSION, '3.9.13');
  assert.equal(JSON.parse(read('package.json')).version, '3.9.13');
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.13/);
  const layout=read('app/layout.jsx');
  assert.ok(layout.indexOf('review-gate-hotfix-v396.css') < layout.indexOf('professional-copy-v397.css'));
  assert.match(page, /Zipverra · v3\.9\.13/);
});
test('Review keeps compact titles and removes redundant paragraphs', () => {
  assert.match(page, /<strong>File thay đổi<\/strong>/);
  assert.match(page, /placeholder="Tìm tên file"/);
  assert.doesNotMatch(page, /Cần kiểm tra file\? Mở danh sách bên dưới/);
  assert.doesNotMatch(page, /Nút Push chính chỉ xuất hiện trong bước xác nhận/);
  assert.match(page, /zip397-final-status/);
});
test('critical project mismatch remains explicit, short and mandatory', () => {
  const summary=summarizeReviewRisks({identity:{severity:'critical',common:5,differentNames:true}});
  assert.equal(summary.pendingCount,1);
  assert.equal(summary.items[0].tone,'critical');
  assert.ok(summary.items[0].detail.length<110);
  assert.match(summary.items[0].detail,/Tên package khác/);
  assert.match(read('app/components/ReviewRiskCenter.jsx'),/chấp nhận nguy cơ nhầm dự án/);
  assert.match(page,/setProjectMismatchConfirmed\(value\); setConfirmed\(false\)/);
});
test('sensitive security and Sync deletion approvals are not omitted', () => {
  const summary=summarizeReviewRisks({report:{critical:1,warning:2,info:0},requiresConsent:true,mode:'sync',deleteCount:4});
  assert.equal(summary.pendingCount,2);
  assert.match(summary.items[0].detail,/Critical/);
  assert.match(summary.items[1].title,/xóa 4 file/);
  assert.match(read('app/components/ReviewRiskCenter.jsx'),/onSecurityDecision/);
  assert.match(page,/setSyncConfirmed\(value\); setConfirmed\(false\)/);
});
test('no review confirmation or commit safety gate was relaxed', () => {
  const readiness=reviewReadiness({hasPreview:true,selectedCount:10,authenticated:true,online:true,confirmed:false});
  assert.equal(readiness.ready,false);
  assert.match(page,/const canSubmitPush = pushReadiness\.ready/);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
  assert.match(page,/riskSummary\.pendingCount > 0 \|\| !\['CONFIRM','READY'\]\.includes\(pushReadiness\.code\)/);
});
test('mobile dock remains a gateway, never exposes direct Push', () => {
  assert.match(page,/className="zip396-mobile-only"/);
  assert.match(page,/onClick=\{openDecisionSheet\}/);
  assert.match(page,/className="zip396-desktop-only"/);
  assert.equal((page.match(/onClick=\{push\}/g)||[]).length,1);
  assert.equal((page.match(/onClick=\{\(\) => push\(\)\}/g)||[]).length,1);
  assert.match(css,/\.zip396-sheet-push/);
});
test('visual hierarchy scales copy without microtype or disabled focus', () => {
  assert.match(css,/\.zip396-review-risk-banner-text strong\{font-size:15px/);
  assert.match(css,/\.zip396-sheet-consent\.confirm-row/);
  assert.match(css,/:focus-visible\{outline:2px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
test('no Vercel token integration reintroduced',()=>{
  assert.doesNotMatch(page,/Vercel Workspace|\/api\/vercel\//);
  assert.doesNotMatch(read('app/layout.jsx'),/vercel-workspace/);
});
