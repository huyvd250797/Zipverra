import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommit, createBlob, github, githubStage, validateWorkflowScope, parseOAuthScopes, preflight } from '../lib/github.js';

const SHA = 'a'.repeat(40);
const TREE = 'b'.repeat(40);
const COMMIT = 'c'.repeat(40);

function mockResponse(status, body) { return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }; }

test('GitHub request sends auth in header and never in URL', async () => {
  let called;
  const r = await github('SECRET', '/user', 'GET', undefined, async (url, options) => {
    called = { url, options };
    return mockResponse(200, { login: 'test' });
  });
  assert.equal(r.login, 'test');
  assert.equal(called.options.headers.Authorization, 'Bearer SECRET');
  assert.ok(!called.url.includes('SECRET'));
});

test('GitHub error does not include the supplied token', async () => {
  await assert.rejects(
    () => github('SECRET', '/user', 'GET', undefined, async () => mockResponse(403, { message: 'Access denied' })),
    (e) => e.status === 403 && e.stage === 'GITHUB_API' && e.message.includes('Access denied') && !e.message.includes('SECRET'),
  );
});

test('blob rejects oversized base64 prior to calling GitHub', async () => {
  await assert.rejects(() => createBlob('TOKEN', 'a', 'b', 'A'.repeat(3_400_001)), /quá lớn/);
});

test('commit refuses stale head before creating a tree', async () => {
  const oldFetch = globalThis.fetch;
  let calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.includes('/git/ref/heads/main')) return mockResponse(200, { object: { sha: SHA } });
    if (url.includes(`/git/commits/${SHA}`)) return mockResponse(200, { tree: { sha: TREE } });
    if (url.includes(`/git/trees/${TREE}`)) return mockResponse(200, { tree: [], truncated: false });
    throw Error('Should not make mutation on stale branch.');
  };
  try {
    await assert.rejects(() => createCommit('TOKEN', {
      owner: 'test', repo: 'repo', branch: 'main', expectedHead: COMMIT, message: 'source_v1.2',
      entries: [{ path: 'README.md', mode: '100644', sha: TREE }],
    }), /Branch đã thay đổi/);
    assert.equal(calls.length, 3);
  } finally { globalThis.fetch = oldFetch; }
});

test('successful commit creates Git tree, Git commit, then fast-forwards branch', async () => {
  const originalFetch = globalThis.fetch;
  const log = [];
  globalThis.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    log.push({ url, method: options.method, body });
    if (url.endsWith('/git/ref/heads/main')) return mockResponse(200, { object: { sha: SHA } });
    if (url.endsWith(`/git/commits/${SHA}`)) return mockResponse(200, { tree: { sha: TREE } });
    if (url.includes(`/git/trees/${TREE}?recursive=1`)) return mockResponse(200, { tree: [], truncated: false });
    if (url.endsWith('/git/trees') && options.method === 'POST') return mockResponse(201, { sha: TREE });
    if (url.endsWith('/git/commits') && options.method === 'POST') return mockResponse(201, { sha: COMMIT });
    if (url.endsWith('/git/refs/heads/main') && options.method === 'PATCH') return mockResponse(200, { object: { sha: COMMIT } });
    throw Error(`Unexpected GitHub endpoint: ${url}`);
  };
  try {
    const data = await createCommit('TOKEN', {
      owner: 'test', repo: 'repo', branch: 'main', expectedHead: SHA,
      message: 'Finzaro_v1.2.0', entries: [{ path: 'public/logo.png', mode: '100644', sha: TREE }],
    });
    assert.equal(data.sha, COMMIT);
    assert.equal(data.changed, 1);
    assert.equal(log.length, 6);
    assert.equal(log[3].body.base_tree, TREE);
    assert.equal(log[4].body.message, 'Finzaro_v1.2.0');
    assert.deepEqual(log[4].body.parents, [SHA]);
    assert.equal(log[5].body.force, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('empty source files can be uploaded as Git blobs', async () => {
  const oldFetch = globalThis.fetch;
  let posted;
  globalThis.fetch = async (_url, options) => {
    posted = JSON.parse(options.body);
    return mockResponse(201, { sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391' });
  };
  try {
    const sha = await createBlob('TOKEN', 'owner', 'repo', '');
    assert.equal(sha, 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    assert.deepEqual(posted, { content: '', encoding: 'base64' });
  } finally { globalThis.fetch = oldFetch; }
});


test('GitHub error identifies exact failed operation and preserves 404 status', async () => {
  assert.equal(githubStage('/repos/a/b/git/refs/heads/main', 'PATCH'), 'UPDATE_BRANCH');
  await assert.rejects(() => github('SECRET', '/repos/a/b/git/refs/heads/main', 'PATCH', { sha: SHA, force: false },
    async () => mockResponse(404, { message: 'Not Found' })),
    (error) => error.status === 404 && error.stage === 'UPDATE_BRANCH' &&
      error.message.includes('UPDATE_BRANCH') && error.hint.includes('Owner/Repository'));
});

test('OAuth scopes parsed from GitHub token response', () => {
  assert.deepEqual(parseOAuthScopes('repo,workflow'), ['repo', 'workflow']);
  assert.deepEqual(parseOAuthScopes('repo workflow'), ['repo', 'workflow']);
  assert.deepEqual(parseOAuthScopes(undefined), []);
});

test('workflow changes require workflow scope but ordinary files do not', () => {
  assert.doesNotThrow(() => validateWorkflowScope([{ path: 'src/page.jsx' }], ['repo']));
  assert.doesNotThrow(() => validateWorkflowScope([{ path: '.github/workflows/ci.yml' }], ['repo', 'workflow']));
  assert.throws(() => validateWorkflowScope([{ path: '.github/workflows/ci.yaml' }], ['repo']),
    (error) => error.status === 403 && error.code === 'WORKFLOW_SCOPE_REQUIRED' && error.stage === 'PREFLIGHT');
});

test('preflight rejects missing workflow grant before any GitHub network request', async () => {
  const oldFetch = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => { count++; throw Error('Should not fetch'); };
  try {
    await assert.rejects(() => preflight('TOKEN', 'owner', 'repo', 'main', ['.github/workflows/ci.yml'], ['repo']),
      (error) => error.code === 'WORKFLOW_SCOPE_REQUIRED');
    assert.equal(count, 0);
  } finally { globalThis.fetch = oldFetch; }
});

test('preflight verifies repository write permission from GitHub', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse(200, { permissions: { pull: true, push: false }, archived: false });
  try {
    await assert.rejects(() => preflight('TOKEN', 'owner', 'repo', 'main', [], ['repo']),
      (error) => error.code === 'REPO_WRITE_DENIED' && error.status === 403);
  } finally { globalThis.fetch = oldFetch; }
});

test('preflight allows writable repository with workflow scope', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse(200, { permissions: { push: true }, archived: false });
  try {
    const result = await preflight('TOKEN', 'owner', 'repo', 'main', ['.github/workflows/build.yml'], ['repo', 'workflow']);
    assert.deepEqual(result, { writable: true, workflowPermission: true });
  } finally { globalThis.fetch = oldFetch; }
});

test('create commit refuses workflow edit with inadequate scope before write API', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw Error('Should not call API'); };
  try {
    await assert.rejects(() => createCommit('TOKEN', {
      owner: 'owner', repo: 'repo', branch: 'main', expectedHead: SHA,
      message: 'sample', entries: [{ path: '.github/workflows/ci.yml', mode: '100644', sha: TREE }],
    }, ['repo']), (error) => error.code === 'WORKFLOW_SCOPE_REQUIRED');
  } finally { globalThis.fetch = oldFetch; }
});
