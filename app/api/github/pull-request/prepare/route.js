import { handle } from '../../../../../lib/http.js';
import { createReleaseBranch } from '../../../../../lib/pull-requests.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, (data, token) => createReleaseBranch(token, data)); }
