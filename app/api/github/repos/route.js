import { handle } from '../../../../lib/http.js';
import { listWritableRepos } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, async (_data, token) => ({ repos: await listWritableRepos(token) })); }
