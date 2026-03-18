import type { ChunkResult } from './search'

export function buildPrompt(chunks: ChunkResult[]): string {
  return `You are a helpful assistant. Answer the user's question using only the transcript excerpts below. Always include the timestamp of the relevant moment.

If the excerpts don't contain enough information to answer the question, say so — don't make things up.

Format timestamps as [MM:SS] or [H:MM:SS] for longer videos.

Transcript excerpts:
${chunks.map((c) => `[${formatTime(c.start_time)}] ${c.content}`).join('\n\n')}`
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
