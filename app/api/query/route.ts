import { NextRequest } from 'next/server'
import { search } from '@/lib/search'
import { buildPrompt } from '@/lib/buildPrompt'
import { generate } from '@/lib/generate'
import { rateLimit } from '@/lib/rateLimit'

const MAX_BODY_SIZE = 16384

export async function POST(req: NextRequest) {
  const rateLimited = await rateLimit(req)
  if (rateLimited) return rateLimited

  const contentLength = parseInt(req.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_SIZE) {
    return new Response('Request body too large', { status: 413 })
  }

  try {
    const body = await req.json()
    const messages = body.messages
    const videoId = body.videoId

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Extract text from the last user message
    // AI SDK v6 may put text in content, or in parts[].text
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    if (!lastUserMsg) {
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let question = ''
    if (typeof lastUserMsg.content === 'string' && lastUserMsg.content) {
      question = lastUserMsg.content
    } else if (Array.isArray(lastUserMsg.parts)) {
      for (const part of lastUserMsg.parts) {
        if (part.type === 'text' && part.text) {
          question = part.text
          break
        }
      }
    }

    if (!question) {
      return new Response(JSON.stringify({ error: 'Empty question' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('[query] question:', question, 'videoId:', videoId)
    const chunks = await search(question, videoId, 15)
    console.log('[query] chunks found:', chunks.length)
    const systemPrompt = buildPrompt(chunks)
    console.log('[query] prompt length:', systemPrompt.length)
    const result = await generate(systemPrompt, question)
    console.log('[query] stream created, returning response')

    return result.toTextStreamResponse()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Query failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
