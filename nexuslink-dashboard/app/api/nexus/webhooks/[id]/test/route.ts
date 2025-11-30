import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const API_KEY = process.env.NEXUS_API_KEY || '';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await fetch(`${API_BASE}/admin/webhooks/${id}/test`, {
      method: 'POST',
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to test webhook' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error testing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
