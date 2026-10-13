import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookieName, oauthOptions } from '../../../../lib/auth/session.js';
import { authorizeUrl } from '../../../../lib/auth/github-app.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const state = randomBytes(32).toString('base64url');
    const response = NextResponse.redirect(authorizeUrl(state));
    response.cookies.set(cookieName('oauth_state'), state, oauthOptions());
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    // Only expose field names, never credentials or raw stack traces.
    const knownConfigError = error?.code === 'APP_NOT_CONFIGURED' || error?.code === 'APP_URL_INVALID';
    const message = knownConfigError ? error.message : 'Không thể khởi tạo đăng nhập GitHub App. Kiểm tra Vercel Runtime Logs (AUTH_LOGIN_ERROR).';
    if (!knownConfigError) console.error('AUTH_LOGIN_ERROR', error?.code || 'UNEXPECTED_ERROR');
    return new Response(message, {
      status: knownConfigError ? 503 : 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
