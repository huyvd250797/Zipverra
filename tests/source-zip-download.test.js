import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMainSourceZipUrl, validateArchiveRedirect, validateSourceZipRequest, DOWNLOAD_BRANCH } from '../lib/source-zip.js';
import { AppError } from '../lib/github.js';
import { encodeSession, cookieName } from '../lib/auth/session.js';
import { GET } from '../app/api/github/source-zip/route.js';

const SHA = 'a'.repeat(40);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const archiveLink = 'https://codeload.github.com/alice/demo/legacy.zip/refs/heads/main?token=short_lived';

test('download is locked to main and validates repository coordinates', () => {
  assert.equal(DOWNLOAD_BRANCH, 'main');
  assert.deepEqual(validateSourceZipRequest('alice', 'demo'), { owner: 'alice', repo: 'demo', branch: 'main' });
  for (const [owner, repo] of [['../etc', 'demo'], ['alice', '../../other'], ['alice', ''], ['', 'demo'], ['alice', 'repo?branch=dev']]) {
    assert.throws(() => validateSourceZipRequest(owner, repo), (error) => error.code === 'INVALID_ARCHIVE_REPOSITORY');
  }
});

test('only valid codeload.github.com ZIP redirects for the requested repo are accepted', () => {
  assert.equal(validateArchiveRedirect(archiveLink, 'alice', 'demo'), archiveLink);
  assert.match(validateArchiveRedirect('https://codeload.github.com/alice/demo/zip/refs/heads/main', 'alice', 'demo'), /zip\/refs/);
  for (const location of [
    'https://codeload.github.com.evil.net/alice/demo/legacy.zip/main',
    'https://evil.example/alice/demo/legacy.zip/main',
    'http://codeload.github.com/alice/demo/legacy.zip/main',
    'https://user:secret@codeload.github.com/alice/demo/legacy.zip/main',
    'https://codeload.github.com/other/demo/legacy.zip/main',
    'https://codeload.github.com/alice/other/legacy.zip/main',
    'https://codeload.github.com/alice/demo/legacy.tar/main',
    'javascript:alert(1)', '',
  ]) {
    assert.throws(() => validateArchiveRedirect(location, 'alice', 'demo'), (error) => error.code === 'ARCHIVE_REDIRECT_INVALID');
  }
});

test('grants and main HEAD are checked BEFORE fetching the GitHub ZIP redirect', async () => {
  const calls = [];
  const result = await getMainSourceZipUrl('access-secret', 'alice', 'demo', {
    checkGrant: async (...args) => { calls.push(['grant', ...args]); },
    read: async (...args) => { calls.push(['ref', ...args]); return {object:{sha:SHA}}; },
    fetcher: async (url, options) => {
      calls.push(['archive', url, options]);
      return new Response(null, { status:302, headers:{Location:archiveLink} });
    },
  });
  assert.equal(result, archiveLink);
  assert.deepEqual(calls.map(item => item[0]), ['grant', 'ref', 'archive']);
  assert.equal(calls[0][1], 'access-secret');
  assert.match(calls[1][2], /\/git\/ref\/heads\/main$/);
  assert.equal(calls[2][1], 'https://api.github.com/repos/alice/demo/zipball/main');
  assert.equal(calls[2][2].method, 'GET');
  assert.equal(calls[2][2].redirect, 'manual');
  assert.equal(calls[2][2].headers.Authorization, 'Bearer access-secret');
  assert.doesNotMatch(result, /access-secret/);
});

test('access denial and missing main never contact the archive endpoint', async () => {
  let requests = 0;
  const fetcher = async () => { requests++; throw Error('should not be called'); };
  await assert.rejects(() => getMainSourceZipUrl('secret', 'alice', 'demo', {
    checkGrant: async () => { throw new AppError('denied',403); }, fetcher,
  }), (error) => error.status === 403);
  await assert.rejects(() => getMainSourceZipUrl('secret', 'alice', 'demo', {
    checkGrant: async () => {},
    read: async () => { throw new AppError('GitHub 404', 404); }, fetcher,
  }), (error) => error.code === 'MAIN_BRANCH_MISSING');
  await assert.rejects(() => getMainSourceZipUrl('secret', 'alice', 'demo', {
    checkGrant: async () => {}, read: async () => ({object:{sha:'invalid'}}), fetcher,
  }), (error) => error.code === 'MAIN_HEAD_INVALID');
  assert.equal(requests, 0);
});

test('archive endpoint errors and redirect poisoning are handled without streaming ZIP bytes', async () => {
  for (const [status, expected] of [[403,'ARCHIVE_ACCESS_DENIED'],[404,'MAIN_ARCHIVE_MISSING'],[429,'ARCHIVE_RATE_LIMITED'],[200,'ARCHIVE_UNAVAILABLE']]) {
    let cancelled = false;
    const stream = new ReadableStream({ cancel: () => {cancelled = true;} });
    await assert.rejects(() => getMainSourceZipUrl('secret','alice','demo',{
      checkGrant:async()=>{},read:async()=>({object:{sha:SHA}}),
      fetcher:async()=>new Response(stream,{status}),
    }), (error) => error.code === expected);
    assert.equal(cancelled,true,`response ${status} body cancelled`);
  }
  await assert.rejects(() => getMainSourceZipUrl('secret','alice','demo',{
    checkGrant:async()=>{},read:async()=>({object:{sha:SHA}}),
    fetcher:async()=>new Response(null,{status:302,headers:{Location:'https://evil.test/alice/demo/legacy.zip/main'}}),
  }), (error) => error.code === 'ARCHIVE_REDIRECT_INVALID');
});

