import test from 'node:test';
import assert from 'node:assert/strict';
import { canRetry, withSafeRetry, validJournal } from '../lib/reliability.js';
import { classifyPushOutcome } from '../lib/verification.js';
import { createCommit, verifyPush } from '../lib/github.js';

const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40), D = 'd'.repeat(40);
const data = { owner: 'team', repo: 'demo', branch: 'main', expectedHead: A, message: 'Demo_v1.3.4', entries: [{ path: 'README.md', mode: '100644', sha: B }] };
const successCommit = { message: data.message, parents: [{ sha: A }] };
const successFiles = [{ path: 'README.md', mode: '100644', sha: B, type: 'blob' }];
const response = (status, json) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(json) });

test('safe retry allows only reads and content-addressed Git blobs', () => {
  assert.equal(canRetry('blob', { network: true }), true);
  assert.equal(canRetry('snapshot', { httpStatus: 503 }), true);
  assert.equal(canRetry('verify', { httpStatus: 429 }), true);
  assert.equal(canRetry('commit', { network: true }), false);
  assert.equal(canRetry('blob', { httpStatus: 404 }), false);
  assert.equal(canRetry('preflight', { httpStatus: 403 }), false);
});

test('safe retry succeeds after transient failure, and honors attempt cap', async () => {
  let calls = 0;
  const result = await withSafeRetry(async () => {
    calls++;
    if (calls < 3) throw Object.assign(new Error('temporary'), { network: true });
    return 'ok';
  }, { endpoint: 'blob', pause: async () => {} });
  assert.equal(result, 'ok'); assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(() => withSafeRetry(async () => {
    calls++; throw Object.assign(new Error('error'), { httpStatus: 503 });
  }, { endpoint: 'commit', pause: async () => {} }), /error/);
  assert.equal(calls, 1);
});

test('journal only accepts valid commit metadata; no token needed', () => {
  assert.equal(validJournal(data), true);
  assert.equal(validJournal({ ...data, entries: [{ path: 'a', sha: 'BAD' }] }), false);
  assert.equal(validJournal({ ...data, expectedHead: 'BAD' }), false);
});

test('verification requires first child, message, and exact file hashes', () => {
  const opts = { ...data, head: C, commit: successCommit, files: successFiles };
  assert.equal(classifyPushOutcome(opts).state, 'applied');
  assert.equal(classifyPushOutcome({ ...opts, head: A }).state, 'not_applied');
  assert.equal(classifyPushOutcome({ ...opts, commit: { ...successCommit, message: 'other' } }).state, 'unknown');
  assert.equal(classifyPushOutcome({ ...opts, files: [{ ...successFiles[0], sha: D }] }).state, 'unknown');
  assert.equal(classifyPushOutcome({ ...opts, knownCommitSha: D }).state, 'unknown');
});

test('lost PATCH response but updated remote branch is reported as verified success', async () => {
  const previous = globalThis.fetch;
  let head = A, patchCount = 0, createCount = 0;
  globalThis.fetch = async (url, opts = {}) => {
    if (url.includes('/user/installations?')) return response(200, { installations: [{ id: 42, account: { login: 'team' }, permissions: { contents: 'write', workflows: 'write' } }] });
    if (url.includes('/user/installations/42/repositories')) return response(200, { repositories: [{ full_name: 'team/demo', permissions: { push: true } }] });
    if (url.endsWith('/repos/team/demo') && opts.method === 'GET') return response(200, { permissions: { push: true }, archived: false });
    if (url.endsWith('/git/ref/heads/main') && opts.method === 'GET') return response(200, { object: { sha: head } });
    if (url.endsWith(`/git/commits/${A}`)) return response(200, { tree: { sha: D } });
    if (url.endsWith(`/git/commits/${C}`)) return response(200, { tree: { sha: D }, ...successCommit });
    if (url.includes('/git/trees/') && opts.method === 'GET') return response(200, { truncated: false, tree: head === C ? successFiles : [] });
    if (url.endsWith('/git/trees') && opts.method === 'POST') return response(201, { sha: D });
    if (url.endsWith('/git/commits') && opts.method === 'POST') { createCount++; return response(201, { sha: C }); }
    if (url.endsWith('/git/refs/heads/main') && opts.method === 'PATCH') { patchCount++; head = C; throw new TypeError('network dropped after PATCH'); }
    throw new Error('unexpected request '+url);
  };
  try {
    const result = await createCommit('TOKEN', data);
    assert.equal(result.verified, true);
    assert.equal(result.recovered, true);
    assert.equal(result.sha, C);
    assert.equal(patchCount, 1);
    assert.equal(createCount, 1);
  } finally { globalThis.fetch = previous; }
});

