# Rewind
### Product Requirements Document
**Version:** 1.0  
**Author:** Qian Ni  
**Status:** Draft  
**Last updated:** March 2026

---

## What is Rewind?

Rewind is an AI-powered web app that turns YouTube videos into a searchable, conversational knowledge base. Paste a URL, and you can ask questions, get summaries, and extract insights from the video — without rewatching it.

Rewind also ships as an MCP server, so AI assistants like Claude Desktop can query your video library mid-conversation as a native tool.

---

## The problem

YouTube is the world's largest knowledge repository — lectures, conference talks, tutorials, interviews — but it has no way to query *inside* video content. Search is keyword-based and covers titles and descriptions only. If you want a specific answer from a 2-hour talk, you're rewatching it.

There's no tool that lets you build a personal, searchable library of YouTube content and have a conversation with it.

---

## Value proposition

**For users:** Save hours of rewatching. Ask "what did this video say about X?" and get a cited, timestamped answer in seconds. Build a library of videos you've processed and query across all of them.

**For the ecosystem:** Exposed as an MCP server, Rewind becomes a tool any MCP-compatible AI assistant can use. Claude Desktop can answer questions about your video library without you leaving the conversation.

---

## Use cases

- **Summarise a video** — paste a URL and get structured highlights and key themes instantly
- **Ask questions** — "what did he say about the attention mechanism?" returns a cited answer with a timestamp link
- **Query a library** — ingest multiple videos from a conference and ask "what did the speakers disagree on?"
- **Use via Claude Desktop** — mid-conversation, ask Claude about a video you've previously ingested; it calls Rewind's MCP server and answers without you switching context

---

## Competitive gap

| Product | Limitation |
|---|---|
| YouTube search | Keyword only — can't search inside videos |
| NotebookLM | Document RAG only — no YouTube ingestion, no MCP |
| Claude / ChatGPT | No persistent library across sessions |
| Whisper + scripts | No UI, high setup effort, not reusable |

No product combines RAG + persistent video library + MCP server + web UI in a single tool.

---

## Functional requirements

- Submit a YouTube URL for ingestion
- Extract, chunk, embed, and store the transcript
- Query a single video in natural language
- Query across multiple ingested videos
- Return answers with cited timestamps
- Expose all core actions via an MCP-compatible server

---

## Non-functional requirements

- Query response within 5 seconds
- Graceful error handling for unavailable transcripts, private videos, and rate limits
- Clean, minimal UI — no account or setup required to use
- Free to run — Groq, Supabase, and Vercel free tiers throughout

---

## Success metrics

- Query success rate — useful, relevant answers returned
- Videos ingested per session
- MCP tool call frequency via Claude Desktop
- Time-to-first-answer for a new video

---

## Risks & assumptions

| Risk | Mitigation |
|---|---|
| Transcripts unavailable for some videos | Groq Whisper API fallback (free tier) |
| Groq / Supabase free tier limits | Cache embeddings; queue ingestion |
| Transcript quality affects answer accuracy | Surface source chunks so users can verify |

**Assumptions:** Public transcripts are available for most videos. Users prioritise speed over perfect accuracy. Free-tier infrastructure is sufficient for early usage.

---

## Scope

**In:** Web app, RAG pipeline, MCP server, free-tier deployment  
**Out:** Auth, private videos, non-English transcripts, mobile app
