import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ success: true });
    // Remove cookies
    res.cookies.delete('sb-access-token', { path: '/' });
    res.cookies.delete('sb-refresh-token', { path: '/' });
    return res;
  } catch (error) {
    console.error('POST /api/auth/logout error', error);
    const res = NextResponse.json({ success: true });
    res.cookies.delete('sb-access-token', { path: '/' });
    res.cookies.delete('sb-refresh-token', { path: '/' });
    return res;
  }
}
