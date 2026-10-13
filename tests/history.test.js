import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVersionChanges, signRollbackProof, validateRollbackProof,
  listHistory, compareVersions, previewRollback, executeRollback, verifyRollback } from '../lib/history.js';

const H = 'a'.repeat(40), T = 'b'.repeat(40), NEW = 'c'.repeat(40);
const C_TREE = 'd'.repeat(40), T_TREE = 'e'.repeat(40);
const S1 = '1'.repeat(40), S2 = '2'.repeat(40), S3 = '3'.repeat(40), S4 = '4'.repeat(40);
const SECRET = { SESSION_SECRET: 's'.repeat(64) };
const PATHS = { owner: 'team', repo: 'demo', branch: 'main', targetSha: T };
const currentFiles = [
  { path: 'src/app.js', sha: S2, mode: '100644', type: 'blob' },
  { path: 'new.txt', sha: S3, mode: '100644', type: 'blob' },
];
const targetFiles = [
  { path: 'src/app.js', sha: S1, mode: '100644', type: 'blob' },
  { path: 'old.txt', sha: S4, mode: '100644', type: 'blob' },
];
function response(status, body) { return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }; }
function fixture({ status = 'ahead', workflows = 'write', denial = null, networkPatch = false, nonAppliedPatch = false } = {}) {
  let head = H;
  let commitsCreated = 0;
  let patches = 0;
  let mockInstallChecks = 0;
  let expectedTree = null;
  let forcePatch = null;
  let alternateHead = null;
  const fetcher = async (url, opts = {}) => {
    const endpoint = new URL(url).pathname;
    const method = opts.method || 'GET';
    if (endpoint === '/user/installations') { mockInstallChecks++; return response(200, { installations: [{ id: 42, account: { login: 'team' }, permissions: { contents: 'write', workflows } }] }); }
    if (endpoint === '/user/installations/42/repositories') return response(200, { repositories: [{ full_name: 'team/demo', permissions: { push: true } }] });
    if (endpoint === '/repos/team/demo' && method === 'GET') return response(200, { permissions: { push: true }, archived: false, disabled: false });
    if (endpoint === '/repos/team/demo/commits' && method === 'GET') return response(200, [{ sha: H, commit: { message: 'New version', author: { name: 'Example', date: '2026-10-10T00:00:00Z' } }, html_url: 'https://github.com/team/demo/commit/'+H }]);
    if (endpoint === '/repos/team/demo/git/ref/heads/main') return response(200, { object: { sha: alternateHead || head } });
    if (endpoint === '/repos/team/demo/compare/'+T+'...'+(alternateHead || head) && method === 'GET') return response(200, { status, ahead_by: status === 'ahead' ? 2 : 0 });
    const commitPrefix = '/repos/team/demo/git/commits/';
    if (endpoint.startsWith(commitPrefix) && method === 'GET') {
      const id = endpoint.slice(commitPrefix.length);
      if (id === T) return response(200, { sha: T, tree: { sha: T_TREE }, parents: [], message: 'Old version' });
      if (id === H || (alternateHead && id === alternateHead)) return response(200, { sha: id, tree: { sha: C_TREE }, parents: [{ sha: T }], message: 'New version' });
      if (id === NEW) return response(200, { sha: NEW, tree: { sha: T_TREE }, parents: [{ sha: H }], message: `Zipverra rollback to ${T.slice(0, 12)}` });
      return response(404, {});
    }
    if (endpoint === '/repos/team/demo/git/trees/'+C_TREE) return response(200, { truncated: false, tree: currentFiles });
    if (endpoint === '/repos/team/demo/git/trees/'+T_TREE) return response(200, { truncated: false, tree: targetFiles });
    if (endpoint === '/repos/team/demo/git/commits' && method === 'POST') {
      commitsCreated++;
      const payload = JSON.parse(opts.body);
      expectedTree = payload.tree;
      return response(201, { sha: NEW });
    }
    if (endpoint === '/repos/team/demo/git/refs/heads/main' && method === 'PATCH') {
      patches++;
      forcePatch = JSON.parse(opts.body).force;
      if (denial) return response(denial, { message: 'Protected branch' });
      if (networkPatch) {
        if (!nonAppliedPatch) head = NEW;
        throw Error('Network disconnect after mutation');
      }
      head = NEW;
      return response(200, { ref: 'refs/heads/main', object: { sha: NEW } });
    }
    throw new Error(`Unexpected ${method} ${url}`);
  };
  return { fetcher, stats: () => ({ head, commitsCreated, patches, mockInstallChecks, expectedTree, forcePatch }), changeHead: (value) => { alternateHead = value; } };
}
async function withFetch(fake, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await fn(); } finally { globalThis.fetch = orig; }
}

test('complete tree diff returns add/modify/delete and preserves order', () => {
  const changes = computeVersionChanges(currentFiles, targetFiles);
  assert.deepEqual(changes.map(c => `${c.kind}:${c.path}`), ['delete:new.txt', 'add:old.txt', 'modify:src/app.js']);
  assert.equal(computeVersionChanges(currentFiles, currentFiles).length, 0);
});

