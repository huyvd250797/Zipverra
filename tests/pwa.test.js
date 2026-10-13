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
  assert.equal(config.name, 'Zipverra — ZIP to GitHub');
  assert.equal(config.display, 'standalone');
  assert.equal(config.start_url, '/');
  assert.ok(config.icons.some(({ sizes }) => sizes === '192x192'));
  assert.ok(config.icons.some(({ sizes }) => sizes === '512x512'));
  for (const file of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
    assert.ok(existsSync(join(projectRoot, 'public', file)), `${file} is present`);
  }
});

test('mobile viewport prevents zoom and uses edge-to-edge safe areas', () => {
  const layout = source('app/layout.jsx');
  const style = source('app/globals.css');
  const guard = source('app/components/MobileViewportGuard.jsx');
  assert.match(layout, /maximumScale:\s*1/);
  assert.match(layout, /userScalable:\s*false/);
  assert.match(layout, /viewportFit:\s*'cover'/);
  assert.match(style, /touch-action:pan-x pan-y/);
  assert.match(style, /\.field input,\.field select\{font-size:16px\}/);
  assert.match(guard, /touches\.length > 1/);
  assert.match(guard, /removeEventListener\('gesturestart'/);
});

test('splash displays on first HTML paint and has a network failsafe', () => {
  const page = source('app/page.jsx');
  const splash = source('app/components/SplashScreen.jsx');
  assert.match(page, /<SplashScreen loading=\{auth\.loading\}/);
  assert.match(splash, /<div className=\{`app-splash/);
  assert.match(splash, /setMinimumElapsed\(true\), 650/);
  assert.match(splash, /setTimedOut\(true\), 5500/);
  assert.match(splash, /Push to GitHub from Mobile/);
});

test('hero title is updated to English on mobile and desktop', () => {
  const page = source('app/page.jsx');
  assert.match(page, /Push to GitHub\.<br\/>\s*<span>From Your Phone\.<\/span>/);
  assert.doesNotMatch(page, /Đẩy source lên GitHub/);
});