test('unauthenticated same-origin download responds with no-store HTML, not an open redirect', async () => {
  const response = await GET(new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo'));
  assert.equal(response.status, 401);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.equal(response.headers.get('Location'), null);
  assert.match(response.headers.get('Content-Type'), /^text\/html/);
  assert.match(await response.text(), /Quay về Zipverra/);
});

test('invalid repository query returns 400 without consulting GitHub', async () => {
  for (const query of ['?owner=alice', '?owner=alice&repo=demo&repo=second', '?owner=../etc&repo=demo']) {
    const response = await GET(new Request(`https://zipverra.example/api/github/source-zip${query}`));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Location'), null);
  }
});

test('authenticated GitHub App user downloads private main as short-lived GitHub redirect', async () => {
  const prevSecret = process.env.SESSION_SECRET;
  const prevFetch = globalThis.fetch;
  process.env.SESSION_SECRET = 'v3.0.1-source-zip-test-secret-not-for-production-123';
  const now = Date.now();
  const session = { token:'github_token_private', refreshToken:'refresh_private', tokenExpiresAt:now+3600000,
    refreshExpiresAt:now+86400000, user:{id:17,login:'alice'} };
  const cookie = `${cookieName('session')}=${encodeSession(session)}`;
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      const addr = String(url);
      calls.push({addr,options});
      assert.equal(options.headers.Authorization, 'Bearer github_token_private');
      if (addr.endsWith('/user/installations?per_page=100&page=1')) return Response.json({ installations:[{id:1,account:{login:'alice'},permissions:{contents:'write'}}] });
      if (addr.endsWith('/user/installations/1/repositories?per_page=100&page=1')) return Response.json({ repositories:[{full_name:'alice/demo',permissions:{push:true}}] });
      if (addr.endsWith('/repos/alice/demo/git/ref/heads/main')) return Response.json({object:{sha:SHA}});
      if (addr.endsWith('/repos/alice/demo/zipball/main')) return new Response(null,{status:302,headers:{Location:archiveLink}});
      throw Error('Unexpected API route: ' + addr);
    };
    const request = new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo', { headers: { Cookie:cookie } });
    const response = await GET(request);
    assert.equal(response.status,302);
    assert.equal(response.headers.get('Location'),archiveLink);
    assert.match(response.headers.get('Cache-Control'),/no-store/);
    assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
    assert.equal(calls.length,4);
    assert.ok(calls.every(x=>x.options.method === undefined || x.options.method === 'GET'));
    assert.ok(calls.every(x=>x.addr.startsWith('https://api.github.com/')));
    assert.doesNotMatch(JSON.stringify(calls.map(x=>x.addr)), /github_token_private/);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET=prevSecret;
  }
});

test('UI uses a real native download link, keeping main fixed despite selected branch', () => {
  const page = read('app/page.jsx');
  const ui = read('app/components/SourceZipDownload.jsx');
  const styles = read('app/styles/source-zip-download.css');
  assert.match(page, /<SourceZipDownload owner=\{owner\} repo=\{repo\}/);
  assert.match(ui, /\/api\/github\/source-zip\?owner=/);
  assert.match(ui, /target="_blank" rel="noopener noreferrer"/);
  assert.match(ui, /Branch <b>main<\/b>/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage|fetch\(|GITHUB_APP_CLIENT_SECRET|window\.open/);
  assert.match(styles, /safe|source-zip-download/);
  assert.match(read('app/layout.jsx'), /source-zip-download\.css/);
});

test('revoked GitHub App repository grant cannot return a private ZIP redirect', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const previousFetch = globalThis.fetch;
  process.env.SESSION_SECRET = 'zipverra-private-archive-denied-test-secret-123456';
  const now = Date.now();
  const session = { token:'valid-token-private', refreshToken:'valid-refresh', tokenExpiresAt:now+3600000,
    refreshExpiresAt:now+86400000, user:{id:17,login:'alice'} };
  const cookie = `${cookieName('session')}=${encodeSession(session)}`;
  const calls = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      if (String(url).includes('/user/installations?')) return Response.json({installations:[]});
      throw Error('Archive must never be requested without a valid grant');
    };
    const response = await GET(new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo', {headers:{Cookie:cookie}}));
    assert.equal(response.status,403);
    assert.equal(response.headers.get('Location'),null);
    assert.equal(calls.length,1);
    assert.doesNotMatch(await response.text(), /valid-token-private|valid-refresh/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET=previousSecret;
  }
});

test('authenticated repo without main returns a user-safe 404 without trying zipball', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const previousFetch = globalThis.fetch;
  process.env.SESSION_SECRET = 'zipverra-main-missing-test-secret-123456789';
  const now = Date.now();
  const cookie = `${cookieName('session')}=${encodeSession({ token:'valid-token-private', refreshToken:'valid-refresh',
    tokenExpiresAt:now+3600000,refreshExpiresAt:now+86400000,user:{id:17,login:'alice'} })}`;
  const calls = [];
  try {
    globalThis.fetch = async (url) => {
      const address = String(url); calls.push(address);
      if (address.includes('/user/installations?')) return Response.json({installations:[{id:1,account:{login:'alice'},permissions:{contents:'write'}}]});
      if (address.includes('/user/installations/1/repositories?')) return Response.json({repositories:[{full_name:'alice/demo',permissions:{push:true}}]});
      if (address.endsWith('/git/ref/heads/main')) return Response.json({message:'Not Found'}, {status:404});
      throw Error('Archive must never be requested without main');
    };
    const response = await GET(new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo', {headers:{Cookie:cookie}}));
    assert.equal(response.status,404);
    assert.equal(response.headers.get('Location'),null);
    assert.match(await response.text(), /branch main/);
    assert.equal(calls.length,3);
    assert.ok(calls.every(url=>!url.includes('/zipball/')));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET=previousSecret;
  }
});