test('special modes, symlinks, submodules and dangerous .env changes are blocked', () => {
  assert.throws(() => computeVersionChanges([], [{ path: 'link', sha: S1, type: 'blob', mode: '120000' }]), e => e.code === 'ROLLBACK_UNSUPPORTED_MODE');
  assert.throws(() => computeVersionChanges([], [{ path: 'vendored', sha: S1, type: 'commit', mode: '160000' }]), e => e.code === 'ROLLBACK_UNSUPPORTED_MODE');
  assert.throws(() => computeVersionChanges([], [{ path: '.env.production', sha: S1, type: 'blob', mode: '100644' }]), e => e.code === 'ROLLBACK_UNSAFE_PATH');
  assert.throws(() => computeVersionChanges([], Array.from({length:1201}, (_,i) => ({ path: `f${i}`, sha: S1, type: 'blob', mode: '100644' }))), e => e.code === 'ROLLBACK_TOO_LARGE');
});

test('rollback proof validates HMAC, timestamp, expiration and tampering', () => {
  const now = Date.now();
  const payload = { owner:'team', repo:'demo', branch:'main', head:H, target:T, digest:'1'.repeat(64), at:now };
  const signed = signRollbackProof(payload, SECRET);
  assert.equal(validateRollbackProof(signed, SECRET, now).head, H);
  const parts = signed.split('.');
  assert.throws(() => validateRollbackProof(parts[0]+'.'+parts[1].slice(1)+'A', SECRET, now), e => e.code === 'ROLLBACK_PROOF_TAMPERED');
  assert.throws(() => validateRollbackProof(signed, SECRET, now + 600001), e => e.code === 'ROLLBACK_PROOF_EXPIRED');
  assert.throws(() => validateRollbackProof('broken', SECRET, now), e => e.code === 'ROLLBACK_PROOF_INVALID');
});

test('history lists selected branch commits without leaking access tokens', async () => {
  const mock = fixture();
  await withFetch(mock.fetcher, async () => {
    const result = await listHistory('TOKEN', { ...PATHS, page: 1 });
    assert.equal(result.commits.length, 1);
    assert.equal(result.commits[0].sha, H);
    assert.equal(result.commits[0].message, 'New version');
    assert.equal(result.hasMore, false);
  });
  await assert.rejects(() => listHistory('TOKEN', { ...PATHS, page: 26 }), /Trang lịch sử/);
});

test('comparison is read-only and shows exact source tree changes', async () => {
  const mock = fixture();
  await withFetch(mock.fetcher, async () => {
    const result = await compareVersions('TOKEN', { owner:'team', repo:'demo', baseSha:T, headSha:H });
    assert.deepEqual(result.counts, { add: 1, modify: 1, delete: 1 });
    assert.equal(mock.stats().commitsCreated, 0);
  });
});

test('rollback preview checks ancestry and returns a signed exact file list', async () => {
  const mock = fixture();
  await withFetch(mock.fetcher, async () => {
    const plan = await previewRollback('TOKEN', PATHS, SECRET);
    assert.equal(plan.head, H);
    assert.equal(plan.targetSha, T);
    assert.deepEqual(plan.counts, { add: 1, modify: 1, delete: 1 });
    assert.equal(plan.total, 3);
    assert.equal(validateRollbackProof(plan.proof, SECRET).digest.length, 64);
    assert.equal(mock.stats().commitsCreated, 0);
  });
});

test('commits from unrelated or diverged history are never eligible for rollback', async () => {
  const mock = fixture({ status:'diverged' });
  await withFetch(mock.fetcher, async () => {
    await assert.rejects(() => previewRollback('TOKEN', PATHS, SECRET), e => e.code === 'ROLLBACK_NOT_ANCESTOR');
    assert.equal(mock.stats().commitsCreated, 0);
  });
});

test('rollback requires exactly ROLLBACK confirmation and rejects altered previews', async () => {
  const mock = fixture();
  await withFetch(mock.fetcher, async () => {
    const plan = await previewRollback('TOKEN', PATHS, SECRET);
    await assert.rejects(() => executeRollback('TOKEN', { proof: plan.proof, confirmation:'YES' }, SECRET), e => e.code === 'ROLLBACK_CONFIRM_REQUIRED');
    await assert.rejects(() => executeRollback('TOKEN', { proof: plan.proof+'a', confirmation:'ROLLBACK' }, SECRET), e => e.code === 'ROLLBACK_PROOF_TAMPERED');
    assert.equal(mock.stats().commitsCreated, 0);
  });
});

