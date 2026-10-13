import { NextResponse } from 'next/server';
import { appUrl, cookieName, oauthOptions, encodeSession, sessionOptions, secureEquals } from '../../../../lib/auth/session.js';
import { github, parseOAuthScopes } from '../../../../lib/github.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  let origin;
  try { origin = appUrl(); } catch { return new Response('Cần cấu hình APP_URL.', { status: 503 }); }
  let errorCode = '';
  let session = null;
  try {
    const params = new URL(request.url).searchParams;
    if (params.has('error')) throw new Error('cancelled');
    const code = params.get('code');
    const state = params.get('state');
    if (!code || code.length > 300 || !secureEquals(state, request.cookies.get(cookieName('oauth_state'))?.value)) throw new Error('invalid_state');
    const verifier = request.cookies.get(cookieName('oauth_verifier'))?.value;
    if (!verifier || verifier.length < 43 || verifier.length > 128) throw new Error('invalid_state');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Zipverra' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${origin}/api/auth/callback`, code_verifier: verifier }),
      signal: AbortSignal.timeout(15000), cache: 'no-store',
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokenData.access_token !== 'string' || !tokenData.access_token) throw new Error('exchange_failed');
    const scopes = parseOAuthScopes(tokenData.scope);
    if (!scopes.includes('repo')) throw new Error('missing_scope');
    const user = await github(tokenData.access_token, '/user');
    session = encodeSession({ token: tokenData.access_token, user, scopes });
  } catch (err) {
    errorCode = ['cancelled', 'invalid_state', 'missing_scope'].includes(err?.message) ? err.message : 'exchange_failed';
  }
  const response = NextResponse.redirect(`${origin}/${session ? '?auth=success' : `?auth_error=${errorCode}`}`);
  response.cookies.set(cookieName('oauth_state'), '', { ...oauthOptions(), maxAge: 0 });
  response.cookies.set(cookieName('oauth_verifier'), '', { ...oauthOptions(), maxAge: 0 });
  if (session) response.cookies.set(cookieName('session'), session, sessionOptions());
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
