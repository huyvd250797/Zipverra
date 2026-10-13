import test from 'node:test';
import assert from 'node:assert/strict';
import { appUrl, cookieName, encodeSession, decodeSession, currentSession, secureEquals, checkOrigin, cookieHeader } from '../lib/auth/session.js';
import { handle } from '../lib/http.js';
import { authorizeUrl, installUrl, normalizeTokenResponse, resolveAppSession, exchangeAppToken, githubAppConfig } from '../lib/auth/github-app.js';

const ENV = { APP_URL: 'https://zipverra.example', SESSION_SECRET: 'b'.repeat(64), NODE_ENV: 'production', GITHUB_APP_CLIENT_ID: 'Iv1.a0bcdee777', GITHUB_APP_CLIENT_SECRET: 'secret_long_enough_for_tests', GITHUB_APP_SLUG: 'zipverra' };
const USER = { id: 12345, login: 'sample-developer', avatar_url: 'https://avatars.githubusercontent.com/u/12345' };
const tokenData = (now = Date.now()) => ({ token: 'ghu_example_valid_token', refreshToken: 'ghr_example_refresh_token', tokenExpiresAt: now + 8 * 3600e3, refreshExpiresAt: now + 180 * 86400e3 });
function request(path, options = {}, value = null) {
  const headers = new Headers(options.headers || {});
  if (value) headers.set('cookie', `${cookieName('session', ENV)}=${value}`);
  return new Request(`https://zipverra.example/${path}`, { ...options, headers });
}

test('APP_URL only accepts HTTPS domain root or local development', () => {
  assert.equal(appUrl(ENV), 'https://zipverra.example');
  assert.equal(appUrl({ APP_URL: 'http://localhost:3000' }), 'http://localhost:3000');
  assert.throws(() => appUrl({ APP_URL: 'http://example.com' }), /HTTPS/);
  assert.throws(() => appUrl({ APP_URL: 'https://username:pass@example.com' }), /HTTPS/);
  assert.throws(() => appUrl({ APP_URL: 'https://example.com/subdir' }), /HTTPS/);
});

test('GitHub App encrypted session keeps access+refresh tokens server-side and rejects old OAuth cookies', () => {
  const now = 100_000;
  const encrypted = encodeSession({ ...tokenData(now), user: USER }, ENV, now);
  assert.doesNotMatch(encrypted, /ghu_example|ghr_example|sample-developer/);
  const decoded = decodeSession(encrypted, ENV, now + 1000);
  assert.equal(decoded.token, tokenData(now).token);
  assert.equal(decoded.refreshToken, tokenData(now).refreshToken);
  assert.equal(decoded.authType, 'github_app');
  assert.equal(decoded.expiresAt, now + 7 * 86_400_000);
  assert.equal(decodeSession(encrypted + 'garbage', ENV, now + 1000), null);
  assert.equal(decodeSession(encrypted, { ...ENV, SESSION_SECRET: 'x'.repeat(64) }, now + 1000), null);
  assert.equal(decodeSession(encrypted, ENV, now + 7 * 86_400_000), null);
});

test('session validation rejects missing refresh token and weak crypto secret', () => {
  assert.throws(() => encodeSession({ token: 'ghu_access_token', user: USER }, ENV), /không hợp lệ/);
  assert.throws(() => encodeSession({ ...tokenData(), user: USER }, { ...ENV, SESSION_SECRET: 'short' }), /32/);
  assert.throws(() => encodeSession({ ...tokenData(), token: 'short', user: USER }, ENV), /không hợp lệ/);
});

test('__Host- cookie is HttpOnly Secure SameSite and session is valid', () => {
  const encrypted = encodeSession({ ...tokenData(), user: USER }, ENV);
  assert.equal(currentSession(request('api/auth/session', {}, encrypted), ENV).user.id, USER.id);
  assert.equal(cookieName('session', ENV), '__Host-zipverra_session');
  const header = cookieHeader(cookieName('session', ENV), encrypted, { maxAge: 100, secure: true });
  assert.match(header, /HttpOnly; SameSite=Lax; Secure/);
});