test('rollback safely creates exactly one non-force commit pointing at target tree and verifies HEAD', async () => {
  const mock = fixture();
  await withFetch(mock.fetcher, async () => {
    const preview = await previewRollback('TOKEN', PATHS, SECRET);
    const outcome = await executeRollback('TOKEN', { proof: preview.proof, confirmation:'ROLLBACK' }, SECRET);
    assert.equal(outcome.state, 'applied');
    assert.equal(outcome.sha, NEW);
    assert.equal(outcome.changed, 3);
    assert.deepEqual({commits: mock.stats().commitsCreated,patches:mock.stats().patches}, { commits: 1, patches: 1 });
    assert.equal(mock.stats().expectedTree, T_TREE);
    assert.equal(mock.stats().forcePatch, false);
    assert.equal((await verifyRollback('TOKEN', { ...PATHS, expectedHead: H, knownCommitSha: NEW })).state, 'applied');
  });
});

test('preview becomes stale if HEAD changes before confirmation; no commit or PATCH', async () => {
  const mock = fixture();
  await withFetch(mock.fetcher, async () => {
    const plan = await previewRollback('TOKEN', PATHS, SECRET);
    mock.changeHead('9'.repeat(40));
    await assert.rejects(() => executeRollback('TOKEN', { proof:plan.proof, confirmation:'ROLLBACK' }, SECRET), e => e.code === 'ROLLBACK_STALE_HEAD');
    assert.equal(mock.stats().commitsCreated, 0);
    assert.equal(mock.stats().patches, 0);
  });
});

test('branch protection rejection refuses rollback; history remains unchanged', async () => {
  const mock = fixture({ denial: 403 });
  await withFetch(mock.fetcher, async () => {
    const plan = await previewRollback('TOKEN', PATHS, SECRET);
    await assert.rejects(() => executeRollback('TOKEN', { proof: plan.proof, confirmation:'ROLLBACK' }, SECRET), e => e.status === 403);
    assert.equal(mock.stats().head, H);
    assert.equal(mock.stats().commitsCreated, 1); // Unreferenced commit object; not on branch
  });
});

test('network failure after successful ref PATCH is recovered from GitHub HEAD without duplicating commit', async () => {
  const mock = fixture({ networkPatch: true });
  await withFetch(mock.fetcher, async () => {
    const plan = await previewRollback('TOKEN', PATHS, SECRET);
    const result = await executeRollback('TOKEN', { proof:plan.proof, confirmation:'ROLLBACK' }, SECRET);
    assert.equal(result.state, 'applied');
    assert.equal(result.recovered, true);
    assert.equal(mock.stats().commitsCreated, 1);
    assert.equal(mock.stats().patches, 1);
  });
});

test('when PATCH network fails without application, verification shows not_applied and does not retry', async () => {
  const mock = fixture({ networkPatch: true, nonAppliedPatch:true });
  await withFetch(mock.fetcher, async () => {
    const plan = await previewRollback('TOKEN', PATHS, SECRET);
    await assert.rejects(() => executeRollback('TOKEN', { proof:plan.proof, confirmation:'ROLLBACK' }, SECRET), e => e.code === 'ROLLBACK_UNCONFIRMED');
    const status = await verifyRollback('TOKEN', { ...PATHS, expectedHead:H });
    assert.equal(status.state,'not_applied');
    assert.equal(mock.stats().patches,1);
    assert.equal(mock.stats().commitsCreated,1);
  });
});

test('workflow rollback requires Workflows: write, without creating a commit when missing', async () => {
  const originalCurrent = currentFiles.slice();
  const originalTarget = targetFiles.slice();
  currentFiles.push({ path: '.github/workflows/ci.yml', sha: S1, type: 'blob', mode: '100644' });
  targetFiles.push({ path: '.github/workflows/ci.yml', sha: S2, type: 'blob', mode: '100644' });
  const mock = fixture({ workflows:'read' });
  try {
    await withFetch(mock.fetcher, async () => {
      await assert.rejects(() => previewRollback('TOKEN', PATHS, SECRET), e => e.code === 'APP_WORKFLOWS_PERMISSION_REQUIRED');
      assert.equal(mock.stats().commitsCreated, 0);
    });
  } finally {
    currentFiles.splice(0, currentFiles.length, ...originalCurrent);
    targetFiles.splice(0, targetFiles.length, ...originalTarget);
  }
});

test('history UI contains explicit preview/typed confirmation and verify-only recovery', async () => {
  const { readFileSync } = await import('node:fs');
  const ui = readFileSync(new URL('../app/components/HistoryPanel.jsx', import.meta.url), 'utf8');
  assert.match(ui, /data-mobile-view="history"/);
  assert.match(ui, /confirmation: 'ROLLBACK'/);
  assert.match(ui, /phrase !== 'ROLLBACK'/);
  assert.match(ui, /rollback\/preview/);
  assert.match(ui, /rollback\/verify/);
  assert.match(ui, /storeRecovery\(pending\); setRecovery\(pending\);/);
  assert.match(ui, /requestOnce\('rollback\/execute'/);
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /safe-area-inset-bottom/);
});
