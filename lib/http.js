import { AppError } from './github.js';
import { checkOrigin, cookieHeader, cookieName, encodeSession, sessionOptions } from './auth/session.js';
import { AuthError, resolveAppSession } from './auth/github-app.js';

export function respond(payload, status = 200, session = null) {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (session) headers.set('Set-Cookie', cookieHeader(cookieName('session'), encodeSession(session), sessionOptions()));
  return Response.json(payload, { status, headers });
}

export async function handle(request, action) {
  let rotatedSession = null;
  try {
    try { checkOrigin(request); } catch { throw new AppError('Yêu cầu từ nguồn không hợp lệ. Hãy mở đúng URL APP_URL của Zipverra.', 403); }
    const resolved = await resolveAppSession(request);
    const session = resolved.session;
    if (!session) throw new AuthError('Phiên GitHub App đã hết hạn. Hãy đăng nhập lại.', 401, 'LOGIN_REQUIRED');
    if (resolved.rotated) rotatedSession = session;
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') throw new AppError('Yêu cầu phải là application/json.', 415);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError('Payload không hợp lệ.');
    // The GitHub App user access token is never accepted from or exposed to the browser.
    return respond(await action(body, session.token, session), 200, rotatedSession);
  } catch (error) {
    const known = error instanceof AppError || error instanceof AuthError;
    return respond({ error: known ? error.message : 'Không xử lý được yêu cầu. Kiểm tra kết nối và thử lại.',
      code: known ? error.code : 'UNKNOWN_ERROR', stage: error instanceof AppError ? error.stage : null,
      hint: error instanceof AppError ? error.hint : null }, known ? error.status : 400, rotatedSession);
  }
}
