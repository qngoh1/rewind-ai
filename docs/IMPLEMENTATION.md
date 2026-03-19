# Rewind
### Implementation Plan
**Version:** 1.2  
**Author:** Qian Ni  
**Last updated:** March 2026

---

## Strategy

Build backend first, then API, then frontend. Never build UI before the underlying logic works.

**Golden rule:** get each phase working in isolation before moving to the next. Test with hardcoded values before wiring things together.

---

## Phase 0 — Project setup
*Goal: working repo, all tools installed, environment ready*

- [x] Create Next.js app:
  ```bash
  npx create-next-app@latest rewind-ai --typescript --tailwind --app
  ```
- [x] Create GitHub repo (public) and push initial commit
- [x] Install dependencies:
  ```bash
  npm install youtube-transcript groq-sdk @supabase/supabase-js \
    @modelcontextprotocol/sdk ai @ai-sdk/groq tiktoken tsx
  ```
  - `tiktoken` — accurately counts tokens when chunking the transcript
  - `tsx` — runs TypeScript files directly (used for the MCP server)
  - `ai` — Vercel AI SDK for streaming LLM responses
- [x] Initialise shadcn/ui: `npx shadcn@latest init`
- [x] Create `.env` and `.env.example` with these keys (use `.env` not `.env.local` so both the Next.js app and MCP server can read from the same file):
  ```
  GROQ_API_KEY=
  HUGGINGFACE_API_KEY=
  SUPABASE_URL=
  SUPABASE_ANON_KEY=
  ```
- [x] Sign up and get API keys: Groq (console.groq.com), HuggingFace (huggingface.co), Supabase (supabase.com)
- [x] Install `zod` for request validation: `npm install zod`
- [x] Never prefix env vars with `NEXT_PUBLIC_` — all API calls to Groq and HuggingFace must happen server-side only (API routes), never in React components

**Done when:** `npm run dev` starts without errors

---

## Phase 1 — Database setup
*Goal: Supabase configured and ready to store chunks*

Run the following in the Supabase SQL editor:

- [x] Enable pgvector:
  ```sql
  create extension if not exists vector;
  ```
- [x] Create `videos` table:
  ```sql
  create table videos (
    id uuid primary key default gen_random_uuid(),
    youtube_id text unique not null,
    title text,
    thumbnail text,
    duration int,
    channel text,
    created_at timestamp default now()
  );
  ```
- [x] Create `chunks` table:
  ```sql
  create table chunks (
    id uuid primary key default gen_random_uuid(),
    video_id uuid references videos(id) on delete cascade,
    content text,
    embedding vector(384),
    start_time int,
    end_time int,
    chunk_index int,
    created_at timestamp default now()
  );
  ```
