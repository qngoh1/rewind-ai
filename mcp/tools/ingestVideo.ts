import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { ingest } from '../../lib/ingest'
import { getAdminClient } from '../../lib/supabase-admin'

export function registerIngestVideo(server: McpServer) {
  server.tool(
    'ingest_video',
    'Ingest a YouTube video: fetch transcript, chunk it, embed it, and store it in the knowledge base',
    { url: z.string().url().describe('YouTube video URL') },
    async ({ url }) => {
      const userId = process.env.REWIND_USER_ID
      if (!userId) {
        return {
          content: [{ type: 'text' as const, text: 'Error: REWIND_USER_ID env var is not set' }],
          isError: true,
        }
      }

      const result = await ingest(url, userId, getAdminClient())
      return {
        content: [
          {
            type: 'text' as const,
            text: `Ingested "${result.title}" — ${result.chunkCount} chunks stored (videoId: ${result.videoId})`,
          },
        ],
      }
    }
  )
}
