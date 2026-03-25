"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { IngestPanel } from "@/components/IngestPanel"
import { VideoLibrary } from "@/components/VideoLibrary"
import { ChatPanel } from "@/components/ChatPanel"
import { createClient } from "@/lib/supabase/client"
import { RotateCcw, X, LogOut } from "lucide-react"
import type { VideoItem } from "@/types/api"

interface SavedMessage {
  id: string
  role: string
  parts: { type: string; text: string }[]
}

export default function Home() {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const isResizing = useRef(false)
  const chatHistory = useRef<Map<string, SavedMessage[]>>(new Map())

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
    })
  }, [])

  const handleIngested = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = sidebarWidth

    function onMouseMove(e: MouseEvent) {
      if (!isResizing.current) return
      const newWidth = startWidth + (e.clientX - startX)
      setSidebarWidth(Math.max(240, Math.min(600, newWidth)))
    }

    function onMouseUp() {
      isResizing.current = false
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        style={{ width: sidebarWidth }}
        className="border-r border-border flex flex-col shrink-0 hidden md:flex bg-sidebar relative"
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C0392B] flex items-center justify-center">
              <RotateCcw className="size-4 text-white" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight">rewind</span>
              <p className="text-xs text-muted-foreground">Your personal YouTube knowledge base.</p>
            </div>
          </div>
        </div>

        {/* Ingest */}
        <div className="px-4 pb-5">
          <IngestPanel onIngested={handleIngested} />
        </div>

        <div className="border-t border-border" />

        {/* Video library */}
        <VideoLibrary
          selectedVideoId={selectedVideo?.id ?? null}
          onSelect={setSelectedVideo}
          refreshKey={refreshKey}
        />
        {/* User & logout */}
        <div className="mt-auto border-t border-border px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground truncate">
            {userEmail}
          </span>
          <button
            onClick={handleSignOut}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
        />
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#C0392B] flex items-center justify-center">
              <RotateCcw className="size-3.5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">rewind</span>
          </div>
          <IngestPanel onIngested={handleIngested} />
        </div>

        {/* Video title bar */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between gap-3">
          {selectedVideo ? (
            <>
              <p className="text-sm text-muted-foreground truncate">
                {selectedVideo.title}
              </p>
              <button
                onClick={() => setSelectedVideo(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              All videos
            </p>
          )}
        </div>

        <ChatPanel
          key={selectedVideo?.id ?? "all"}
          videoId={selectedVideo?.id ?? null}
          youtubeId={selectedVideo?.youtube_id ?? null}
          savedMessages={chatHistory.current.get(selectedVideo?.id ?? "all")}
          onMessagesChange={(msgs: SavedMessage[]) => {
            chatHistory.current.set(selectedVideo?.id ?? "all", msgs)
          }}
        />
      </main>
    </div>
  )
}
