import { NextResponse } from 'next/server';
import { appUrl, cookieName, oauthOptions, encodeSession, sessionOptions, secureEquals } from '../../../../lib/auth/session.js';
import { exchangeAppToken } from '../../../../lib/auth/github-app.js';
import { github } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  let origin;
  try { origin = appUrl(); } catch { return new Response('Cần cấu hình APP_URL.', { status: 503 }); }
  let errorCode = '';
  let encrypted = null;
  try {
    const params = new URL(request.url).searchParams;
    if (params.has('error')) throw new Error('cancelled');
    const code = params.get('code');
    const state = params.get('state');
    if (!code || code.length > 300 || !secureEquals(state, request.cookies.get(cookieName('oauth_state'))?.value)) throw new Error('invalid_state');
    const tokenData = await exchangeAppToken({ code });
    const user = await github(tokenData.token, '/user');
    encrypted = encodeSession({ ...tokenData, user });
  } catch (err) {
    errorCode = ['cancelled', 'invalid_state'].includes(err?.message) ? err.message :
      ['EXPIRING_TOKEN_REQUIRED'].includes(err?.code) ? 'expiration_disabled' : 'exchange_failed';
  }
  const response = NextResponse.redirect(`${origin}/${encrypted ? '?auth=success' : `?auth_error=${errorCode}`}`);
  response.cookies.set(cookieName('oauth_state'), '', { ...oauthOptions(), maxAge: 0 });
  // Remove cookies created by older OAuth-based Zipverra versions.
  response.cookies.set(cookieName('oauth_verifier'), '', { ...oauthOptions(), maxAge: 0 });
  if (encrypted) response.cookies.set(cookieName('session'), encrypted, sessionOptions());
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
