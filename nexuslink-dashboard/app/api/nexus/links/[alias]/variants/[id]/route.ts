import { NextRequest, NextResponse } from 'next/server';

const NEXUS_API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const NEXUS_API_KEY = process.env.NEXUS_API_KEY || '';

// PUT /api/nexus/links/:alias/variants/:id - Update variant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string; id: string }> }
) {
  try {
    const { alias, id } = await params;
    const body = await request.json();

    // Validation (optional fields)
    if (body.weight !== undefined) {
      if (typeof body.weight !== 'number' || body.weight < 0 || body.weight > 100) {
        return NextResponse.json(
          { error: 'Weight must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    const response = await fetch(`${NEXUS_API_BASE}/links/${alias}/variants/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || 'Failed to update variant' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating variant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/nexus/links/:alias/variants/:id - Delete variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string; id: string }> }
) {
  try {
    const { alias, id } = await params;

    const response = await fetch(`${NEXUS_API_BASE}/links/${alias}/variants/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || 'Failed to delete variant' },
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
