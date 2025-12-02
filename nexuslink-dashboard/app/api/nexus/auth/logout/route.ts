import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('nexus_session')?.value;

    if (sessionToken) {
      // Notify API tentang logout
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
    }

    // Delete cookie
    cookieStore.delete('nexus_session');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
