export type IngestRequest = { url: string }
export type IngestResponse = { videoId: string; title: string; chunkCount: number }
export type QueryRequest = { question: string; videoId?: string }
export type VideoItem = {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel: string
  created_at: string
}
