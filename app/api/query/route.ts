import { NextRequest } from 'next/server'
import { z } from 'zod'
import { search } from '@/lib/search'
import { buildPrompt } from '@/lib/buildPrompt'
import { generate } from '@/lib/generate'
import { rateLimit } from '@/lib/rateLimit'

const MAX_BODY_SIZE = 2048

const querySchema = z.object({
  question: z.string().min(1).max(500),
  videoId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req)
  if (rateLimited) return rateLimited

  const contentLength = parseInt(req.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_SIZE) {
    return new Response('Request body too large', { status: 413 })
  }

  try {
    const body = await req.json()
    const { question, videoId } = querySchema.parse(body)

    const chunks = await search(question, videoId)
    const systemPrompt = buildPrompt(chunks)
    const result = await generate(systemPrompt, question)

    return result.toTextStreamResponse()
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: err.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const message = err instanceof Error ? err.message : 'Query failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
