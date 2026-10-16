import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import manifest from '../app/manifest.js';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(join(projectRoot, path), 'utf8');

test('PWA manifest supports standalone iOS/Android installation with raster icons', () => {
  const config = manifest();
  assert.equal(config.name, 'Zipverra Pro — GitHub Workspace');
  assert.equal(config.display, 'standalone');
  assert.equal(config.start_url, '/');
  assert.ok(config.icons.some(({ sizes }) => sizes === '192x192'));
  assert.ok(config.icons.some(({ sizes }) => sizes === '512x512'));
  for (const file of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
    assert.ok(existsSync(join(projectRoot, 'public', file)), `${file} is present`);
  }
});

test('mobile viewport allows zoom and uses edge-to-edge safe areas', () => {
  const layout = source('app/layout.jsx');
  const style = source('app/globals.css');
  const guard = source('app/components/MobileViewportGuard.jsx');
  assert.doesNotMatch(layout, /maximumScale:\s*1/);
  assert.doesNotMatch(layout, /userScalable:\s*false/);
  assert.match(layout, /viewportFit:\s*'cover'/);
  assert.match(style, /touch-action:auto/);
  assert.match(style, /\.field input,\.field select\{font-size:16px\}/);
  assert.doesNotMatch(guard, /preventDefault\(|touchmove|gesturestart/);
});

test('splash displays on first HTML paint and has a network failsafe', () => {
  const page = source('app/page.jsx');
  const splash = source('app/components/SplashScreen.jsx');
  assert.match(page, /<SplashScreen loading=\{auth\.loading\}/);
  assert.match(splash, /<div className=\{`app-splash/);
  assert.match(splash, /setMinimumElapsed\(true\), 180/);
  assert.match(splash, /setTimedOut\(true\), 1800/);
  assert.match(splash, /Push to GitHub from Mobile/);
});

test('compact launchpad retains the primary ZIP push action without a large marketing hero', () => {
  const page = source('app/page.jsx');
  const launchpad = source('app/components/PolishedWorkspace.jsx');
  assert.match(launchpad, /className="zip-mobile-hub"/);
  assert.match(launchpad, /<strong>Push ZIP<\/strong>/);
  assert.match(launchpad, /onChooseRepo/);
  assert.match(page, /<WorkspaceLaunchpad/);
  assert.doesNotMatch(launchpad, /Đẩy source lên GitHub/);
});

test('standalone iPhone layout offsets header from status bar and protects bottom home indicator', () => {
  const style = source('app/globals.css');
  const layout = source('app/layout.jsx');
  assert.match(layout, /statusBarStyle:\s*'black-translucent'/);
  assert.match(style, /\.shell\s*\{\s*padding-top:\s*env\(safe-area-inset-top/);
  assert.match(style, /padding-top:\s*calc\(env\(safe-area-inset-top,\s*0px\)\s*\+\s*8px\)/);
  assert.match(style, /padding-bottom:\s*max\(16px,\s*env\(safe-area-inset-bottom/);
  assert.match(style, /safe-area-inset-left/);
  assert.match(style, /safe-area-inset-right/);
  assert.match(style, /min-height:\s*100dvh/);
});

test('mobile preview is full-width and centered at screen sizes up to 550px', () => {
  const page = source('app/page.jsx');
  const style = source('app/globals.css');
  assert.match(page, /centerOnMobile\s*\/?>/);
  assert.match(page, /step-heading--mobile-center/);
  assert.match(style, /\.step-heading--mobile-center\s*\{\s*flex-direction:\s*column;/);
  assert.match(style, /\.preview-panel\s+\.stat-grid\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(style, /\.form-column\s*>\s*\.panel,\s*\.side-column\s*>\s*\.panel/);
});
