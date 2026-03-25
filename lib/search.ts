import { supabase } from './supabase'
import { embed } from './embed'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ChunkResult {
  id: string
  video_id: string
  content: string
  start_time: number
  end_time: number
  similarity: number
}

// Simple in-memory cache to avoid re-embedding the same query
const cache = new Map<string, number[]>()

async function embedWithCache(query: string): Promise<number[]> {
  if (cache.has(query)) return cache.get(query)!
  const embedding = await embed(query)
  cache.set(query, embedding)
  return embedding
}

export async function search(
  query: string,
  userId: string,
  videoId?: string,
  matchCount = 5,
  client: SupabaseClient = supabase
): Promise<ChunkResult[]> {
  const queryEmbedding = await embedWithCache(query)

  const rpcName = videoId ? 'match_chunks' : 'match_chunks_all'
  const params: Record<string, unknown> = {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_user_id: userId,
  }
  if (videoId) {
    params.match_video_id = videoId
  }

  const { data, error } = await client.rpc(rpcName, params)

  if (error) throw new Error(`Search failed: ${error.message}`)
  return data as ChunkResult[]
}
