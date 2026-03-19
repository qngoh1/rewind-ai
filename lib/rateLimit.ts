import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'

const limiter = new RateLimiterMemory({
  points: 10,    // 10 requests
  duration: 60,  // per 60 seconds
})

export async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  try {
    await limiter.consume(ip)
    return null // not rate limited
  } catch {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }
}
