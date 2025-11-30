import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const API_KEY = process.env.NEXUS_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${API_BASE}/links/bulk/delete`, {
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
        { error: 'Failed to delete links', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
