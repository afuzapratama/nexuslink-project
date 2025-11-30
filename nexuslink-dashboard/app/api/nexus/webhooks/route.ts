import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const API_KEY = process.env.NEXUS_API_KEY || '';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/admin/webhooks`, {
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to fetch webhooks' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_BASE}/admin/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to create webhook' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE}/admin/webhooks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Api-Key': API_KEY,
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to update webhook' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE}/admin/webhooks/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Nexus-Api-Key': API_KEY,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to delete webhook' },
        { status: res.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
