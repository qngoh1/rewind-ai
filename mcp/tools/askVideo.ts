import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { search } from '../../lib/search'
import { buildPrompt } from '../../lib/buildPrompt'
import { generate } from '../../lib/generate'

export function registerAskVideo(server: McpServer) {
  server.tool(
    'ask_video',
    'Ask a question about an ingested video and get an answer with timestamp citations',
    {
      question: z.string().describe('Question to ask about the video'),
      videoId: z.string().uuid().optional().describe('Video ID to ask about. Omit to search all videos.'),
    },
    async ({ question, videoId }) => {
      const chunks = await search(question, videoId)
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
