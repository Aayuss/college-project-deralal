"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("bookingId")

  useEffect(() => {
    if (bookingId) {
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          status: "success",
        }),
      }).catch(console.error)
    }
  }, [bookingId])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">
          Your booking has been confirmed. A rental contract has been generated.
        </p>

        <div className="space-y-3">
          <Link href="/messages">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              View Messages
            </Button>
          </Link>
          <Link href="/rentee/search">
            <Button variant="outline" className="w-full">
              Continue Browsing
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-52 mx-auto bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 mx-auto bg-muted rounded animate-pulse" />
        <div className="space-y-3 pt-4">
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
        </div>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
