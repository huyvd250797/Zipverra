import { handle } from '../../../../lib/http.js';
import { listAuthorizedBranches } from '../../../../lib/branch-list.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, (data, token) => listAuthorizedBranches(token, data)); }