test('repeated commit request detects prior matching commit without mutation', async () => {
  const previous = globalThis.fetch;
  let mutations = 0;
  globalThis.fetch = async (url, opts = {}) => {
    if (url.includes('/user/installations?')) return response(200, { installations: [{ id: 42, account: { login: 'team' }, permissions: { contents: 'write', workflows: 'write' } }] });
    if (url.includes('/user/installations/42/repositories')) return response(200, { repositories: [{ full_name: 'team/demo', permissions: { push: true } }] });
    if (url.endsWith('/repos/team/demo') && opts.method === 'GET') return response(200, { permissions: { push: true }, archived: false });
    if (opts.method !== 'GET') { mutations++; throw new Error('must not mutate'); }
    if (url.endsWith('/git/ref/heads/main')) return response(200, { object: { sha: C } });
    if (url.endsWith(`/git/commits/${C}`)) return response(200, { tree: { sha: D }, ...successCommit });
    if (url.endsWith(`/git/trees/${D}?recursive=1`)) return response(200, { truncated: false, tree: successFiles });
    throw new Error('unexpected GET '+url);
  };
  try {
    const result = await createCommit('TOKEN', data);
    assert.equal(result.recovered, true);
    assert.equal(result.sha, C);
    assert.equal(mutations, 0);
  } finally { globalThis.fetch = previous; }
});

test('verification detects unchanged head without commit mutation', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    if (url.includes('/user/installations?')) return response(200, { installations: [{ id: 42, account: { login: 'team' }, permissions: { contents: 'write', workflows: 'write' } }] });
    if (url.includes('/user/installations/42/repositories')) return response(200, { repositories: [{ full_name: 'team/demo', permissions: { push: true } }] });
    if (url.endsWith('/repos/team/demo') && opts.method === 'GET') return response(200, { permissions: { push: true }, archived: false });
    assert.equal(opts.method, 'GET');
    if (url.endsWith('/git/ref/heads/main')) return response(200, { object: { sha: A } });
    if (url.endsWith(`/git/commits/${A}`)) return response(200, { tree: { sha: D } });
    if (url.endsWith(`/git/trees/${D}?recursive=1`)) return response(200, { truncated: false, tree: [] });
    throw new Error(url);
  };
  try {
    assert.equal((await verifyPush('TOKEN', data)).state, 'not_applied');
  } finally { globalThis.fetch = previous; }
});

