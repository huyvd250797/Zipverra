import { currentSession } from '../../../../lib/auth/session.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = currentSession(request);
  return Response.json(session ? { authenticated: true, user: session.user, expiresAt: session.expiresAt } : { authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
}
