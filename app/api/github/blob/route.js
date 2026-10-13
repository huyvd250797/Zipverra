import { handle } from '../../../../lib/http.js';
import { createBlob } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, async ({ owner, repo, content }, token) => ({ sha: await createBlob(token, owner, repo, content) })); }
