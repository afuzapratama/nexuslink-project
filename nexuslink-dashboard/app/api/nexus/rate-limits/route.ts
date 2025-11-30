import { NextRequest, NextResponse } from 'next/server';

const NEXUS_API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const NEXUS_API_KEY = process.env.NEXUS_API_KEY || '';

export interface RateLimitInfo {
  key: string;
  count: number;
  expiresAt: string;
}

// GET /api/nexus/rate-limits - Get all active rate limits
export async function GET() {
  try {
    const response = await fetch(`${NEXUS_API_BASE}/admin/rate-limits`, {
      method: 'GET',
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to fetch rate limits' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching rate limits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/nexus/rate-limits - Reset rate limit for specific key
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${NEXUS_API_BASE}/admin/rate-limits`, {
      method: 'DELETE',
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to reset rate limit' },
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
