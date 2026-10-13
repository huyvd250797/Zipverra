import { cookieHeader, cookieName, encodeSession, sessionOptions } from '../../../../lib/auth/session.js';
import { resolveAppSession } from '../../../../lib/auth/github-app.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const { session, rotated } = await resolveAppSession(request);
    const response = Response.json(session ? {
      authenticated: true, authType: 'github_app', user: session.user,
      expiresAt: session.expiresAt, tokenExpiresAt: session.tokenExpiresAt,
    } : { authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
    if (rotated) response.headers.set('Set-Cookie', cookieHeader(cookieName('session'), encodeSession(session), sessionOptions()));
    return response;
  } catch {
    return Response.json({ authenticated: false, reason: 'expired' }, {
      headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookieHeader(cookieName('session'), '', { ...sessionOptions(), maxAge: 0 }) },
    });
  }
}
