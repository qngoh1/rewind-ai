"use client"

import { useState, useEffect, useCallback } from "react"
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
  const [used, setUsed] = useState(0)
  const [limit, setLimit] = useState(10)

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage")
      if (res.ok) {
        const data = await res.json()
        setUsed(data.used)
        setLimit(data.limit)
      }
    } catch {
      // Silently fail — usage display is non-critical
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const atLimit = used >= limit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || loading || atLimit) return

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
      setUsed((prev) => prev + 1)
      onIngested()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      fetchUsage()
    } finally {
      setLoading(false)
    }
  }

  const percentage = limit > 0 ? (used / limit) * 100 : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="url"
        placeholder="Paste a YouTube URL."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading || atLimit}
        className="w-full bg-white border-border"
      />
      <Button
        type="submit"
        className="w-full bg-[#C0392B] text-white hover:bg-[#A93226]"
        disabled={loading || !url.trim() || atLimit}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Ingesting...
          </>
        ) : atLimit ? (
          "Daily limit reached"
        ) : (
          "Add video"
        )}
      </Button>

      {/* Usage bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {used}/{limit} videos today
          </span>
          {atLimit && (
            <span className="text-xs text-destructive">Resets at midnight</span>
          )}
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              atLimit ? "bg-destructive" : "bg-[#C0392B]"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
