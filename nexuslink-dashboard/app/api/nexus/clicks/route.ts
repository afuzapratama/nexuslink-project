import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE!;
const API_KEY = process.env.NEXUS_API_KEY!;

// GET /api/nexus/clicks?alias=docs&page=1&limit=10
// Or GET /api/nexus/clicks?page=1&limit=10 (without alias = all clicks)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const alias = searchParams.get('alias');
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '10';

  try {
    let url: string;
    
    if (alias) {
      // Get clicks for specific link
      url = `${API_BASE}/analytics/clicks?alias=${encodeURIComponent(alias)}&page=${page}&limit=${limit}`;
    } else {
      // Get all clicks (for dashboard)
      url = `${API_BASE}/analytics/clicks/all?page=${page}&limit=${limit}`;
    }

    const res = await fetch(url, {
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        'Backend /analytics/clicks GET error:',
        res.status,
        text,
      );
      return NextResponse.json(
        { error: 'Failed to fetch click events' },
        { status: 500 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error calling backend /analytics/clicks:', err);
    return NextResponse.json(
      { error: 'Failed to fetch click events' },
      { status: 500 },
    );
  }
}
