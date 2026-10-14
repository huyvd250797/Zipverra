import { APP_VERSION } from '../../../lib/pwa-reliability.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ version: APP_VERSION }, {
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' },
  });
}
