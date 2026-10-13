import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appUrl, cookieName, oauthOptions } from '../../../../lib/auth/session.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const origin = appUrl();
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) throw new Error('GitHub OAuth chưa được cấu hình.');
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
    authorize.searchParams.set('redirect_uri', `${origin}/api/auth/callback`);
    authorize.searchParams.set('scope', 'repo workflow');
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('code_challenge', challenge);
    authorize.searchParams.set('code_challenge_method', 'S256');
    const response = NextResponse.redirect(authorize);
    response.cookies.set(cookieName('oauth_state'), state, oauthOptions());
    response.cookies.set(cookieName('oauth_verifier'), verifier, oauthOptions());
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return new Response('GitHub OAuth chưa được cấu hình. Xem README: APP_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
