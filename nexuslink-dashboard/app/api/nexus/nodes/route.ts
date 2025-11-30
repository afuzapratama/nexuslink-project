import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE!;
const API_KEY = process.env.NEXUS_API_KEY!;

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/admin/nodes`, {
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
      cache: 'no-store', // selalu data terbaru
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend /admin/nodes error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to fetch nodes from backend' },
        { status: 500 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error calling backend /admin/nodes:', err);
    return NextResponse.json(
      { error: 'Internal dashboard error' },
      { status: 500 },
    );
  }
}
