import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'snipy-macram1920-1921s-projects.vercel.app';
const LOCAL_HOSTS = new Set([
  'localhost:3000',
  '127.0.0.1:3000',
  'localhost:5173',
  '127.0.0.1:5173',
  'localhost:5174',
  '127.0.0.1:5174'
]);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Keep local development unchanged.
  if (LOCAL_HOSTS.has(host)) {
    return NextResponse.next();
  }

  // In production, force all *.vercel.app links to the main canonical domain.
  if (host.endsWith('.vercel.app') && host !== CANONICAL_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)'
};