test('uncertain PATCH with changed unrelated HEAD refuses to report success or replay', async () => {
  const previous = globalThis.fetch;
  let patchCount = 0, head = A;
  globalThis.fetch = async (url, opts = {}) => {
    if (url.includes('/user/installations?')) return response(200, { installations: [{ id: 42, account: { login: 'team' }, permissions: { contents: 'write', workflows: 'write' } }] });
    if (url.includes('/user/installations/42/repositories')) return response(200, { repositories: [{ full_name: 'team/demo', permissions: { push: true } }] });
    if (url.endsWith('/repos/team/demo') && opts.method === 'GET') return response(200, { permissions: { push: true }, archived: false });
    if (url.endsWith('/git/ref/heads/main') && opts.method === 'GET') return response(200, { object: { sha: head } });
    if (url.endsWith(`/git/commits/${A}`)) return response(200, { tree: { sha: D } });
    if (url.endsWith(`/git/commits/${D}`)) return response(200, { tree: { sha: D }, message: 'unrelated', parents: [{ sha: A }] });
    if (url.endsWith('/git/trees') && opts.method === 'POST') return response(201, { sha: D });
    if (url.endsWith('/git/commits') && opts.method === 'POST') return response(201, { sha: C });
    if (url.includes('/git/trees/') && opts.method === 'GET') return response(200, { truncated: false, tree: [] });
    if (url.endsWith('/git/refs/heads/main') && opts.method === 'PATCH') { patchCount++; head = D; throw new TypeError('network lost'); }
    throw Error(url);
  };
  try {
    await assert.rejects(() => createCommit('TOKEN', data), (error) => error.code === 'PUSH_UNCONFIRMED');
    assert.equal(patchCount, 1);
  } finally { globalThis.fetch = previous; }
});

test('outbound GitHub network timeout is 503 with stage, without leaking token', async () => {
  const { github } = await import('../lib/github.js');
  await assert.rejects(() => github('MY_SECRET', '/repos/team/demo/git/blobs', 'POST', { content: '', encoding: 'base64' },
    async () => { throw new TypeError('connect ECONNRESET'); }),
    (error) => error.status === 503 && error.stage === 'UPLOAD_BLOB' &&
      error.code === 'GITHUB_NETWORK_ERROR' && !error.message.includes('MY_SECRET'));
});

test('transient PATCH retries identical commit SHA only once when branch remains old', async () => {
  const oldFetch = globalThis.fetch;
  let head = A, patchCount = 0, commitCreates = 0, patchSha = [];
  globalThis.fetch = async (url, opts = {}) => {
    if (url.includes('/user/installations?')) return response(200, { installations: [{ id: 42, account: { login: 'team' }, permissions: { contents: 'write', workflows: 'write' } }] });
    if (url.includes('/user/installations/42/repositories')) return response(200, { repositories: [{ full_name: 'team/demo', permissions: { push: true } }] });
    if (url.endsWith('/repos/team/demo') && opts.method === 'GET') return response(200, { permissions: { push: true }, archived: false });
    if (url.endsWith('/git/ref/heads/main') && opts.method === 'GET') return response(200, { object: { sha: head } });
    if (url.endsWith(`/git/commits/${A}`)) return response(200, { tree: { sha: D } });
    if (url.endsWith(`/git/commits/${C}`)) return response(200, { tree: { sha: D }, ...successCommit });
    if (url.includes('/git/trees/') && opts.method === 'GET') return response(200, { truncated: false, tree: head === C ? successFiles : [] });
    if (url.endsWith('/git/trees') && opts.method === 'POST') return response(201, { sha: D });
    if (url.endsWith('/git/commits') && opts.method === 'POST') { commitCreates++; return response(201, { sha: C }); }
    if (url.endsWith('/git/refs/heads/main') && opts.method === 'PATCH') {
      patchSha.push(JSON.parse(opts.body).sha);
      patchCount++;
      if (patchCount === 1) throw new TypeError('temporary network failure');
      head = C;
      return response(200, { object: { sha: C } });
    }
    throw Error(url);
  };
  try {
    const result = await createCommit('TOKEN', data);
    assert.equal(result.verified, true);
    assert.equal(result.recovered, true);
    assert.equal(commitCreates, 1);
    assert.deepEqual(patchSha, [C, C]);
  } finally { globalThis.fetch = oldFetch; }
});

test('new mobile status and recovery actions are present without losing 1.3.3 safe-area', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../app/page.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(page, /Xác minh push trên GitHub/);
  assert.match(page, /JOURNAL_KEY/);
  assert.match(page, /phase\.replaceAll/);
  assert.match(page, /v3\.9\.13/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /recovery-banner/);
});
