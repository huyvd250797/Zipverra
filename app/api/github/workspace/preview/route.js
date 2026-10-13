import { handle } from '../../../../../lib/http.js';
import { previewWorkspaceEdit } from '../../../../../lib/workspace.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, (data,token,session)=>previewWorkspaceEdit(token,data,session)); }
