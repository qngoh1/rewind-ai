import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { search } from '../../lib/search'
import { buildPrompt } from '../../lib/buildPrompt'
import { generate } from '../../lib/generate'
import { getAdminClient } from '../../lib/supabase-admin'

export function registerAskVideo(server: McpServer) {
  server.tool(
    'ask_video',
    'Ask a question about an ingested video and get an answer with timestamp citations',
    {
      question: z.string().describe('Question to ask about the video'),
      videoId: z.string().uuid().optional().describe('Video ID to ask about. Omit to search all videos.'),
    },
    async ({ question, videoId }) => {
      const userId = process.env.REWIND_USER_ID
      if (!userId) {
        return {
          content: [{ type: 'text' as const, text: 'Error: REWIND_USER_ID env var is not set' }],
          isError: true,
        }
      }

      const chunks = await search(question, userId, videoId, 5, getAdminClient())
      const systemPrompt = buildPrompt(chunks)
      const result = await generate(systemPrompt, question)

      // MCP tools can't stream, so collect the full response
      const text = await result.text

      return {
        content: [{ type: 'text' as const, text }],
      }
    }
  )
}
