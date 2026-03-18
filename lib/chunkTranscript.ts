import { get_encoding } from 'tiktoken'
import type { TranscriptSegment } from './getTranscript'

export interface Chunk {
  content: string
  startTime: number  // seconds
  endTime: number    // seconds
  chunkIndex: number
}

const CHUNK_SIZE = 500    // target tokens per chunk
const CHUNK_OVERLAP = 50  // overlap tokens between chunks

export function chunkTranscript(segments: TranscriptSegment[]): Chunk[] {
  const enc = get_encoding('cl100k_base')

  try {
    // Build a flat list of sentences with their timestamps
    const sentences: { text: string; offset: number; endTime: number }[] = []

    for (const seg of segments) {
      // Split segment text on sentence boundaries
      const parts = seg.text.split(/(?<=[.?!])\s+/)
      for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed) continue
        sentences.push({
          text: trimmed,
          offset: seg.offset,
          endTime: seg.offset + seg.duration,
        })
      }
    }

    const chunks: Chunk[] = []
    let i = 0

    while (i < sentences.length) {
      let tokenCount = 0
      let j = i
      const chunkSentences: string[] = []

      // Add sentences until we hit the token limit
      while (j < sentences.length) {
        const tokens = enc.encode(sentences[j].text).length
        if (tokenCount + tokens > CHUNK_SIZE && chunkSentences.length > 0) break
        chunkSentences.push(sentences[j].text)
        tokenCount += tokens
        j++
      }

      if (chunkSentences.length === 0) break

      chunks.push({
        content: chunkSentences.join(' '),
        startTime: Math.floor(sentences[i].offset),
        endTime: Math.floor(sentences[j - 1].endTime),
        chunkIndex: chunks.length,
      })

      // Move back by overlap amount for next chunk
      let overlapTokens = 0
      let overlapStart = j
      while (overlapStart > i && overlapTokens < CHUNK_OVERLAP) {
        overlapStart--
        overlapTokens += enc.encode(sentences[overlapStart].text).length
      }

      i = overlapStart < j ? Math.max(overlapStart, i + 1) : j
    }

    return chunks
  } finally {
    enc.free()
  }
}
