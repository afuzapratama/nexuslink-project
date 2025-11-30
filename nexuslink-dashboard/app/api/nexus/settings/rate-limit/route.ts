import { NextRequest, NextResponse } from 'next/server';

const NEXUS_API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const NEXUS_API_KEY = process.env.NEXUS_API_KEY || '';

// GET /api/nexus/settings/rate-limit - Get rate limit configuration
export async function GET() {
  try {
    const response = await fetch(`${NEXUS_API_BASE}/admin/settings/rate-limit`, {
      method: 'GET',
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to fetch rate limit settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching rate limit settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/nexus/settings/rate-limit - Update rate limit configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { ip_limit, link_limit, window_seconds } = body;
    if (typeof ip_limit !== 'number' || typeof link_limit !== 'number' || typeof window_seconds !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: ip_limit, link_limit, and window_seconds must be numbers' },
        { status: 400 }
      );
    }

    if (ip_limit < 1 || link_limit < 1 || window_seconds < 1) {
      return NextResponse.json(
        { error: 'All values must be greater than 0' },
        { status: 400 }
      );
    }

    const response = await fetch(`${NEXUS_API_BASE}/admin/settings/rate-limit`, {
      method: 'PUT',
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to update rate limit settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating rate limit settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
