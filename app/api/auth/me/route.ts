import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY || ''
      }
    });

    if (!userResp.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await userResp.json();

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/auth/me error', error);
    return NextResponse.json({ error: 'Failed to resolve session' }, { status: 500 });
  }
}