- [x] Add vector index for fast similarity search (use HNSW — unlike IVFFlat, it works on empty tables and doesn't need retraining as data grows):
  ```sql
  create index on chunks using hnsw (embedding vector_cosine_ops);
  ```
- [x] Create similarity search functions — one for single-video queries, one for cross-video (library-wide) queries:
  ```sql
  create or replace function match_chunks(
    query_embedding vector(384),
    match_video_id uuid,
    match_count int default 5
  )
  returns table(id uuid, video_id uuid, content text, start_time int, end_time int, similarity float)
  language sql as $$
    select id, video_id, content, start_time, end_time,
      1 - (embedding <=> query_embedding) as similarity
    from chunks
    where video_id = match_video_id
    order by embedding <=> query_embedding
    limit match_count;
  $$;

  create or replace function match_chunks_all(
    query_embedding vector(384),
    match_count int default 5
  )
  returns table(id uuid, video_id uuid, content text, start_time int, end_time int, similarity float)
  language sql as $$
    select id, video_id, content, start_time, end_time,
      1 - (embedding <=> query_embedding) as similarity
    from chunks
    order by embedding <=> query_embedding
    limit match_count;
  $$;
  ```
- [x] Enable Row Level Security (RLS) on both tables and add policies to allow the anon key to read and write (no auth, so allow all operations):
  ```sql
  alter table videos enable row level security;
  alter table chunks enable row level security;

  create policy "Allow all on videos" on videos for all using (true) with check (true);
  create policy "Allow all on chunks" on chunks for all using (true) with check (true);
  ```
- [x] Create `lib/supabase.ts` — initialise and export the Supabase client:
  ```ts
  import { createClient } from '@supabase/supabase-js'
  export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
  ```

**Done when:** you can import `supabase` and query the DB without errors

---

## Phase 2 — Ingestion pipeline
*Goal: given a YouTube URL, fetch transcript, chunk it, embed it, store it*

Build and test each step individually before connecting them.

**Step 1 — Fetch transcript**
- [x] Create `lib/getTranscript.ts`
- [x] Validate that the URL is a legitimate YouTube URL and extract the video ID (handle both `youtube.com/watch?v=ID` and `youtu.be/ID` formats):
  ```ts
  const parsed = new URL(youtubeUrl)
  let videoId: string | null = null
  if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
    videoId = parsed.searchParams.get('v')
  } else if (parsed.hostname === 'youtu.be') {
    videoId = parsed.pathname.slice(1)
  }
  if (!videoId) throw new Error('Invalid YouTube URL')
  ```
- [x] Fetch transcript using `youtube-transcript`, return as a string with timestamps
- [x] Test: hardcode a URL, `console.log` the result

**Step 2 — Fetch video metadata**
- [x] Call YouTube oEmbed to get title, thumbnail, and channel:
  ```ts
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  )
  const data = await res.json()
  // data.title, data.thumbnail_url, data.author_name
  ```
- [x] Test: log the returned metadata

**Step 3 — Chunk transcript**
- [x] Create `lib/chunkTranscript.ts`
- [x] Use `tiktoken` to count tokens accurately
- [x] Split into ~500 token chunks with 50 token overlap. To respect sentence boundaries, find the last full stop (`.`, `?`, `!`) before the 500 token limit and cut there — don't cut mid-sentence
- [x] Each chunk carries `start_time` and `end_time` from the transcript timestamps
- [x] Test: log chunk count and a few sample chunks

**Step 4 — Embed chunks**
- [x] Create `lib/embed.ts`
- [x] Call HuggingFace Inference API with `all-MiniLM-L6-v2` via `@huggingface/inference` SDK. The API returns an array of 384 numbers representing the meaning of the text:
  ```ts
  import { InferenceClient } from '@huggingface/inference'
  const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY!)
  const result = await client.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text,
  })
  const embedding = result as number[] // number[] with length 384
  ```
- [x] Test: embed a single sentence, log vector length (should be 384)

**Step 5 — Store in Supabase**
- [x] Create `lib/ingest.ts` — orchestrates steps 1–4
- [x] Insert video metadata into `videos` table
- [x] For each chunk: embed it, insert into `chunks` table
- [x] Test: run with a hardcoded URL, check rows appear in Supabase

**Done when:** rows appear in Supabase after running ingest with a real YouTube URL

---

## Phase 3 — Query pipeline
*Goal: given a question and video ID, return a relevant streamed answer*

**Step 1 — Semantic search**
- [x] Create `lib/search.ts`
- [x] Add a simple in-memory cache to avoid re-embedding the same query twice:
  ```ts
  const cache = new Map<string, number[]>()
  // before embedding: if (cache.has(query)) return cache.get(query)
  // after embedding: cache.set(query, embedding)
  ```
- [x] Embed the user's question, call `match_chunks`, return top 5 chunks with timestamps
- [x] Test: query an ingested video, log the returned chunks

**Step 2 — Build prompt**
- [x] Create `lib/buildPrompt.ts`
- [x] Construct a system prompt that includes the retrieved chunks as context and instructs the LLM to answer only from that context and include timestamps:
  ```ts
  const systemPrompt = `
    You are a helpful assistant. Answer the user's question using only the
    transcript excerpts below. Always include the timestamp of the relevant moment.

    Transcript excerpts:
    ${chunks.map(c => `[${c.start_time}s] ${c.content}`).join('\n\n')}
  `
  ```

**Step 3 — Generate answer**
- [x] Create `lib/generate.ts`
- [x] Call Groq (`llama-3.3-70b-versatile`) using Vercel AI SDK and stream the response:
  ```ts
  import { streamText } from 'ai'
  import { createGroq } from '@ai-sdk/groq'

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

  export async function generate(prompt: string, question: string) {
    return streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: prompt,
      prompt: question
    })
  }
  ```
- [x] Test: ask a question about an ingested video, confirm a relevant streamed answer

**Done when:** you can ask a question in the terminal and get a relevant streamed answer

---

## Phase 4 — API routes
*Goal: expose the pipeline via HTTP endpoints*

- [x] Create `types/api.ts` — define TypeScript types for all request/response shapes. Example:
  ```ts
  export type IngestRequest = { url: string }
  export type IngestResponse = { videoId: string; title: string; chunkCount: number }
  export type QueryRequest = { question: string; videoId?: string }
  ```
- [x] Validate all incoming request bodies with `zod` before touching the pipeline:
  ```ts
  import { z } from 'zod'
  const ingestSchema = z.object({ url: z.string().url() })
  const { url } = ingestSchema.parse(req.body)
  ```
- [x] Validate request body size in each route handler (App Router doesn't support the Pages Router `export const config` pattern — check `content-length` header or limit the parsed body size manually)
- [x] `POST /api/ingest` — accepts `{ url }`, runs ingestion, returns video metadata
- [x] `POST /api/query` — accepts `{ question, video_id? }`, streams answer. If `video_id` is omitted, search across all videos using `match_chunks_all`
- [x] `GET /api/videos` — returns list of all ingested videos
- [x] `DELETE /api/videos/[id]` — deletes video and its chunks
- [x] Add rate limiting — use `rate-limiter-flexible` npm package to limit requests per IP. Note: in-memory rate limiting resets on every Vercel deployment and won't work across serverless instances — acceptable for now but not production-grade
  ```bash
  npm install rate-limiter-flexible
  ```
- [x] Add error handling — invalid URL, video not found, API failures
- [x] Test all routes with Postman or Thunder Client (VS Code extension)

**Done when:** all routes return correct responses when called manually

---

## Phase 5 — MCP server
*Goal: expose the same functionality to Claude Desktop as native tools*

The MCP server is a **separate Node.js process** from the Next.js app. They run in two different terminal windows — Next.js on one, MCP server on the other. The MCP server communicates with Claude Desktop over stdio (standard input/output), not HTTP. **It must only ever run locally — never expose it publicly.**

- [ ] Create `mcp/server.ts` — register the server and its tools:
  ```ts
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

  const server = new McpServer({ name: 'rewind', version: '1.0.0' })

  // register tools here (see below)

  const transport = new StdioServerTransport()
  await server.connect(transport)
  ```
- [ ] Create tools, each wrapping the relevant `lib/` module:
  - `mcp/tools/ingestVideo.ts`
  - `mcp/tools/searchVideo.ts`
  - `mcp/tools/askVideo.ts`
  - `mcp/tools/listVideos.ts`
- [ ] Add start script to `package.json`:
  ```json
  "mcp": "tsx mcp/server.ts"
  ```
- [ ] Add to Claude Desktop config file:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
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
- [ ] Restart Claude Desktop, confirm the four tools appear in the tools list

**Done when:** Claude Desktop can ingest a video and answer questions using your MCP server

---

## Phase 6 — Frontend
*Goal: a clean, usable web interface*

- [ ] `app/page.tsx` — root layout composing sidebar and chat panel side by side
- [ ] `components/IngestPanel.tsx` — URL input + submit button + loading state
- [ ] `components/VideoLibrary.tsx` — sidebar listing ingested videos, click to select
- [ ] `components/ChatPanel.tsx` — question input + streamed answer. Use the Vercel AI SDK `useChat` hook to handle streaming automatically:
  ```ts
  import { useChat } from 'ai/react'
  const { messages, input, handleSubmit } = useChat({ api: '/api/query' })
  ```
- [ ] `components/SourceChips.tsx` — clickable timestamp chips that link to the moment in the YouTube video
- [ ] Wire to API routes — ingest on submit, query on send, load library on page load
- [ ] Add error states and make layout responsive

**Done when:** full user journey works in the browser — paste URL → ingest → ask question → see streamed answer with timestamps

---

## Phase 7 — Deploy & polish
*Goal: live and shareable*

- [ ] Deploy to Vercel — connect GitHub repo, add all four environment variables in the Vercel dashboard:
  - `GROQ_API_KEY`
  - `HUGGINGFACE_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- [ ] Add CORS headers to restrict API requests to your own frontend only
- [ ] Verify all API routes work in production
- [ ] Write README — what it is, how to run locally, MCP setup instructions
- [ ] Record a short demo — ingest a video, ask questions, show MCP in Claude Desktop

**Done when:** app is live and README is clear

---

---

## Future — Video summarization
*Goal: summarize an entire video or individual chapters*

Current RAG retrieves only the top chunks for a specific question. These features add full-video and chapter-level summarization.

### v2.1 — Full video summary
- [ ] Create `POST /api/summarize` route
- [ ] Fetch **all** chunks for the given video from Supabase, ordered by `chunk_index`
- [ ] Concatenate chunks into the full transcript
- [ ] If the transcript exceeds the LLM context window, split into sections and summarize each, then summarize the summaries (map-reduce)
- [ ] Send to Groq with a summarization prompt, stream the response
- [ ] Add MCP tool `summarizeVideo` wrapping the same logic
- [ ] Add UI trigger in the frontend (e.g. "Summarize this video" button)

**Done when:** user can get a full summary of any ingested video

### v2.2 — Chapter-based summarization
- [ ] Create `lib/getChapters.ts` — fetch chapter titles and timestamps from the YouTube video description (chapters are listed as `0:00 Title`, `3:45 Title`, etc.)
- [ ] Fall back gracefully if the video has no chapters
- [ ] Store chapters in a new `chapters` table:
  ```sql
  create table chapters (
    id uuid primary key default gen_random_uuid(),
    video_id uuid references videos(id) on delete cascade,
    title text,
    start_time int,
    end_time int,
    chapter_index int
  );
  ```
- [ ] During ingestion, fetch and store chapters alongside transcript chunks
- [ ] Create `POST /api/summarize/chapters` route:
  - Group chunks by chapter using `start_time` / `end_time` ranges
  - Summarize each chapter's chunks individually
  - Return structured response: `{ chapters: [{ title, startTime, endTime, summary }] }`
- [ ] Add MCP tool `summarizeByChapter`
- [ ] Add UI: display chapter summaries as expandable sections with timestamp links

**Done when:** user can see a per-chapter breakdown with summaries and timestamps

---

## Summary

| Phase | What you build | Est. time |
|---|---|---|
| 0 | Project setup | 1–2 hrs |
| 1 | Database | 1 hr |
| 2 | Ingestion pipeline | 1–2 days |
| 3 | Query pipeline | 1 day |
| 4 | API routes | 0.5 days |
| 5 | MCP server | 1 day |
| 6 | Frontend | 1–2 days |
| 7 | Deploy & polish | 0.5 days |
| v2.1 | Full video summary | 0.5 days |
| v2.2 | Chapter-based summarization | 1 day |
| **Total** | | **~6–8 days + 1.5 days future** |
