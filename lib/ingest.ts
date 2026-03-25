import { supabase } from './supabase'
import { extractVideoId, getTranscript, getVideoMetadata } from './getTranscript'
import { chunkTranscript } from './chunkTranscript'
import { embed } from './embed'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface IngestResult {
  videoId: string
  title: string
  chunkCount: number
}

export async function ingest(
  youtubeUrl: string,
  userId: string,
  client: SupabaseClient = supabase
): Promise<IngestResult> {
  const ytId = extractVideoId(youtubeUrl)

  // Check if already ingested by this user
  const { data: existing } = await client
    .from('videos')
    .select('id')
    .eq('youtube_id', ytId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    throw new Error(`Video already ingested (id: ${existing.id})`)
  }

  // Fetch transcript and metadata in parallel
  const [segments, metadata] = await Promise.all([
    getTranscript(ytId),
    getVideoMetadata(ytId),
  ])

  // Chunk the transcript
  const chunks = chunkTranscript(segments)

  // Insert video record
  const { data: video, error: videoError } = await client
    .from('videos')
    .insert({
      youtube_id: ytId,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      channel: metadata.channel,
      user_id: userId,
    })
    .select('id')
    .single()

  if (videoError || !video) {
    throw new Error(`Failed to insert video: ${videoError?.message}`)
  }

  // Embed and store each chunk
  for (const chunk of chunks) {
    const embedding = await embed(chunk.content)

    const { error: chunkError } = await client.from('chunks').insert({
      video_id: video.id,
      content: chunk.content,
      embedding: embedding,
      start_time: chunk.startTime,
      end_time: chunk.endTime,
      chunk_index: chunk.chunkIndex,
      user_id: userId,
    })

    if (chunkError) {
      throw new Error(`Failed to insert chunk ${chunk.chunkIndex}: ${chunkError.message}`)
    }
  }

  return {
    videoId: video.id,
    title: metadata.title,
    chunkCount: chunks.length,
  }
}
