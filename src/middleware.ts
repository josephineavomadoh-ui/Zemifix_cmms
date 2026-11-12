import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/demo-session',
  '/api/auth/me',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/health',
];

const TRUSTED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // 1. CSRF & Request-Origin Protection for mutation methods (POST, PUT, PATCH, DELETE) on API routes
  if (
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    !pathname.startsWith('/api/health') &&
    !pathname.startsWith('/api/sync/')
  ) {
    const isTrustedOrigin = origin
      ? origin === TRUSTED_ORIGIN || origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')
      : true; // Fallback for non-browser clients (e.g. mobile PWA/Node worker) if origin header is absent

    if (origin && !isTrustedOrigin) {
      return NextResponse.json(
        { error: 'CSRF_VALIDATION_FAILED: Request origin is untrusted.' },
        { status: 403 }
      );
    }
  }

  // 2. Build response with comprehensive HTTP Security Headers
  let response = NextResponse.next();

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return response;
  }

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // 3. Allow public paths and API routes to pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/tailwind.css') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return response;
  }

  if (pathname.startsWith('/api/')) {
    return response;
  }

  // 4. For protected staff pages, enforce valid session cookie presence
  const sessionCookie = request.cookies.get('zemifix_session')?.value;
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && pathname !== '/login') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
