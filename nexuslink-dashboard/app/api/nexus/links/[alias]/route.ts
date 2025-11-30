import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE!;
const API_KEY = process.env.NEXUS_API_KEY!;

// PUT /api/nexus/links/:alias - Update link
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params;
    const body = await request.json();

    const res = await fetch(`${API_BASE}/links/${encodeURIComponent(alias)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend /links/:alias PUT error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to update link' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error calling backend /links/:alias PUT:', err);
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 },
    );
  }
}

// DELETE /api/nexus/links/:alias - Delete link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params;

    const res = await fetch(`${API_BASE}/links/${encodeURIComponent(alias)}`, {
      method: 'DELETE',
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend /links/:alias DELETE error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to delete link' },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error calling backend /links/:alias DELETE:', err);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 },
    );
  }
}
