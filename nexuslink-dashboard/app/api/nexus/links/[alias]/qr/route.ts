import { NextRequest, NextResponse } from 'next/server';

const NEXUS_API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const NEXUS_API_KEY = process.env.NEXUS_API_KEY || '';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await context.params;
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || '256';

    const backendUrl = `${NEXUS_API_BASE}/links/${encodeURIComponent(alias)}/qr?size=${size}`;
    
    const res = await fetch(backendUrl, {
      headers: {
        'X-Nexus-Api-Key': NEXUS_API_KEY,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Failed to fetch QR from backend: ${res.status} ${text}`);
      return NextResponse.json(
        { error: 'Failed to generate QR code' },
        { status: res.status }
      );
    }

    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('QR proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
