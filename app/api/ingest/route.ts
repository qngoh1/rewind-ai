import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ingest } from '@/lib/ingest'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthUser } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const MAX_BODY_SIZE = 1024 // 1KB — only a URL
const DAILY_INGEST_LIMIT = 10

const ingestSchema = z.object({
  url: z.url(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimited = await rateLimit(req)
  if (rateLimited) return rateLimited

  const contentLength = parseInt(req.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  // Check daily ingestion limit
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count, error: countError } = await getAdminClient()
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if ((count ?? 0) >= DAILY_INGEST_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached. You can add up to ${DAILY_INGEST_LIMIT} videos per day.` },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { url } = ingestSchema.parse(body)
    const result = await ingest(url, user.id, getAdminClient())
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Ingestion failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
