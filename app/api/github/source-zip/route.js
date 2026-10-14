import { resolveAppSession, AuthError } from '../../../../lib/auth/github-app.js';
import { cookieHeader, cookieName, encodeSession, sessionOptions } from '../../../../lib/auth/session.js';
import { AppError } from '../../../../lib/github.js';
import { getMainSourceZipUrl, validateSourceZipRequest } from '../../../../lib/source-zip.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function baseHeaders(session) {
  const headers = new Headers({
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  if (session) headers.set('Set-Cookie', cookieHeader(cookieName('session'), encodeSession(session), sessionOptions()));
  return headers;
}

function errorPage(status, session) {
  const message = status === 401 ? 'Phiên GitHub đã hết hạn. Hãy đăng nhập lại trong Zipverra.'
    : status === 403 ? 'Bạn chưa có quyền tải repository này. Hãy kiểm tra GitHub App Access.'
    : status === 404 ? 'Không tìm thấy branch main hoặc repository chưa có source để tải.'
    : status === 400 ? 'Repository được chọn không hợp lệ.'
    : status === 429 ? 'GitHub đang giới hạn yêu cầu. Hãy thử lại sau.'
    : 'Chưa thể tải source ZIP. Vui lòng kiểm tra kết nối và thử lại.';
  // Fixed strings only. Do not reflect user input, GitHub response bodies or
  // signed codeload URLs into rendered HTML.
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Không tải được source — Zipverra</title><style>body{font-family:system-ui,sans-serif;background:#0b1625;color:#eef5ff;margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}main{max-width:420px;padding:28px;border:1px solid #294054;border-radius:18px;background:#12253a}h1{font-size:21px}p{line-height:1.6;color:#b7cce2}a{display:inline-flex;background:#43d3ac;color:#08251d;text-decoration:none;border-radius:11px;padding:13px 18px;font-weight:750}</style></head><body><main><h1>Không tải được source ZIP</h1><p>${message}</p><a href="/">Quay về Zipverra</a></main></body></html>`;
  const headers = baseHeaders(session);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
  return new Response(html, { status, headers });
}

export async function GET(request) {
  let rotated = null;
  try {
    const url = new URL(request.url);
    if (url.searchParams.getAll('owner').length !== 1 || url.searchParams.getAll('repo').length !== 1) {
      throw new AppError('Thiếu repository.', 400);
    }
    const { owner, repo } = validateSourceZipRequest(url.searchParams.get('owner'), url.searchParams.get('repo'));
    const resolved = await resolveAppSession(request);
    if (!resolved.session) throw new AuthError('Cần đăng nhập GitHub App.', 401, 'LOGIN_REQUIRED');
    if (resolved.rotated) rotated = resolved.session;
    const destination = await getMainSourceZipUrl(resolved.session.token, owner, repo);
    const headers = baseHeaders(rotated);
    headers.set('Location', destination);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const status = (error instanceof AppError || error instanceof AuthError) && [400,401,403,404,429,502,503].includes(error.status)
      ? error.status : 502;
    return errorPage(status, rotated);
  }
}
