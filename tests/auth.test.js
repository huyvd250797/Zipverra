import test from 'node:test';
import assert from 'node:assert/strict';
import { appUrl, cookieName, encodeSession, decodeSession, currentSession, secureEquals, checkOrigin } from '../lib/auth/session.js';
import { handle } from '../lib/http.js';

const ENV = { APP_URL: 'https://zipverra.example', SESSION_SECRET: 'b'.repeat(64), NODE_ENV: 'production' };
const USER = { id: 12345, login: 'sample-developer', avatar_url: 'https://avatars.githubusercontent.com/u/12345' };
function request(path, options = {}, value = null) {
  const headers = new Headers(options.headers || {});
  if (value) headers.set('cookie', `${cookieName('session', ENV)}=${value}`);
  return new Request(`https://zipverra.example/${path}`, { ...options, headers });
}

test('OAuth APP_URL rejects HTTP outside localhost and embedded credentials', () => {
  assert.equal(appUrl(ENV), 'https://zipverra.example');
  assert.equal(appUrl({ APP_URL: 'http://localhost:3000' }), 'http://localhost:3000');
  assert.throws(() => appUrl({ APP_URL: 'http://example.com' }), /HTTPS/);
  assert.throws(() => appUrl({ APP_URL: 'https://username:pass@example.com' }), /HTTPS/);
  assert.throws(() => appUrl({ APP_URL: 'https://example.com/subdir' }), /HTTPS/);
});

test('session encrypts OAuth access token, and decodes identity', () => {
  const encrypted = encodeSession({ token: 'gho_example_valid_token', user: USER }, ENV, 100_000);
  assert.doesNotMatch(encrypted, /gho_example_valid_token|sample-developer/);
  const decoded = decodeSession(encrypted, ENV, 150_000);
  assert.equal(decoded.token, 'gho_example_valid_token');
  assert.equal(decoded.user.login, USER.login);
  assert.equal(decoded.expiresAt, 100_000 + 7 * 86_400_000);
});

test('session rejects tampering, wrong key, expiration, invalid user', () => {
  const encrypted = encodeSession({ token: 'gho_example_valid_token', user: USER }, ENV, 100_000);
  assert.equal(decodeSession(encrypted + 'xyz', ENV, 150_000), null);
  assert.equal(decodeSession(encrypted, { ...ENV, SESSION_SECRET: 'x'.repeat(64) }, 150_000), null);
  assert.equal(decodeSession(encrypted, ENV, 100_000 + 7 * 86_400_000), null);
  assert.throws(() => encodeSession({ token: 'short', user: USER }, ENV), /không hợp lệ/);
  assert.throws(() => encodeSession({ token: 'gho_example_valid_token', user: USER }, { ...ENV, SESSION_SECRET: 'short' }), /32/);
});

test('session cookie has __Host- prefix in production and validates expiry', () => {
  const encrypted = encodeSession({ token: 'gho_example_valid_token', user: USER }, ENV);
  const current = currentSession(request('api/auth/session', {}, encrypted), ENV);
  assert.equal(current.user.id, USER.id);
  assert.equal(cookieName('session', ENV), '__Host-zipverra_session');
  assert.equal(currentSession(request('api/auth/session'), ENV), null);
});

test('OAuth state constant-time equality handles missing and mismatched values', () => {
  assert.equal(secureEquals('abcd', 'abcd'), true);
  assert.equal(secureEquals('abcd', 'abce'), false);
  assert.equal(secureEquals('abcd', undefined), false);
  assert.equal(secureEquals('abcd', 'ab'), false);
});

test('CSRF requires exact origin match for mutation requests', () => {
  assert.equal(checkOrigin(request('api/github/repos', { headers: { origin: ENV.APP_URL } }), ENV), true);
  assert.throws(() => checkOrigin(request('api/github/repos'), ENV), /Origin/);
  assert.throws(() => checkOrigin(request('api/github/repos', { headers: { origin: 'https://evil.example' } }), ENV), /Origin/);
  assert.throws(() => checkOrigin(request('api/github/repos', { headers: { origin: 'https://zipverra.example.evil.test' } }), ENV), /Origin/);
});

const original = { SESSION_SECRET: process.env.SESSION_SECRET, APP_URL: process.env.APP_URL, NODE_ENV: process.env.NODE_ENV };
test('GitHub API rejects unauthenticated requests and hostile origins without calling action', async () => {
  Object.assign(process.env, ENV);
  try {
    let invoked = 0;
    const notLoggedIn = await handle(request('api/github/repos', { method: 'POST', headers: { origin: ENV.APP_URL, 'content-type': 'application/json' }, body: '{}' }), async () => { invoked++; return {}; });
    assert.equal(notLoggedIn.status, 401);
    assert.equal(invoked, 0);
    const token = encodeSession({ token: 'gho_example_valid_token', user: USER }, ENV);
    const malicious = await handle(request('api/github/repos', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' }, token), async () => { invoked++; return {}; });
    assert.equal(malicious.status, 403);
    assert.equal(invoked, 0);
  } finally {
    for (const [key, value] of Object.entries(original)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});

test('GitHub API uses server-side token from encrypted cookie, ignoring client token field', async () => {
  Object.assign(process.env, ENV);
  try {
    const cookie = encodeSession({ token: 'gho_example_valid_token', user: USER }, ENV);
    const received = [];
    const r = await handle(request('api/github/repos', { method: 'POST', headers: { origin: ENV.APP_URL, 'content-type': 'application/json' }, body: JSON.stringify({ token: 'FAKE-CLIENT-TOKEN' }) }, cookie), async (body, token) => { received.push({ body, token }); return { ok: true }; });
    assert.equal(r.status, 200);
    assert.equal(received[0].token, 'gho_example_valid_token');
    assert.equal(received[0].body.token, 'FAKE-CLIENT-TOKEN');
  } finally {
    for (const [key, value] of Object.entries(original)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});
