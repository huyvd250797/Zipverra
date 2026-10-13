import { handle } from '../../../../lib/http.js';
import { preflight } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return handle(request, ({ owner, repo, branch, workflowPaths }, token) =>
    preflight(token, owner, repo, branch, workflowPaths || []));
}
