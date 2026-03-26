# Changelog

## v1.1.0

- Add per-user authentication with Supabase Auth (Google and GitHub OAuth)
- Fix sidebar scroll so it stays fixed while chat scrolls independently
- Exclude scripts/ from TypeScript build to fix Vercel deployment

## v1.0.0

- Initialize project with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui
- Set up Supabase with pgvector for transcript chunk storage and similarity search
- Build ingestion pipeline: YouTube transcript fetch, chunking, embedding, and storage
- Build query pipeline: semantic search with Groq LLM streaming responses
- Add API routes with Zod validation and rate limiting
- Build MCP server for Claude Desktop integration (stdio transport)
- Build frontend with video library sidebar, chat panel, and timestamp citations
- Add CORS middleware and README
- Switch transcript fetching from youtube-transcript to Supadata API
- Add All Videos mode and deselect button in chat header
- Fix MCP stdout pollution and edge runtime issues
- Prioritize per-user authentication to v2.1 in roadmap
