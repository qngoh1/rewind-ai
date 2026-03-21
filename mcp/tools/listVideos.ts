import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { supabase } from '../../lib/supabase'

export function registerListVideos(server: McpServer) {
  server.tool(
    'list_videos',
    'List all ingested videos in the knowledge base',
    {},
    async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('id, youtube_id, title, channel, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        }
      }

      if (!data || data.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No videos ingested yet.' }],
        }
      }

      const formatted = data
        .map((v) => `• ${v.title} (${v.channel})\n  ID: ${v.id}\n  YouTube: https://youtube.com/watch?v=${v.youtube_id}`)
        .join('\n\n')

      return {
        content: [{ type: 'text' as const, text: `${data.length} video(s):\n\n${formatted}` }],
      }
    }
  )
}
