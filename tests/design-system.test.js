import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>readFileSync(join(root,name),'utf8');
const page=read('app/page.jsx'), ui=read('app/components/ProfessionalUI.jsx');
const theme=read('app/styles/pro-design-system.css');

test('v3.9.15 metadata and performance UI stylesheet are connected to RootLayout',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'3.9.15');
  assert.match(read('app/layout.jsx'), /import '\.\/styles\/pro-design-system\.css'/);
  assert.match(page,/v3\.9\.15/);
});
test('UI design tokens share colors, space, radius and motion defaults',()=>{
  for(const token of ['--pro-bg','--pro-surface','--pro-border','--pro-text','--pro-muted','--pro-accent','--pro-focus','--pro-radius-lg','--pro-space-4','--pro-ease'])
    assert.ok(theme.includes(token),token);
  assert.match(theme,/html\[data-theme="light"\]/);
  assert.match(theme,/prefers-reduced-motion:reduce/);
});
test('UX chrome preserves four tabs and screen-state visibility',()=>{
  for(const tab of ['home','activity','history','settings'])assert.match(page,new RegExp(`id:'${tab}'`));
  assert.match(page,/data-active-view=\{activeTab\}/);
  assert.match(page,/onClick=\{\(\) => goToTab\(tab\.id\)\}/);
  assert.match(page,/aria-current=\{activeTab === tab\.id/);
  assert.match(page,/<UXViewIntro activeTab=\{activeTab\}/);
});
test('workflow stepper is accessible and uses progress rail + active-step summary',()=>{
  assert.match(page,/<WorkflowStrip currentStep=\{flowStep\}/);
  assert.match(ui,/className=\{`pro-stepper/);
  assert.match(ui,/className="pro-stepper-rail"/);
  assert.match(ui,/role="status" aria-live="polite"/);
  assert.match(ui,/aria-current=\{currentStep < steps.length && index === activeIndex \? 'step'/);
  assert.match(ui,/aria-label=\{`Bước \$\{index \+ 1\}/);
  assert.match(page,/role="progressbar" aria-label="Tiến độ xử lý"/);
});
test('UI changes preserve repository-first selection, review and Activity redirect',()=>{
  assert.match(page,/goToTab\('home'\)/);
  assert.match(page,/onClick=\{analyze\}/);
  assert.match(page,/setConfirmed\(false\)/);
  assert.match(page,/goToTab\('activity'\)/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
  assert.match(page,/\(requiresConsent && !sensitiveConsent\)/);
});
test('status and navigation have clear accessible labels and error states',()=>{
  assert.match(ui,/role="status"/);
  assert.match(ui,/pro-header-status--\$\{state\}/);
  assert.match(page,/role="alert"/);
  assert.match(theme,/:focus-visible/);
  assert.match(theme,/\.mobile-bottom-nav/);
});
test('no new backend endpoints or secret storage introduced by the presentation layer',()=>{
  assert.doesNotMatch(ui,/fetch\(|localStorage|sessionStorage|GITHUB_APP_CLIENT_SECRET|NEXT_PUBLIC_/);
  assert.doesNotMatch(theme,/javascript:/i);
  assert.match(page,/api\('preflight'/);
  assert.match(page,/api\('verify'/);
});
test('mobile layout keeps bottom safe area and deliberately avoids a sixth nav tab',()=>{
  assert.match(theme,/safe-area-inset-bottom/);
  assert.match(theme,/max-width:360px/);
  assert.match(theme,/min-height:calc\(72px \+ env\(safe-area-inset-bottom/);
  assert.equal((page.match(/\{id:'(?:repositories|home|activity|history|settings)',label:/g)||[]).length,4);
});
