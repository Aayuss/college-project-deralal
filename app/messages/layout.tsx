import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { ConversationList } from "./ConversationList"

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-bold text-lg">
            deralal
            </Link>
            <h1 className="text-2xl font-bold">Messages</h1>
            <Link href="/rentee/settings">
              <Button variant="outline" size="sm">
                Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List (Left Side) */}
        <div className="w-full md:w-80 border-r border-border flex flex-col bg-card/50">
          <ConversationList serverUser={user} />
        </div>

        {/* Chat Area (Right Side) */}
        <div className="hidden md:flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
