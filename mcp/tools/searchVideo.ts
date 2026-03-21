import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { search } from '../../lib/search'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function registerSearchVideo(server: McpServer) {
  server.tool(
    'search_video',
    'Search video transcripts for relevant chunks using semantic similarity. Returns matching transcript excerpts with timestamps.',
    {
      query: z.string().describe('Search query'),
      videoId: z.string().uuid().optional().describe('Video ID to search within. Omit to search all videos.'),
    },
    async ({ query, videoId }) => {
      const chunks = await search(query, videoId)

      if (chunks.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No relevant chunks found.' }],
        }
      }

      const formatted = chunks
        .map((c) => `[${formatTime(c.start_time)}] (similarity: ${c.similarity.toFixed(3)})\n${c.content}`)
        .join('\n\n---\n\n')

      return {
        content: [{ type: 'text' as const, text: formatted }],
      }
    }
  )
}
