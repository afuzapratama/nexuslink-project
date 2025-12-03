import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE = process.env.NEXUS_API_BASE || 'http://localhost:8080';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page, API routes, and health check
  if (pathname === '/login' || pathname.startsWith('/api/nexus/auth') || pathname.startsWith('/api/nexus/health')) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionToken = request.cookies.get('nexus_session')?.value;

  if (!sessionToken) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify session with API
  try {
    const response = await fetch(`${API_BASE}/auth/session`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      // Session invalid, redirect to login
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.cookies.delete('nexus_session');
      return redirectResponse;
    }

    const data = await response.json();

    if (!data.authenticated) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.cookies.delete('nexus_session');
      return redirectResponse;
    }

    // Session valid, continue
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware auth error:', error);
    // On error, redirect to login for safety
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
    redirectResponse.cookies.delete('nexus_session');
    return redirectResponse;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
