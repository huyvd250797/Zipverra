import { handle } from '../../../../lib/http.js';
import { createCommit } from '../../../../lib/github.js';
import { assertSecureCommitEntries } from '../../../../lib/source-security-server.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, async (data, token, session) => { assertSecureCommitEntries(data, session); return createCommit(token, data); }); }
