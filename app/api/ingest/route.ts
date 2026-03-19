import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ingest } from '@/lib/ingest'
import { rateLimit } from '@/lib/rateLimit'

const MAX_BODY_SIZE = 1024 // 1KB — only a URL

const ingestSchema = z.object({
  url: z.url(),
})

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req)
  if (rateLimited) return rateLimited

  const contentLength = parseInt(req.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  try {
    const body = await req.json()
    const { url } = ingestSchema.parse(body)
    const result = await ingest(url)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.errors }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Ingestion failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
