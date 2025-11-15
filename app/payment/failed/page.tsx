"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { XCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function PaymentFailedContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("bookingId")

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
        <p className="text-muted-foreground mb-6">
          Your payment could not be processed. Please try again or contact
          support.
        </p>

        <div className="space-y-3">
          <Link href={bookingId ? `/booking/${bookingId}` : "/rentee/search"}>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Try Again
            </Button>
          </Link>
          <Link href="/messages">
            <Button variant="outline" className="w-full">
              Contact Support
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

function PaymentFailedLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-40 mx-auto bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 mx-auto bg-muted rounded animate-pulse" />
        <div className="space-y-3 pt-4">
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
        </div>
      </Card>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<PaymentFailedLoading />}>
      <PaymentFailedContent />
    </Suspense>
  )
}
