import { NextRequest, NextResponse } from 'next/server';

const AGENT_URL = process.env.NEXUS_AGENT_URL || 'http://localhost:9090';

// POST /api/nexus/rate-limits/test - Generate test traffic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 30, alias = 'test-link' } = body;

    // Generate traffic by making requests to Agent
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        fetch(`${AGENT_URL}/r/${alias}`, {
          method: 'GET',
          redirect: 'manual', // Don't follow redirects
        }).catch(() => {
          // Ignore errors (404, 502, etc.)
        })
      );
    }

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      message: `Generated ${count} requests to ${alias}`,
      count,
    });
  } catch (error) {
    console.error('Error generating test traffic:', error);
    return NextResponse.json(
      { error: 'Failed to generate test traffic' },
      { status: 500 }
    );
  }
}
