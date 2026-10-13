import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateChanges, countChanges } from '../lib/operations.js';
import { assertSafeContentPath, getWrapperFolder, normalizeSourcePath, zipCommitMessage, assertRepoCoordinates } from '../lib/paths.js';

const local = [
  { path: 'README.md', sha: 'new', bytes: 12, mode: '100644' },
  { path: 'src/app.js', sha: 'same', bytes: 30, mode: '100644' },
  { path: 'public/logo.png', sha: 'binary', bytes: 22, mode: '100644' },
];
const remote = [
  { path: 'README.md', sha: 'old', mode: '100644', type: 'blob' },
  { path: 'src/app.js', sha: 'same', mode: '100644', type: 'blob' },
  { path: 'old.txt', sha: 'old', mode: '100644', type: 'blob' },
  { path: 'shortcut', sha: 'link', mode: '120000', type: 'blob' },
  { path: 'vendor', sha: 'submodule', mode: '160000', type: 'commit' },
];

test('Merge adds and modifies but does not delete', () => {
  const changes = calculateChanges(local, remote, 'merge');
  assert.deepEqual(countChanges(changes), { add: 1, modify: 1, delete: 0 });
  assert.ok(changes.some((x) => x.path === 'public/logo.png'));
});

test('Sync deletes absent blobs, but protects symlinks and submodules', () => {
  const changes = calculateChanges(local, remote, 'sync');
  assert.deepEqual(countChanges(changes), { add: 1, modify: 1, delete: 1 });
  assert.ok(changes.some((x) => x.path === 'old.txt' && x.kind === 'delete'));
  assert.ok(!changes.some((x) => x.path === 'shortcut' || x.path === 'vendor'));
});

test('source paths reject traversal, absolute paths and secrets', () => {
  for (const invalid of ['../secret', '/etc/passwd', 'C:/Windows/file', 'src/../secrets', 'src//empty', '.env', 'server/.env.local', 'id_rsa', '.npmrc', 'secure/service.account.json']) {
    assert.throws(() => assertSafeContentPath(invalid), undefined, invalid);
  }
  assert.equal(assertSafeContentPath('.env.example'), '.env.example');
  assert.equal(normalizeSourcePath('src\\index.js'), 'src/index.js');
  assert.throws(() => assertSafeContentPath('src\\index.js'));
});

test('wrapper detection preserves source-only folders', () => {
  assert.equal(getWrapperFolder(['Finzaro/src/a.js', 'Finzaro/package.json']), 'Finzaro');
  assert.equal(getWrapperFolder(['src/a.js', 'src/b.js']), null);
  assert.equal(getWrapperFolder(['a.js', 'src/b.js']), null);
});

test('commit message derived directly from ZIP filename', () => {
  assert.equal(zipCommitMessage('Finzaro_v1.2.0.zip'), 'Finzaro_v1.2.0');
  assert.equal(zipCommitMessage('backup.ZIP'), 'backup');
});

test('valid repository and branch naming', () => {
  assert.deepEqual(assertRepoCoordinates('huyvd250797', 'Finzaro', 'feature/mobile'), { owner:'huyvd250797', repo:'Finzaro', branch:'feature/mobile' });
  for (const b of ['../main', 'main..bad', 'feature//foo', 'foo.lock', 'some branch', 'feature/@{']) {
    assert.throws(() => assertRepoCoordinates('person', 'repo', b));
  }
});
