import { AppError } from './github.js';
import { checkOrigin, currentSession } from './auth/session.js';

export function respond(payload, status = 200) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function handle(request, action) {
  try {
    try { checkOrigin(request); } catch { throw new AppError('Yêu cầu từ nguồn không hợp lệ. Hãy mở đúng URL APP_URL của Zipverra.', 403); }
    const session = currentSession(request);
    if (!session) throw new AppError('Phiên GitHub đã hết hạn. Hãy đăng nhập lại.', 401);
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') throw new AppError('Yêu cầu phải là application/json.', 415);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError('Payload không hợp lệ.');
    // The browser never receives or submits the OAuth token.
    return respond(await action(body, session.token, session));
  } catch (error) {
    const status = error instanceof AppError ? error.status : 400;
    const message = error instanceof AppError ? error.message : 'Không xử lý được yêu cầu. Kiểm tra kết nối và thử lại.';
    return respond({ error: message, code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      stage: error instanceof AppError ? error.stage : null,
      hint: error instanceof AppError ? error.hint : null }, status);
  }
}