test('OAuth state equality constant-time and CSRF strict origin', () => {
  assert.equal(secureEquals('abcd', 'abcd'), true);
  assert.equal(secureEquals('abcd', 'abce'), false);
  assert.equal(secureEquals('abcd', undefined), false);
  assert.equal(checkOrigin(request('api/github/repos', { headers: { origin: ENV.APP_URL } }), ENV), true);
  assert.throws(() => checkOrigin(request('api/github/repos'), ENV), /Origin/);
  assert.throws(() => checkOrigin(request('api/github/repos', { headers: { origin: 'https://evil.test' } }), ENV), /Origin/);
});

test('GitHub App web authorization never requests broad OAuth repo or workflow scopes', () => {
  const url = new URL(authorizeUrl('state'.repeat(12), ENV));
  assert.equal(url.host, 'github.com');
  assert.equal(url.searchParams.get('scope'), 'offline_access');
  assert.equal(url.searchParams.get('redirect_uri'), `${ENV.APP_URL}/api/auth/callback`);
  assert.equal(installUrl(ENV), 'https://github.com/apps/zipverra/installations/new');
  assert.throws(() => githubAppConfig({ ...ENV, GITHUB_APP_SLUG: 'evil.test/redirect' }));
});

test('GitHub App rejects non-expiring user tokens, accepts expiring tokens', () => {
  assert.throws(() => normalizeTokenResponse({ access_token: 'ghu_example_long', scope: 'repo' }), (e) => e.code === 'EXPIRING_TOKEN_REQUIRED');
  const normalized = normalizeTokenResponse({ access_token: 'ghu_example_long', refresh_token: 'ghr_example_long', expires_in: 28800, refresh_token_expires_in: 15897600 }, 1000);
  assert.equal(normalized.tokenExpiresAt, 28800000 + 1000);
});

test('refresh call is server-side POST and never leaks token into URL', async () => {
  let called;
  const token = await exchangeAppToken({ refreshToken: 'ghr_old_refresh_token' }, ENV, async (url, opts) => {
    called = { url, opts };
    return { ok: true, json: async () => ({ access_token: 'ghu_updated_token', refresh_token: 'ghr_updated_token', expires_in: 28800, refresh_token_expires_in: 15897600 }) };
  }, 3000);
  assert.equal(token.token, 'ghu_updated_token');
  assert.equal(called.opts.method, 'POST');
  assert.equal(new URLSearchParams(called.opts.body).get('grant_type'), 'refresh_token');
  assert.ok(!called.url.includes('ghr_old'));
});

test('refresh single-flight reuses one token rotation for concurrent requests in one server instance', async () => {
  const now = Date.now();
  const nearExpiry = { ...tokenData(now), tokenExpiresAt: now + 5000, user: USER };
  const cookie = encodeSession(nearExpiry, ENV, now);
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    await Promise.resolve();
    return { ok: true, json: async () => ({ access_token: 'ghu_refreshed_access', refresh_token: 'ghr_refreshed_token', expires_in: 28800, refresh_token_expires_in: 15897600 }) };
  };
  const req = request('api/auth/session', {}, cookie);
  const [a, b] = await Promise.all([resolveAppSession(req, ENV, now, fetcher), resolveAppSession(req, ENV, now, fetcher)]);
  assert.equal(calls, 1);
  assert.equal(a.session.token, 'ghu_refreshed_access');
  assert.equal(b.session.refreshToken, 'ghr_refreshed_token');
  assert.equal(a.rotated, true);
});

