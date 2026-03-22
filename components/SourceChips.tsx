"use client"

interface SourceChipsProps {
  youtubeId: string
  /** Raw answer text — timestamps like [1:23] or [1:02:30] are extracted */
  text: string
}

const TIMESTAMP_REGEX = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g

function timeToSeconds(time: string): number {
  const parts = time.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return parts[0] * 60 + parts[1]
}

export function SourceChips({ youtubeId, text }: SourceChipsProps) {
  const timestamps = new Set<string>()
  let match
  while ((match = TIMESTAMP_REGEX.exec(text)) !== null) {
    timestamps.add(match[1])
  }

  if (timestamps.size === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {[...timestamps].map((ts) => (
        <a
          key={ts}
          href={`https://www.youtube.com/watch?v=${youtubeId}&t=${timeToSeconds(ts)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-card hover:border-primary"
        >
          {ts}
        </a>
      ))}
    </div>
  )
}
