import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';
const AGENT_BASE = process.env.NEXUS_AGENT_BASE || 'http://localhost:9090';

export async function GET() {
  const health = {
    api: { status: false, url: API_BASE },
    agent: { status: false, url: AGENT_BASE },
    database: { status: false, url: 'DynamoDB' },
  };

  // Check API health
  try {
    const apiRes = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    health.api.status = apiRes.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    health.api.status = false;
  }

  // Check Agent health (optional - agent might be on different server)
  try {
    const agentRes = await fetch(`${AGENT_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    health.agent.status = agentRes.ok;
  } catch (error) {
    console.error('Agent health check failed:', error);
    health.agent.status = false;
  }

  // Check Database health (via API - API will fail if DB is down)
  // We use API status as proxy for DB status
  health.database.status = health.api.status;

  return NextResponse.json(health);
}
