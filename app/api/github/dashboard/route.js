import { handle } from '../../../../lib/http.js';
import { loadProDashboard } from '../../../../lib/pro-dashboard.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return handle(request, async ({repositories}, token) => loadProDashboard(token, repositories)); }