const prev = { SESSION_SECRET: process.env.SESSION_SECRET, APP_URL: process.env.APP_URL, NODE_ENV: process.env.NODE_ENV };
test('API enforces session and CSRF, reads token only from encrypted cookie', async () => {
  Object.assign(process.env, ENV);
  try {
    let invoked = 0;
    const anonymous = await handle(request('api/github/repos', { method: 'POST', headers: { origin: ENV.APP_URL, 'content-type': 'application/json' }, body: '{}' }), () => { invoked++; return {}; });
    assert.equal(anonymous.status, 401);
    const cookie = encodeSession({ ...tokenData(), user: USER }, ENV);
    const malicious = await handle(request('api/github/repos', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/json' }, body: '{}' }, cookie), () => { invoked++; return {}; });
    assert.equal(malicious.status, 403);
    const r = await handle(request('api/github/repos', { method: 'POST', headers: { origin: ENV.APP_URL, 'content-type': 'application/json' }, body: JSON.stringify({ token: 'FAKE-CLIENT' }) }, cookie), async (body, token) => { assert.equal(body.token, 'FAKE-CLIENT'); assert.equal(token, 'ghu_example_valid_token'); invoked++; return { ok: true }; });
    assert.equal(r.status, 200);
    assert.equal(invoked, 1);
  } finally { for (const [k, v] of Object.entries(prev)) v === undefined ? delete process.env[k] : process.env[k] = v; }
});

test('refresh token rejected by GitHub gives reconnect error without exposing the token', async () => {
  await assert.rejects(() => exchangeAppToken({ refreshToken: 'ghr_sensitive_refresh' }, ENV, async () => ({
    ok: false, json: async () => ({ error: 'bad_refresh_token' }),
  })), (e) => e.code === 'REFRESH_DENIED' && !e.message.includes('ghr_sensitive_refresh'));
});

test('GitHub App configuration rejects OAuth App client ID and secrets missing', () => {
  assert.throws(() => githubAppConfig({ ...ENV, GITHUB_APP_CLIENT_ID: 'abc123' }), (e) => e.code === 'APP_NOT_CONFIGURED');
  assert.throws(() => githubAppConfig({ ...ENV, GITHUB_APP_CLIENT_SECRET: '' }), (e) => e.code === 'APP_NOT_CONFIGURED');
});

test('session with expired refresh token cannot be accepted', () => {
  const now = 100_000;
  const cookie = encodeSession({ ...tokenData(now), tokenExpiresAt: now + 10_000, refreshExpiresAt: now + 3_600_000, user: USER }, ENV, now);
  assert.equal(decodeSession(cookie, ENV, now + 3_600_001), null);
});


test('modern real-world GitHub App Client IDs without a dot are accepted', () => {
  const config = githubAppConfig({ ...ENV, GITHUB_APP_CLIENT_ID: 'Iv23likezCs3H3thOomZ' });
  assert.equal(config.id, 'Iv23likezCs3H3thOomZ');
  assert.equal(config.origin, ENV.APP_URL);
  assert.equal(authorizeUrl('x'.repeat(32), { ...ENV, GITHUB_APP_CLIENT_ID: 'Iv23likezCs3H3thOomZ' }).includes('client_id=Iv23likezCs3H3thOomZ'), true);
});

test('configuration errors identify incorrect variable names but never reveal secrets', () => {
  const marker = 'SENSITIVE_GITHUB_SECRET_VALUE_123';
  assert.throws(() => githubAppConfig({ ...ENV, GITHUB_APP_CLIENT_ID: 'invalid', GITHUB_APP_CLIENT_SECRET: '' }), (e) => {
    assert.equal(e.code, 'APP_NOT_CONFIGURED');
    assert.match(e.message, /GITHUB_APP_CLIENT_ID/);
    assert.match(e.message, /GITHUB_APP_CLIENT_SECRET/);
    assert.doesNotMatch(e.message, /SENSITIVE_GITHUB_SECRET_VALUE_123/);
    return true;
  });
  assert.throws(() => githubAppConfig({ ...ENV, APP_URL: 'https://example.org/extra', GITHUB_APP_CLIENT_SECRET: marker }), (e) => {
    assert.equal(e.code, 'APP_URL_INVALID');
    assert.match(e.message, /APP_URL/);
    assert.doesNotMatch(e.message, /SENSITIVE_GITHUB_SECRET_VALUE_123/);
    return true;
  });
});
