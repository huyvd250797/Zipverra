import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('connected check belongs before version only in the top bar', () => {
  const page = read('app/page.jsx');
  const header = page.slice(page.indexOf('<header className="topbar"'), page.indexOf('</header>'));
  assert.match(header, /header-connected-mark/);
  assert.ok(header.indexOf('header-connected-mark') < header.indexOf('<span className="version"'));
  assert.match(header, /auth\.authenticated && online && pwa\.reachable/);
  assert.doesNotMatch(page, /repo-connection-icon/);
  assert.doesNotMatch(header, /<span className="live-dot"/);
});

test('Repository heading contains one icon-only Refresh and one shared contextual Help', () => {
  const page = read('app/page.jsx');
  const ui = read('app/components/ProfessionalUI.jsx');
  assert.match(page, /repoTools=\{activeTab === 'repositories' && auth\.authenticated \? <button/);
  assert.match(page, /className=\{`repo-refresh-icon/);
  assert.match(page, /aria-label="Làm mới danh sách repository"/);
  assert.equal((ui.match(/<ContextualHelp tab=/g) || []).length, 1);
  assert.match(ui, /<ContextualHelp tab=\{activeTab\}\/>/);
});

test('Refresh has no frame, ? keeps a small circle, all glyphs are 17px and touch targets remain generous', () => {
  const css = read('app/styles/compact-ui.css');
  assert.match(css, /\.repo-refresh-icon \{[^}]*border:0;[^}]*background:transparent;[^}]*box-shadow:none/);
  assert.match(css, /\.compact-help-trigger::before \{[^}]*border:1px solid/);
  assert.match(css, /\.compact-help-trigger \{[^}]*width:40px;height:40px/);
  assert.match(css, /\.header-connected-mark svg \{[^}]*width:17px;height:17px/);
  assert.match(css, /\.repo-refresh-icon svg \{[^}]*width:17px;height:17px/);
  assert.match(css, /font-size:17px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
