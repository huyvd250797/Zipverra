import { handle } from '../../../../../lib/http.js';
import { executeRollback } from '../../../../../lib/history.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return handle(request, (payload, token) => executeRollback(token, payload));
}
