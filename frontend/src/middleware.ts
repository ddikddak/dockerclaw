import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutes públiques que no requereixen autenticació
const publicRoutes = ['/login', '/signup', '/auth/callback', '/_next', '/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Comprovar si és una ruta pública
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) || 
    pathname === '/favicon.ico' ||
    pathname.startsWith('/static')
  )
  
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Comprovar si hi ha sessió (per ara deixem passar, el client-side ho gestiona)
  // En el futur es pot afegir validació de JWT aquí
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
