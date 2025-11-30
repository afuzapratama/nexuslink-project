import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE!;
const API_KEY = process.env.NEXUS_API_KEY!;

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/admin/link-stats`, {
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend /admin/link-stats error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to fetch link stats from backend' },
        { status: 500 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error calling backend /admin/link-stats:', err);
    return NextResponse.json(
      { error: 'Failed to fetch link stats from backend' },
      { status: 500 },
    );
  }
}
