import { handle } from '../../../../lib/http.js';
import { snapshot } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, async ({ owner, repo, branch }, token) => snapshot(token, owner, repo, branch)); }
