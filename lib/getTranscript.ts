export interface TranscriptSegment {
  text: string
  offset: number   // start time in seconds
  duration: number  // duration in seconds
}

export function extractVideoId(youtubeUrl: string): string {
  const parsed = new URL(youtubeUrl)
  let videoId: string | null = null

  if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
    videoId = parsed.searchParams.get('v')
  } else if (parsed.hostname === 'youtu.be') {
    videoId = parsed.pathname.slice(1)
  }

  if (!videoId) throw new Error('Invalid YouTube URL')
  return videoId
}

export async function getTranscript(videoId: string): Promise<TranscriptSegment[]> {
  const url = `https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}&lang=en`
  const res = await fetch(url, {
    headers: { 'x-api-key': process.env.SUPADATA_API_KEY! },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Transcript fetch failed: ${body.message || res.statusText}`)
  }

  const data = await res.json()
  const segments = data.content as { text: string; offset: number; duration: number }[]

  if (!segments || segments.length === 0) {
    throw new Error('No transcript available for this video')
  }

  return segments.map((segment) => ({
    text: segment.text,
    offset: segment.offset / 1000,     // ms → seconds
    duration: segment.duration / 1000,  // ms → seconds
  }))
}

export async function getVideoMetadata(videoId: string) {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  )
  if (!res.ok) throw new Error(`Failed to fetch video metadata: ${res.statusText}`)
  const data = await res.json()

  return {
    title: data.title as string,
    thumbnail: data.thumbnail_url as string,
    channel: data.author_name as string,
  }
}
