import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const tokenUrl = `${SUPABASE_URL}/auth/v1/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('email', email);
    params.append('password', password);

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: SUPABASE_ANON_KEY || ''
      },
      body: params.toString()
    });

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json({ error: data?.error_description || data?.error || 'Authentication failed' }, { status: 401 });
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 3600;

    const res = NextResponse.json({ success: true, user: data.user || null });

    // Set HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production'
    };

    res.cookies.set('sb-access-token', accessToken, { ...cookieOptions, maxAge: expiresIn });
    if (refreshToken) res.cookies.set('sb-refresh-token', refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 * 7 });

    return res;
  } catch (error) {
    console.error('POST /api/auth/login error', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
