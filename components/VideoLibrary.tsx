"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { VideoItem } from "@/types/api"

interface VideoLibraryProps {
  selectedVideoId: string | null
  onSelect: (video: VideoItem | null) => void
  refreshKey: number
}

export function VideoLibrary({
  selectedVideoId,
  onSelect,
  refreshKey,
}: VideoLibraryProps) {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/videos")
        if (res.ok) {
          const data = await res.json()
          setVideos(data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const res = await fetch(`/api/videos/${id}`, { method: "DELETE" })
    if (res.ok) {
      setVideos((prev) => prev.filter((v) => v.id !== id))
      if (selectedVideoId === id) onSelect(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your library
        </h2>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : videos.length === 0 ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            No videos yet. Paste a YouTube URL above to get started.
          </div>
        ) : (
          <div className="space-y-0.5">
            {videos.map((video) => {
              const isSelected = selectedVideoId === video.id
              return (
                <div
                  key={video.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(video)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(video)
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors border-l-3 ${
                    isSelected
                      ? "border-l-primary bg-white/60"
                      : "border-l-transparent hover:bg-white/40"
                  }`}
                >
                  {/* Thumbnail */}
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-primary/20 shrink-0" />
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-tight">
                      {video.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {video.channel}
                    </p>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => handleDelete(e, video.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
