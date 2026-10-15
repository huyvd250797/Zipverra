import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { helpForTab, helpTabNames } from '../lib/contextual-help.js';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('exactly one contextual help catalogue entry per mobile tab', () => {
  assert.deepEqual(helpTabNames(), ['repositories', 'home', 'activity', 'history', 'settings']);
  for (const tab of helpTabNames()) {
    const help = helpForTab(tab);
    assert.equal(typeof help.title, 'string');
    assert.ok(help.title.length > 3);
    assert.ok(help.items.length >= 3 && help.items.length <= 6);
    for (const [name, description] of help.items) {
      assert.ok(name.length > 1 && description.length > 15);
    }
  }
});

test('help is read-only content, with no fetch, token, mutation, or storage', () => {
  const content = read('app/components/ContextualHelp.jsx');
  const data = read('lib/contextual-help.js');
  const modal=read('app/components/ModalSheet.jsx');
  assert.match(content, /<ModalSheet open=\{open\}/);
  assert.match(modal, /dialog\.showModal\(\)/);
  assert.match(modal, /lockModalScroll\(/);
  assert.match(content, /className="compact-help-trigger"/);
  assert.match(content, /aria-label=\{`Hướng dẫn \$\{help\.title\}`\}/);
  assert.doesNotMatch(content + data, /\bfetch\(|localStorage|sessionStorage|requestOnce\(|\/api\/github\//);
});

test('one shared help trigger is mounted in the screen header and not repeated across panels', () => {
  const ui = read('app/components/ProfessionalUI.jsx');
  const page = read('app/page.jsx');
  assert.equal((ui.match(/<ContextualHelp tab=/g) || []).length, 1);
  assert.match(ui, /<ContextualHelp tab=\{activeTab\}\/>/);
  assert.doesNotMatch(page, /<ContextualHelp/);
  assert.match(page, /<UXViewIntro activeTab=\{activeTab\}/);
});

test('help sheet can be closed, is labelled, keyboard focusable and prevents screen overflow', () => {
  const content = read('app/components/ContextualHelp.jsx');
  const styles = read('app/styles/repository-workflow.css');
  const modal = read('app/components/ModalSheet.jsx');
  const layout = read('app/layout.jsx');
  assert.match(content, /<ModalSheet open=\{open\}/);
  assert.match(modal, /aria-label=\{title\}/);
  assert.match(modal, /aria-label=\{`Đóng \$\{title\}`\}/);
  assert.match(modal, /event\.target === event\.currentTarget/);
  assert.match(styles, /::backdrop/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /max-height:min\(82dvh/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(layout, /repository-workflow\.css/);
});

test('security critical, sync deletion warning and explicit confirmation remain visible', () => {
  const main = read('app/page.jsx');
  const ui = read('app/components/PolishedWorkspace.jsx');
  assert.match(main, /\(requiresConsent && !sensitiveConsent\)/);
  assert.match(main, /mode === 'sync'/);
  assert.match(main, /Sync có thể xóa file hiện có trên GitHub/);
  assert.match(main, /!confirmed \|\| \(mode === 'sync'/);
  assert.match(main, /<ReviewReadiness state=\{pushReadiness\}/);
  assert.match(main, /disabled=\{!canSubmitPush\}/);
  assert.match(ui, /state\.detail/);
});

test('repeated static notes are removed from ZIP download but errors remain visible', () => {
  const download = read('app/components/SourceZipDownload.jsx');
  assert.doesNotMatch(download, /source-zip-download-note/);
  assert.match(download, /download\.state === 'error'/);
  assert.match(download, /download\.message/);
  assert.match(download, /download\.filename/);
  assert.match(download, /navigator\.share\(/);
});
