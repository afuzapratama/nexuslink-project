import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE!;
const API_KEY = process.env.NEXUS_API_KEY!;

export async function GET() {
  const res = await fetch(`${API_BASE}/admin/node-tokens`, {
    headers: { 'X-Nexus-Api-Key': API_KEY },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Backend /admin/node-tokens GET error:', res.status, text);
    return NextResponse.json(
      { error: 'Failed to fetch node tokens' },
      { status: 500 },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${API_BASE}/admin/node-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nexus-Api-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Backend /admin/node-tokens POST error:', res.status, text);
    return NextResponse.json(
      { error: 'Failed to create node token' },
      { status: 500 },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
