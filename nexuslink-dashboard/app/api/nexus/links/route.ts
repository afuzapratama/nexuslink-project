import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE!;
const API_KEY = process.env.NEXUS_API_KEY!;

// GET: ambil semua links
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    
    const res = await fetch(`${API_BASE}/links?page=${page}&limit=${limit}`, {
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend /links GET error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to fetch links from backend' },
        { status: 500 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error calling backend /links GET:', err);
    return NextResponse.json(
      { error: 'Failed to fetch links from backend' },
      { status: 500 },
    );
  }
}

// POST: buat link baru
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_BASE}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': API_KEY,
      },
      body: JSON.stringify(body), // body sudah termasuk nodeId dari frontend
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend /links POST error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to create link' },
        { status: 500 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Error calling backend /links POST:', err);
    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 },
    );
  }
}
