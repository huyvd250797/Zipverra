import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_DAYS = 7;
const SESSION_VERSION = 1;

export function appUrl(env = process.env) {
  const value = env.APP_URL;
  if (!value) throw new Error('Thiếu APP_URL trên Vercel.');
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('APP_URL không hợp lệ.'); }
  if ((parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('APP_URL phải là URL HTTPS tại domain gốc (localhost được phép dùng HTTP).');
  }
  return parsed.origin;
}

function secretKey(env = process.env) {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET phải có ít nhất 32 ký tự ngẫu nhiên.');
  return createHash('sha256').update(secret).digest();
}

export function cookieName(kind, env = process.env) {
  return env.NODE_ENV === 'production' ? `__Host-zipverra_${kind}` : `zipverra_${kind}`;
}

export function sessionOptions(env = process.env) {
  return { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 };
}

export function oauthOptions(env = process.env) {
  return { ...sessionOptions(env), maxAge: 600 };
}

export function encodeSession({ token, user, scopes = [] }, env = process.env, now = Date.now()) {
  if (typeof token !== 'string' || token.length < 10 || token.length > 1024 || !user || typeof user.login !== 'string' || !Number.isInteger(user.id)) {
    throw new Error('Không thể tạo phiên đăng nhập không hợp lệ.');
  }
  const value = JSON.stringify({ v: SESSION_VERSION, token, user: { id: user.id, login: user.login.slice(0, 100), avatar_url: user.avatar_url?.slice(0, 350) || '' }, scopes: Array.isArray(scopes) ? scopes.filter((s) => ['repo', 'workflow'].includes(s)) : [], expiresAt: now + SESSION_DAYS * 86400000 });
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function decodeSession(value, env = process.env, now = Date.now()) {
  try {
    if (typeof value !== 'string' || value.length > 3500 || !value) return null;
    const data = Buffer.from(value, 'base64url');
    if (data.length < 32) return null;
    const decipher = createDecipheriv('aes-256-gcm', secretKey(env), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const session = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
    if (session.v !== SESSION_VERSION || session.expiresAt <= now || session.expiresAt > now + SESSION_DAYS * 86400000 || typeof session.token !== 'string' || typeof session.user?.login !== 'string') return null;
    return session;
  } catch { return null; }
}

export function cookieValue(request, name) {
  const header = request.headers.get('cookie') || '';
  const prefix = `${name}=`;
  const part = header.split(';').map((x) => x.trim()).find((x) => x.startsWith(prefix));
  return part ? part.slice(prefix.length) : null;
}

export function currentSession(request, env = process.env) {
  return decodeSession(cookieValue(request, cookieName('session', env)), env);
}

export function secureEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkOrigin(request, env = process.env) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== appUrl(env)) throw new Error('Origin không hợp lệ. Chỉ chấp nhận yêu cầu từ ứng dụng.');
  return true;
}
