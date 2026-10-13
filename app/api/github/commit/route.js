import { handle } from '../../../../lib/http.js';
import { createCommit } from '../../../../lib/github.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, async (data, token, session) => createCommit(token, data, session.scopes || [])); }
