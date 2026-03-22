"use client"

import { useRef, useEffect, useState, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { TextStreamChatTransport } from "ai"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SourceChips } from "@/components/SourceChips"
import { Send, Loader2, MessageCircle } from "lucide-react"

interface SavedMessage {
  id: string
  role: string
  parts: { type: string; text: string }[]
}

interface ChatPanelProps {
  videoId: string | null
  youtubeId: string | null
  savedMessages?: SavedMessage[]
  onMessagesChange?: (msgs: SavedMessage[]) => void
}

export function ChatPanel({ videoId, youtubeId, savedMessages, onMessagesChange }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/query",
        body: videoId ? { videoId } : {},
      }),
    [videoId]
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: savedMessages as any,
  })

  const isStreaming = status === "streaming" || status === "submitted"

  // Save messages back to parent when they change
  useEffect(() => {
    if (messages.length > 0 && onMessagesChange) {
      const simplified = messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: m.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => ({ type: "text" as const, text: p.text })) ?? [],
      }))
      onMessagesChange(simplified)
    }
  }, [messages, onMessagesChange])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage({ text: input.trim() })
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
            <MessageCircle className="size-10 mb-4 opacity-30" />
            <p className="text-sm font-medium">Ask a question about your videos</p>
            <p className="text-xs mt-1 max-w-xs">
              {videoId
                ? "Ask anything about the selected video"
                : "Your question will search across all ingested videos"}
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl mx-auto">
            {messages.map((msg) => {
              const text =
                msg.parts
                  ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
                  .map((p) => p.text)
                  .join("") ?? ""

              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-[#C0392B] text-white rounded-lg px-5 py-3 max-w-[80%] text-base leading-relaxed">
                      <div className="whitespace-pre-wrap">{text}</div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex flex-col items-start">
                  <div className="bg-card border border-border rounded-lg px-5 py-4 max-w-[85%] text-base leading-relaxed">
                    <div className="whitespace-pre-wrap">{text}</div>
                  </div>
                  {youtubeId && text && (
                    <SourceChips youtubeId={youtubeId} text={text} />
                  )}
                </div>
              )
            })}
            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-5 py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              videoId
                ? "Ask anything about this video..."
                : "Ask anything about your videos..."
            }
            disabled={isStreaming}
            className="flex-1 bg-white border-border h-12 text-base px-4"
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 border-border"
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
