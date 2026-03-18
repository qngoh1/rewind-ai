# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rewind is a Next.js web app + MCP server that turns YouTube videos into a searchable, conversational knowledge base using RAG. Users paste a YouTube URL, the transcript is chunked/embedded/stored, then they can ask natural language questions and get streamed answers with timestamp citations.

## Tech Stack

- **Framework:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **LLM:** Groq (Llama 3.3 70B)
- **Embeddings:** HuggingFace (nomic-embed-text, 768 dimensions)
- **Vector DB:** Supabase pgvector
- **Streaming:** Vercel AI SDK
- **MCP:** @modelcontextprotocol/sdk (stdio transport, local only)

## Architecture

Three flows share the same `lib/` modules and Supabase + Groq backends:

1. **Ingestion:** URL → youtube-transcript → chunk (500 tok, 50 overlap, sentence boundaries) → HuggingFace embed → Supabase
2. **Query:** Question → embed → Supabase vector search (top 3-5 chunks) → Groq LLM → streamed answer with timestamps
3. **MCP:** Claude Desktop → MCP server (stdio) → same lib/ pipeline

The web app deploys to Vercel. The MCP server runs locally only (stdio doesn't work on Vercel).

## Environment Variables

All in a single `.env` file shared by the web app and MCP server:
```
GROQ_API_KEY=
HUGGINGFACE_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

## Key Constraints

- **Embedding model is fixed.** Switching models invalidates all stored vectors and requires full re-ingestion.
- **No auth.** Out of scope — no accounts, no private videos, no non-English transcripts.
- **Free tier only.** Groq, Supabase, and Vercel free tiers throughout.
- **Chunking uses overlap.** 50-token overlap at sentence boundaries prevents missing answers that span chunk edges.
