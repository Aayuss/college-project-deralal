"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, Send } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

export default function ContactLandlordPage() {
  const params = useParams()
  const router = useRouter()
  const listingId = Array.isArray(params.id) ? params.id[0] : params.id

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get listing to find landlord
      const { data: listing } = await supabase
        .from("listings")
        .select("landlord_id")
        .eq("id", listingId)
        .single()

      if (!listing) {
        setError("Listing not found")
        return
      }

      // Send message
      const { error: msgError } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: listing.landlord_id,
        conversation_id: listing.landlord_id,
        content: message,
        message_type: "text",
      })

      if (msgError) throw msgError

      setSent(true)
      setMessage("")
      setTimeout(() => router.push("/messages"), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <Link href="/" className="font-bold text-lg">
              deralal
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-6">Contact Landlord</h1>

          {sent ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✓</div>
              <h2 className="font-bold text-lg mb-2">Message Sent!</h2>
              <p className="text-muted-foreground">
                The landlord will receive your message shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Message *
                </label>
                <textarea
                  placeholder="Tell the landlord about yourself and why you're interested in this property..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-32 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
