import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
].filter(Boolean)

export async function middleware(req: NextRequest) {
  // Handle CORS for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin')

    if (req.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 })
      setCorsHeaders(res, origin)
      return res
    }

    const res = NextResponse.next()
    setCorsHeaders(res, origin)
    // API routes handle auth themselves via getAuthUser()
    return res
  }

  // For all other routes, refresh session and redirect if unauthenticated
  return updateSession(req)
}

function setCorsHeaders(res: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin)
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  res.headers.set('Access-Control-Max-Age', '86400')
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
