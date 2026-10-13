import { NextResponse } from 'next/server';
import { checkOrigin, cookieName, sessionOptions } from '../../../../lib/auth/session.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try { checkOrigin(request); } catch { return Response.json({ error: 'Origin không hợp lệ.' }, { status: 403 }); }
  const result = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  result.cookies.set(cookieName('session'), '', { ...sessionOptions(), maxAge: 0 });
  return result;
}
