"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, Send } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: string
  is_read: boolean
  created_at: string
}

interface OtherUser {
  id: string
  first_name: string
  last_name: string
}

export default function ConversationPage() {
  const params = useParams()
  // The "conversationId" from the URL is NOW the other user's ID
  const otherUserId = params.conversationId as string
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!otherUserId) return

    const fetchUserAndChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Fetch the other user's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", otherUserId)
        .single()
      setOtherUser(profile)

      // Fetch messages between the two users
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })

      setMessages(messagesData || [])

      // Mark messages from the other user as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", otherUserId)
    }

    fetchUserAndChat()
  }, [otherUserId, supabase])

  // Real-time subscription
  useEffect(() => {
    // Don't subscribe until we have both user IDs
    if (!userId || !otherUserId) return

    const channel = supabase
      .channel(`messages-${userId}-${otherUserId}`) // Unique channel name
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          // Listen for messages *to* us *from* them, or *to* them *from* us
          filter: `or(and(sender_id=eq.${userId},receiver_id=eq.${otherUserId}),and(sender_id=eq.${otherUserId},receiver_id=eq.${userId}))`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message])
          // Mark as read if it's from the other person
          if (payload.new.sender_id === otherUserId) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", payload.new.id)
              .then()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [otherUserId, userId, supabase])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !otherUserId || !userId) return

    try {
      setSendingMessage(true)
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: otherUserId,
        content: messageText,
        message_type: "text",
      })

      if (error) throw error
      setMessageText("")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <>
      {/* Chat Header */}
      <div className="border-b border-border bg-card/95 p-4">
        <h2 className="font-bold text-lg">
          {otherUser
            ? `${otherUser.first_name} ${otherUser.last_name}`
            : "Loading..."}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isSent = msg.sender_id === userId
          return (
            <div
              key={msg.id}
              className={`flex ${isSent ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  isSent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                } ${
                  msg.message_type === "warning"
                    ? "border-2 border-yellow-500"
                    : ""
                }`}
              >
                {msg.message_type === "warning" && (
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Warning</span>
                  </div>
                )}
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-border p-4 bg-card/50"
      >
        <div className="flex gap-3">
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={sendingMessage}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!messageText.trim() || sendingMessage}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </>
  )
}
