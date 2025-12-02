import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('nexus_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    // Verify session dengan API
    const response = await fetch(`${API_BASE}/auth/session`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      // Session invalid, hapus cookie
      cookieStore.delete('nexus_session');
      return NextResponse.json({
        authenticated: false,
      });
    }

    const data = await response.json();

    if (!data.authenticated) {
      cookieStore.delete('nexus_session');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
