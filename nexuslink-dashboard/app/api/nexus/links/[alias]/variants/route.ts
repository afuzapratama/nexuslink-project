import { NextRequest, NextResponse } from 'next/server';

const NEXUS_API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const NEXUS_API_KEY = process.env.NEXUS_API_KEY || '';

// GET /api/nexus/links/:alias/variants - List all variants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params;
    
    const response = await fetch(`${NEXUS_API_BASE}/links/${alias}/variants`, {
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || 'Failed to fetch variants' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/nexus/links/:alias/variants - Create new variant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params;
    const body = await request.json();

    // Validation
    if (!body.label || typeof body.label !== 'string') {
      return NextResponse.json(
        { error: 'Label is required' },
        { status: 400 }
      );
    }

    if (!body.targetUrl || typeof body.targetUrl !== 'string') {
      return NextResponse.json(
        { error: 'Target URL is required' },
        { status: 400 }
      );
    }

    if (typeof body.weight !== 'number' || body.weight < 0 || body.weight > 100) {
      return NextResponse.json(
        { error: 'Weight must be between 0 and 100' },
        { status: 400 }
      );
    }

    const response = await fetch(`${NEXUS_API_BASE}/links/${alias}/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
      body: JSON.stringify({
        label: body.label,
        targetUrl: body.targetUrl,
        weight: body.weight,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || 'Failed to create variant' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating variant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
