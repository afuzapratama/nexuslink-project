import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const API_KEY = process.env.NEXUS_API_KEY || '';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/admin/groups`, {
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch groups', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Groups fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${API_BASE}/admin/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to create group', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Group create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
