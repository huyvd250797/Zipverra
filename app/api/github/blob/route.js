import { handle } from '../../../../lib/http.js';
import { secureBlobUpload } from '../../../../lib/source-security-server.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, (data, token, session) => secureBlobUpload(token, data, session)); }
