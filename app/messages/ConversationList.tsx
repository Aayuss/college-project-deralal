"use client"

import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Clock, Search } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

interface Conversation {
  id: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export function ConversationList() {
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const params = useParams()
  const selectedConversationId = params.conversationId as string | undefined

  // Avoid recreating client on every render in the effect dependency
  const supabase = useMemo(() => createClient(), [])

  // 1) Load the current user
  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error("ConversationList: Error loading user", error)
        if (!cancelled) {
          setUser(null)
          setLoading(false) // stop loading if we can't get a user
        }
        return
      }
      if (!cancelled) {
        setUser(data.user)
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [supabase])

  // 2) Fetch conversations when user is known
  useEffect(() => {
    if (!user) return

    const fetchConversations = async () => {
      console.log("fetchConversations: Start for user", user.id)
      try {
        setLoading(true)

        const { data: messages, error } = await supabase
          .from("messages")
          .select("id, sender_id, receiver_id, content, created_at")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("fetchConversations: error fetching messages", error)
          throw error
        }

        if (!messages || messages.length === 0) {
          setConversations([])
          return
        }

        const conversationMap = new Map<string, any>()

        for (const msg of messages) {
          const otherId =
            msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
          if (!conversationMap.has(otherId)) {
            conversationMap.set(otherId, msg)
          }
        }

        const conversationsList: Conversation[] = []

        for (const [otherId, lastMsg] of conversationMap.entries()) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, avatar_url, email") // <–– add email here
            .eq("id", otherId)
            .single()

          if (profileError) {
            console.error(
              `fetchConversations: error fetching profile for ${otherId}`,
              profileError
            )
            continue
          }

          const { count, error: countError } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("sender_id", otherId)
            .eq("is_read", false)

          if (countError) {
            console.error(
              `fetchConversations: error fetching unread count for ${otherId}`,
              countError
            )
          }

          const lastMessageTime = new Date(lastMsg.created_at)

          conversationsList.push({
            id: otherId,
            otherUserId: otherId,
            otherUserName:
              `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
              profile.email ||
              "Unknown",
            otherUserAvatar: profile.avatar_url || "",
            lastMessage:
              lastMsg.content.substring(0, 50) +
              (lastMsg.content.length > 50 ? "..." : ""),
            // store an ISO string or timestamp for reliable sorting
            lastMessageTime: lastMessageTime.toISOString(),
            unreadCount: count ?? 0,
          })
        }

        // Sort by timestamp, not localized string
        conversationsList.sort(
          (a, b) =>
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime()
        )

        setConversations(conversationsList)
      } catch (err) {
        console.error("fetchConversations: fatal error", err)
        setConversations([])
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          // if this filter causes issues, drop it and just listen to all and filter in JS
          filter: `or(sender_id=eq.${user.id},receiver_id=eq.${user.id})`,
        },
        (payload) => {
          console.log("Realtime: message change, refetching...", payload)
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      console.log("Cleanup: removing realtime channel.")
      supabase.removeChannel(subscription)
    }
  }, [user, supabase])

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUserName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Loading...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`block w-full p-4 border-b border-border text-left transition hover:bg-muted ${
                selectedConversationId === conv.id ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {conv.otherUserName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">
                      {conv.otherUserName}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground ml-13">
                <Clock className="w-3 h-3 inline mr-1" />
                {new Date(conv.lastMessageTime).toLocaleString()}
              </p>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
