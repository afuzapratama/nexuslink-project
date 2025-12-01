import { NextResponse } from 'next/server';

const NEXUS_API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const NEXUS_API_KEY = process.env.NEXUS_API_KEY || 'your-secret-key';

export async function GET() {
  try {
    const res = await fetch(`${NEXUS_API_BASE}/countries`, {
      method: 'GET',
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to fetch countries:', text);
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json([], { status: 500 });
  }
}
