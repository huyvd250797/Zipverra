import { handle } from '../../../../../lib/http.js';
import { verifyRollback } from '../../../../../lib/history.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return handle(request, (payload, token) => verifyRollback(token, payload));
}
