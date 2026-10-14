import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('mobile navigation includes five sections and retains GitHub/OAuth fields', () => {
 const page = read('app/page.jsx');
 for (const view of ['home','repositories','activity','settings']) {
   assert.match(page, new RegExp(`data-mobile-view="${view}"`));
 }
 assert.match(read('app/components/HistoryPanel.jsx'), /data-mobile-view="history"/);
 assert.match(page, /onClick=\{\(\) => goToTab\(tab\.id\)\}/);
 assert.match(page, /aria-current=\{activeTab === tab\.id/);
 assert.match(page, /\/api\/auth\/login/);
 assert.match(page, /commitMessage = useMemo\(\(\) => zipCommitMessage\(file\?\.name\)/);
});
test('sync deletions need independent confirmation on top of usual preview consent', () => {
 const page = read('app/page.jsx');
 assert.match(page, /setSyncConfirmed\(false\)/);
 assert.match(page, /Tôi đồng ý xóa/);
 assert.match(page, /stats\?\.delete > 0 && !syncConfirmed/);
 assert.match(page, /disabled=\{!canSubmitPush\}/);
 assert.match(read('lib/ux-polish.js'), /syncDeleteCount > 0 && !syncConfirmed/);
 assert.match(page, /!confirmed/);
});
test('app keeps mobile safe area, dark/light preferences and reduced motion', () => {
 const css = read('app/globals.css');
 assert.match(css, /padding-bottom:calc\(110px \+ env\(safe-area-inset-bottom/);
 assert.match(css, /\.mobile-bottom-nav\{display:grid/);
 assert.match(css, /html\[data-theme="light"\]/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});
test('retry policy and verification UI remain in place', () => {
 const page = read('app/page.jsx');
 assert.match(page, /setPendingCommit\(commitPayload\)/);
 assert.match(page, /requestOnce\('commit', commitPayload\)/);
 assert.match(page, /api\('verify', data,/);
 assert.match(page, /mobile-global-status/);
});
