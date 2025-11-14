import { MessageSquare } from "lucide-react"

export default function MessagesPage() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center">
      <div className="text-center">
        <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Select a conversation to start messaging
        </p>
      </div>
    </div>
  )
}
