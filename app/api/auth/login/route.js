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
  } catch {
    return new Response('GitHub App chưa được cấu hình. Xem README và thiết lập GITHUB_APP_CLIENT_ID / GITHUB_APP_CLIENT_SECRET / GITHUB_APP_SLUG.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
