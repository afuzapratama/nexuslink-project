import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE!;
const API_KEY = process.env.NEXUS_API_KEY!;

// POST /api/nexus/nodes/:id/domains - Add domain to node
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string' || domain.trim() === '') {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE}/admin/nodes/${id}/domains`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': API_KEY,
      },
      body: JSON.stringify({ domain: domain.trim() }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend POST /admin/nodes/:id/domains error:', res.status, text);
      return NextResponse.json(
        { error: text || 'Failed to add domain' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error adding domain:', err);
    return NextResponse.json(
      { error: 'Internal dashboard error' },
      { status: 500 }
    );
  }
}

// DELETE /api/nexus/nodes/:id/domains?domain=example.com - Remove domain from node
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain || domain.trim() === '') {
      return NextResponse.json(
        { error: 'Domain query parameter is required' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${API_BASE}/admin/nodes/${id}/domains?domain=${encodeURIComponent(domain)}`,
      {
        method: 'DELETE',
        headers: {
          'X-Nexus-Api-Key': API_KEY,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend DELETE /admin/nodes/:id/domains error:', res.status, text);
      return NextResponse.json(
        { error: text || 'Failed to remove domain' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error removing domain:', err);
    return NextResponse.json(
      { error: 'Internal dashboard error' },
      { status: 500 }
    );
  }
}
