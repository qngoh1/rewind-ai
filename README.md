# Rewind

Turn YouTube videos into a searchable, conversational knowledge base. Paste a URL, ask questions, and get streamed answers with timestamp citations.

Also ships as an MCP server — Claude Desktop can query your video library mid-conversation.

## How it works

1. **Paste a YouTube URL** — the transcript is fetched, chunked, embedded, and stored in Supabase
2. **Ask a question** — your question is embedded, matched against stored chunks via vector search, and the top results are sent to an LLM
3. **Get a cited answer** — the LLM streams an answer with clickable timestamp links back to the video

## Tech stack

- **Framework:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **LLM:** Groq (Llama 3.3 70B)
- **Embeddings:** HuggingFace (all-MiniLM-L6-v2, 384 dimensions)
- **Vector DB:** Supabase pgvector
- **Streaming:** Vercel AI SDK
- **MCP:** @modelcontextprotocol/sdk (stdio transport)

## Run locally

### Prerequisites

- Node.js 18+
- API keys for [Groq](https://console.groq.com), [HuggingFace](https://huggingface.co), [Supabase](https://supabase.com), and [Supadata](https://supadata.ai)

### Setup

```bash
git clone https://github.com/your-username/rewind-ai.git
cd rewind-ai
npm install
```

Create a `.env` file:

```
GROQ_API_KEY=your_groq_key
HUGGINGFACE_API_KEY=your_huggingface_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPADATA_API_KEY=your_supadata_key
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MCP server (Claude Desktop)

The MCP server lets Claude Desktop ingest videos and answer questions using your Rewind library.

### Setup

Add this to your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "rewind": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/rewind-ai"
    }
  }
}
```

Restart Claude Desktop. Four tools will appear:

- **ingestVideo** — ingest a YouTube video by URL
- **searchVideo** — search transcript chunks by query
- **askVideo** — ask a question and get a generated answer
- **listVideos** — list all ingested videos

### Example

> "Ingest this video: https://youtube.com/watch?v=... then tell me what the speaker said about attention mechanisms"

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the environment variables (`GROQ_API_KEY`, `HUGGINGFACE_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPADATA_API_KEY`)
4. Optionally set `NEXT_PUBLIC_APP_URL` to your production URL for CORS

The MCP server runs locally only (stdio transport) and cannot be deployed.