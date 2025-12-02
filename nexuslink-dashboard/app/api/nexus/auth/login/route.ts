import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.success && data.sessionToken) {
      // Set cookie dengan session token
      const cookieStore = await cookies();
      cookieStore.set('nexus_session', data.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 jam
        path: '/',
      });

      return NextResponse.json({
        success: true,
        message: data.message,
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
