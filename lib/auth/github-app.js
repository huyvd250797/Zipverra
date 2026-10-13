import { createHash } from 'node:crypto';
import { appUrl, currentSession } from './session.js';

export class AuthError extends Error {
  constructor(message, status = 401, code = 'GITHUB_APP_AUTH_ERROR') {
    super(message); this.status = status; this.code = code;
  }
}

export function githubAppConfig(env = process.env) {
  // GitHub currently issues both legacy IDs like Iv1.abc... and modern IDs
  // like Iv23abc... (without a period). Never require a period here.
  const id = typeof env.GITHUB_APP_CLIENT_ID === 'string' ? env.GITHUB_APP_CLIENT_ID.trim() : '';
  const secret = env.GITHUB_APP_CLIENT_SECRET;
  const slug = typeof env.GITHUB_APP_SLUG === 'string' ? env.GITHUB_APP_SLUG.trim() : '';
  const problems = [];
  if (!id || !/^Iv[A-Za-z0-9._-]{8,120}$/.test(id)) problems.push('GITHUB_APP_CLIENT_ID');
  if (typeof secret !== 'string' || secret.length < 12) problems.push('GITHUB_APP_CLIENT_SECRET');
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,99}$/i.test(slug)) problems.push('GITHUB_APP_SLUG');
  if (problems.length) {
    // Never include the actual Client Secret or any credential value in errors.
    throw new AuthError(`Thiếu hoặc sai định dạng: ${problems.join(', ')}. Kiểm tra Environment Variables (Production) và Redeploy trên Vercel.`, 503, 'APP_NOT_CONFIGURED');
  }
  let origin;
  try { origin = appUrl(env); } catch {
    throw new AuthError('APP_URL thiếu hoặc không hợp lệ. Hãy nhập URL HTTPS gốc của Zipverra, ví dụ https://zipverra.vercel.app, trong Environment Variables rồi Redeploy.', 503, 'APP_URL_INVALID');
  }
  return { id, secret, slug, origin };
}
export function installUrl(env = process.env) {
  return `https://github.com/apps/${githubAppConfig(env).slug}/installations/new`;
}

export function authorizeUrl(state, env = process.env) {
  const { id, origin } = githubAppConfig(env);
  if (!state || state.length < 30) throw new AuthError('OAuth state không hợp lệ.', 400);
  const uri = new URL('https://github.com/login/oauth/authorize');
  uri.searchParams.set('client_id', id);
  uri.searchParams.set('redirect_uri', `${origin}/api/auth/callback`);
  uri.searchParams.set('state', state);
  // GitHub Apps DO NOT use OAuth "repo" or "workflow" scopes. "offline_access"
  // opts into expiring user access tokens, even on existing app configurations.
  uri.searchParams.set('scope', 'offline_access');
  return uri.toString();
}

export function normalizeTokenResponse(data, now = Date.now()) {
  if (!data || typeof data.access_token !== 'string' || data.access_token.length < 10 ||
      typeof data.refresh_token !== 'string' || data.refresh_token.length < 10 ||
      !Number.isInteger(data.expires_in) || data.expires_in < 60 || data.expires_in > 86400 ||
      !Number.isInteger(data.refresh_token_expires_in) || data.refresh_token_expires_in < 60) {
    throw new AuthError('GitHub App chưa trả expiring user token. Hãy bật User-to-server token expiration và đăng nhập lại.', 503, 'EXPIRING_TOKEN_REQUIRED');
  }
  return { token: data.access_token, refreshToken: data.refresh_token,
    tokenExpiresAt: now + data.expires_in * 1000,
    refreshExpiresAt: now + data.refresh_token_expires_in * 1000 };
}

export async function exchangeAppToken(input, env = process.env, fetcher = fetch, now = Date.now()) {
  const { id, secret, origin } = githubAppConfig(env);
  if (!input?.code && !input?.refreshToken) throw new AuthError('Thiếu code hoặc refresh token.', 400);
  const params = new URLSearchParams({ client_id: id, client_secret: secret });
  if (input.refreshToken) {
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', input.refreshToken);
  } else {
    params.set('code', input.code);
    params.set('redirect_uri', `${origin}/api/auth/callback`);
  }
  let r, data;
  try {
    r = await fetcher('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Zipverra' },
      body: params.toString(), cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    data = await r.json();
  } catch { throw new AuthError('GitHub Authentication tạm thời không phản hồi.', 503, 'AUTH_NETWORK_ERROR'); }
  if (!r.ok || data?.error) {
    throw new AuthError(input.refreshToken ? 'Phiên GitHub đã bị thu hồi hoặc refresh token không còn hợp lệ. Hãy đăng nhập lại.' : 'GitHub không thể hoàn tất đăng nhập.',
      401, input.refreshToken ? 'REFRESH_DENIED' : 'EXCHANGE_FAILED');
  }
  return normalizeTokenResponse(data, now);
}

// Single-flight per active isolate prevents two simultaneous requests rotating the
// same refresh token. This is best-effort across separate serverless instances.
const inflight = new Map();
export async function resolveAppSession(request, env = process.env, now = Date.now(), fetcher = fetch) {
  const session = currentSession(request, env);
  if (!session) return { session: null, rotated: false };
  if (session.tokenExpiresAt > now + 60000) return { session, rotated: false };
  if (session.refreshExpiresAt <= now + 60000) throw new AuthError('Refresh token GitHub đã hết hạn. Hãy đăng nhập lại.', 401, 'SESSION_EXPIRED');
  const key = createHash('sha256').update(session.refreshToken).digest('hex');
  if (!inflight.has(key)) {
    const task = exchangeAppToken({ refreshToken: session.refreshToken }, env, fetcher, now);
    inflight.set(key, task);
    // Ensure rejection never turns into an unhandled rejection.
    void task.finally(() => { if (inflight.get(key) === task) inflight.delete(key); }).catch(() => {});
  }
  const updated = await inflight.get(key);
  return { session: { ...session, ...updated }, rotated: true };
}
