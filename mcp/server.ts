import dotenv from 'dotenv'
dotenv.config({ quiet: true })

// Silence HuggingFace inference logs — they write to stdout and corrupt MCP stdio
import { setLogger } from '@huggingface/inference'
setLogger({ log: () => {}, warn: () => {}, error: console.error } as unknown as Console)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerIngestVideo } from './tools/ingestVideo'
import { registerSearchVideo } from './tools/searchVideo'
import { registerAskVideo } from './tools/askVideo'
import { registerListVideos } from './tools/listVideos'

const server = new McpServer({
  name: 'rewind',
  version: '1.0.0',
})

registerIngestVideo(server)
registerSearchVideo(server)
registerAskVideo(server)
registerListVideos(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main()
