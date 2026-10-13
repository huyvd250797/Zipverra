import { handle } from '../../../../lib/http.js';
import { readReviewedText, assertAppRepoGrant } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return handle(request, async ({ owner, repo, branch, expectedHead, path }, token) => {
    await assertAppRepoGrant(token, owner, repo);
    return readReviewedText(token, owner, repo, branch, expectedHead, path);
  });
}
