import { NextResponse } from 'next/server';

export function middleware(request) {
  // Forzar el favicon
  if (request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
