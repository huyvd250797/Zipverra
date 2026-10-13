import { handle } from '../../../../lib/http.js';
import { verifyPush } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return handle(request, (data, token) => verifyPush(token, data));
}
