import { NextResponse } from 'next/server';
import { installUrl } from '../../../../lib/auth/github-app.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.redirect(installUrl());
  } catch {
    return new Response('Thiếu GITHUB_APP_SLUG hoặc GitHub App chưa cấu hình.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
