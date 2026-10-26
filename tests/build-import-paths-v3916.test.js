import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirs = ['app', 'lib'];
const extensions = ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '.css'];
function sourceFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    if (item.name === 'node_modules' || item.name === '.next') return [];
    const path = join(folder, item.name);
    return item.isDirectory() ? sourceFiles(path) : /\.(?:js|jsx|mjs|ts|tsx)$/.test(item.name) ? [path] : [];
  });
}
function existsSourceImport(from, specifier) {
  const base = resolve(dirname(from), specifier);
  return existsSync(base) || extensions.some(ext => existsSync(`${base}${ext}`)) ||
    extensions.some(ext => existsSync(join(base, `index${ext}`)));
}

test('all app/lib relative static imports resolve to bundled files before deployment', () => {
  const missing = [];
  let checked = 0;
  // Inspect static import/export declarations and import() calls. Asset imports
  // are included, but literal strings in test fixtures are not examined.
  const importer = /\b(?:from\s*|import\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g;
  for (const dir of sourceDirs) for (const file of sourceFiles(join(root, dir))) {
    const contents = readFileSync(file, 'utf8');
    for (const [, specifier] of contents.matchAll(importer)) {
      checked++;
      if (!existsSourceImport(file, specifier)) missing.push(`${file.slice(root.length + 1)} -> ${specifier}`);
    }
  }
  assert.ok(checked > 150, `Expected to check many module imports, got ${checked}`);
  assert.deepEqual(missing, [], `Missing relative modules:\n${missing.join('\n')}`);
});

test('Vercel Blob callback route uses correct root lib paths and keeps security gates', () => {
  const path = join(root, 'app/api/large-upload/route.js');
  const code = readFileSync(path, 'utf8');
  for (const name of ['auth/session.js', 'auth/github-app.js', 'large-blob-ticket.js', 'constants.js']) {
    assert.ok(code.includes(`from '../../../lib/${name}'`), `${name} must resolve from app/api/large-upload`);
  }
  assert.match(code, /checkOrigin\(request\)/);
  assert.match(code, /resolveAppSession\(request\)/);
  assert.match(code, /verifyLargeBlobTicket\(clientPayload,session,pathname\)/);
  assert.match(code, /allowedContentTypes:\['application\/octet-stream'\]/);
});
