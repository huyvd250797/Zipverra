import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommit, createBlob, github, githubStage, validateWorkflowPermission, preflight,
  listWritableRepos, assertAppRepoGrant, appInstallations } from '../lib/github.js';

const SHA = 'a'.repeat(40), TREE = 'b'.repeat(40), COMMIT = 'c'.repeat(40);
function mockResponse(status, body) { return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }; }
function authFixtures(url, opts = {}, permissions = { contents: 'write', workflows: 'write' }) {
  if (url.includes('/user/installations?')) return mockResponse(200, { installations: [{ id: 42, account: { login: 'team' }, permissions, repository_selection: 'selected' }] });
  if (url.includes('/user/installations/42/repositories')) return mockResponse(200, { repositories: [{ full_name: 'team/demo', private: true, default_branch: 'main', permissions: { push: true } }] });
  if (url.endsWith('/repos/team/demo') && opts.method === 'GET') return mockResponse(200, { permissions: { push: true }, archived: false });
  return null;
}

test('GitHub API keeps token in Authorization header and redacts errors', async () => {
  let called;
  const result = await github('SECRET', '/user', 'GET', undefined, async (url, options) => {
    called = { url, options }; return mockResponse(200, { login: 'test' });
  });
  assert.equal(result.login, 'test'); assert.equal(called.options.headers.Authorization, 'Bearer SECRET');
  assert.ok(!called.url.includes('SECRET'));
  await assert.rejects(() => github('SECRET', '/user', 'GET', undefined, async () => mockResponse(403, { message: 'Access denied' })),
    (e) => e.status === 403 && !e.message.includes('SECRET'));
});

test('GitHub App workflow edit needs Workflows: write; other files do not', () => {
  assert.doesNotThrow(() => validateWorkflowPermission([{ path: 'src/page.jsx' }], { contents: 'write' }));
  assert.doesNotThrow(() => validateWorkflowPermission([{ path: '.github/workflows/ci.yml' }], { workflows: 'write' }));
  assert.throws(() => validateWorkflowPermission([{ path: '.github/workflows/ci.yaml' }], { workflows: 'read' }),
    (e) => e.code === 'APP_WORKFLOWS_PERMISSION_REQUIRED' && e.status === 403);
});

test('installation-limited repository listing includes only repositories with user push rights', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, opts) => authFixtures(url, opts) || mockResponse(404, { message: 'Not Found' });
  try {
    const list = await listWritableRepos('TOKEN');
    assert.equal(list.repos.length, 1);
    assert.equal(list.repos[0].full_name, 'team/demo');
    assert.equal(list.repos[0].workflowPermission, true);
    assert.equal(list.installations[0].account, 'team');
  } finally { globalThis.fetch = old; }
});

test('missing GitHub App installation rejects repo before attempting to commit', async () => {
  const old = globalThis.fetch;
  let mutation = 0;
  globalThis.fetch = async (url, opts = {}) => {
    if (opts.method !== 'GET') mutation++;
    if (url.includes('/user/installations?')) return mockResponse(200, { installations: [] });
    throw Error('Unexpected endpoint');
  };
  try {
    await assert.rejects(() => preflight('TOKEN', 'team', 'demo', 'main'), (e) => e.code === 'APP_INSTALLATION_REQUIRED');
    assert.equal(mutation, 0);
  } finally { globalThis.fetch = old; }
});

test('GitHub App preflight catches missing workflow grant before mutations', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => authFixtures(url, opts, { contents: 'write', workflows: 'read' }) || mockResponse(404, { message: 'Not Found' });
  try {
    await assert.rejects(() => preflight('TOKEN', 'team', 'demo', 'main', ['.github/workflows/ci.yml']),
      (e) => e.code === 'APP_WORKFLOWS_PERMISSION_REQUIRED');
  } finally { globalThis.fetch = old; }
});

test('preflight succeeds for installed and writable repo, including workflow grant', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => authFixtures(url, opts) || mockResponse(404, { message: 'Not Found' });
  try {
    assert.deepEqual(await preflight('TOKEN', 'team', 'demo', 'main', ['.github/workflows/ci.yml']), {
      writable: true, workflowPermission: true, installation: 'team' });
  } finally { globalThis.fetch = old; }
});

test('GitHub App repo with only read Contents is rejected', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => authFixtures(url, opts, { contents: 'read' }) || mockResponse(404, { message: 'Not Found' });
  try { await assert.rejects(() => assertAppRepoGrant('TOKEN', 'team', 'demo'), (e) => e.code === 'APP_INSTALLATION_REQUIRED'); }
  finally { globalThis.fetch = old; }
});

test('GitHub App repo with read-only user permission is excluded', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    if (url.includes('/user/installations/42/repositories')) return mockResponse(200, { repositories: [{ full_name: 'team/demo', permissions: { push: false } }] });
    return authFixtures(url, opts) || mockResponse(404, {});
  };
  try { assert.equal((await listWritableRepos('TOKEN')).repos.length, 0); }
  finally { globalThis.fetch = old; }
});

test('GitHub error reports exact failed stage', async () => {
  assert.equal(githubStage('/repos/a/b/git/refs/heads/main', 'PATCH'), 'UPDATE_BRANCH');
  await assert.rejects(() => github('SECRET', '/repos/a/b/git/refs/heads/main', 'PATCH', { sha: SHA, force: false },
    async () => mockResponse(404, { message: 'Not Found' })),
    (error) => error.status === 404 && error.stage === 'UPDATE_BRANCH' && error.hint.includes('GitHub App'));
});

test('blob rejects oversized base64 and accepts an empty file', async () => {
  await assert.rejects(() => createBlob('TOKEN', 'a', 'b', 'A'.repeat(3_400_001)), /quá lớn/);
  const old = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, opts) => { body = JSON.parse(opts.body); return mockResponse(201, { sha: SHA }); };
  try {
    assert.equal(await createBlob('TOKEN', 'owner', 'repo', ''), SHA);
    assert.deepEqual(body, { content: '', encoding: 'base64' });
  } finally { globalThis.fetch = old; }
});

test('commit refuses stale head before creating mutations', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const fixture = authFixtures(url, opts); if (fixture) return fixture;
    if (url.endsWith('/git/ref/heads/main')) return mockResponse(200, { object: { sha: SHA } });
    if (url.endsWith(`/git/commits/${SHA}`)) return mockResponse(200, { tree: { sha: TREE } });
    if (url.includes('/git/trees/') && opts.method === 'GET') return mockResponse(200, { tree: [], truncated: false });
    throw Error('Unexpected mutation');
  };
  try {
    await assert.rejects(() => createCommit('TOKEN', { owner: 'team', repo: 'demo', branch: 'main', expectedHead: COMMIT, message: 'update', entries: [{ path: 'README.md', mode: '100644', sha: TREE }] }), /Branch đã thay đổi/);
  } finally { globalThis.fetch = old; }
});

test('another organization installation cannot authorize a repo owned by a different account', async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    if (url.includes('/user/installations?')) return mockResponse(200, { installations: [{ id: 77, account: { login: 'elsewhere' }, permissions: { contents: 'write' } }] });
    throw Error('Must not fetch another owner repository list');
  };
  try { await assert.rejects(() => assertAppRepoGrant('TOKEN', 'team', 'demo'), (e) => e.code === 'APP_INSTALLATION_REQUIRED'); }
  finally { globalThis.fetch = old; }
});
