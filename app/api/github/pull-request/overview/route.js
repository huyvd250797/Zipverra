import { handle } from '../../../../../lib/http.js';
import { branchPullRequestOverview } from '../../../../../lib/pull-requests.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, (data, token) => branchPullRequestOverview(token, data)); }
