"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface IngestPanelProps {
  onIngested: () => void
}

export function IngestPanel({ onIngested }: IngestPanelProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ingestion failed")
      }

      setUrl("")
      onIngested()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="url"
        placeholder="Paste a YouTube URL."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
        className="w-full bg-white border-border"
      />
      <Button
        type="submit"
        className="w-full bg-[#C0392B] text-white hover:bg-[#A93226]"
        disabled={loading || !url.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Ingesting...
          </>
        ) : (
          "Add video"
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
