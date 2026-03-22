import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
].filter(Boolean)

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin')

  // Handle preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    setCorsHeaders(res, origin)
    return res
  }

  const res = NextResponse.next()
  setCorsHeaders(res, origin)
  return res
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
  matcher: '/api/:path*',
}
