"use client"

import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { type User } from "@supabase/supabase-js"
import { Clock, Search } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

interface Conversation {
  id: string // This will be the OTHER USER'S ID
  otherUserId: string
  otherUserName: string
  otherUserAvatar: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

// Accept the 'user' from the layout
export function ConversationList({ serverUser }: { serverUser: User | null }) {
  const [user, setUser] = useState<User | null>(serverUser)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Get the selected OTHER USER'S ID from the URL
  const params = useParams()
  const selectedConversationId = params.conversationId as string | undefined

  const supabase = createClient()

  // Fetch conversations
  useEffect(() => {
    if (!user) return

    const fetchConversations = async () => {
      try {
        setLoading(true)

        // Get all messages sent or received by the user
        const { data: messages, error } = await supabase
          .from("messages")
          .select("sender_id, receiver_id, content, created_at")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false })

        if (error) throw error

        const conversationMap = new Map<string, any>()

        // Group messages by the other user
        messages.forEach((msg) => {
          const otherId =
            msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
          if (!conversationMap.has(otherId)) {
            conversationMap.set(otherId, msg)
          }
        })

        const conversationsList: Conversation[] = []
        for (const [otherId, lastMsg] of conversationMap.entries()) {
          // Get profile for the other user
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, avatar_url")
            .eq("id", otherId)
            .single()

          if (profile) {
            // Get unread count
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("receiver_id", user.id)
              .eq("sender_id", otherId)
              .eq("is_read", false)

            conversationsList.push({
              id: otherId, // The ID is the other user's ID
              otherUserId: otherId,
              otherUserName: `${profile.first_name} ${profile.last_name}`,
              otherUserAvatar: profile.avatar_url || "",
              lastMessage:
                lastMsg.content.substring(0, 50) +
                (lastMsg.content.length > 50 ? "..." : ""),
              lastMessageTime: new Date(
                lastMsg.created_at
              ).toLocaleDateString(),
              unreadCount: count || 0,
            })
          }
        }
        setConversations(
          conversationsList.sort(
            (a, b) =>
              new Date(b.lastMessageTime).getTime() -
              new Date(a.lastMessageTime).getTime()
          )
        )
      } catch (err) {
        console.error("Error fetching conversations:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    // Subscribe to all message changes
    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `or(sender_id=eq.${user.id},receiver_id=eq.${user.id})`,
        },
        () => fetchConversations() // Refetch all on any message change
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user, supabase])

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUserName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Search */}
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

      {/* Conversations */}
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
            // Use <Link> to navigate to the page using the other user's ID
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`block w-full p-4 border-b border-border text-left transition hover:bg-muted ${
                selectedConversationId === conv.id ? "bg-primary/10" : "" // Highlight
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
                {conv.lastMessageTime}
              </p>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
