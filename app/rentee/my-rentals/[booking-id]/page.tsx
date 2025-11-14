"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowLeft, Clock, DollarSign, MapPin } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"

// We can just use 'any' or let TypeScript infer it
type BookingDetails = any

export default function BookingDetailsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Get the slug param with the hyphen
  const params = useParams()
  const bookingId = params["booking-id"] as string | undefined

  const { data: booking, isLoading } = useSWR(
    bookingId ? `booking-details-${bookingId}` : null,
    async () => {
      if (!bookingId) return null

      // 2. RLS FIX: Get session to populate auth.uid()
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        console.error("No user session found for RLS.")
        return null
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          listings (*),
          profiles!bookings_landlord_id_fkey (
            id,
            first_name, 
            last_name,  
            avatar_url
          )
        `
        )
        .eq("id", bookingId as string)
        .single()

      if (error) {
        console.error("Error fetching booking details:", error)
        return null
      }
      return data
    }
  )

  // --- Calculate Total Days Stayed ---
  let totalDays = 0
  if (booking) {
    const checkIn = new Date(booking.check_in_date)
    const checkOut = new Date(booking.check_out_date)
    const timeDiff = checkOut.getTime() - checkIn.getTime()
    totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) // Convert milliseconds to days
  }

  if (isLoading) {
    return <div className="p-8">Loading booking details...</div>
  }

  // We add '?' optional chaining since we don't have strict types
  if (!booking) {
    return <div className="p-8">Booking not found.</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8">
      <Button asChild variant="outline" className="mb-4">
        <Link href="/rentee/my-rentals">
          <ArrowLeft size={16} className="mr-2" />
          Back to My Rentals
        </Link>
      </Button>

      {booking.listings?.photos?.[0] && (
        <img
          src={booking.listings.photos[0]}
          alt={booking.listings.title || "Listing image"}
          className="w-full h-64 object-cover rounded-lg mb-6"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (Details) */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h1 className="text-3xl font-bold">{booking.listings?.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={16} />
                {booking.listings?.address}, {booking.listings?.city}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="secondary" className="capitalize text-base">
                  {booking.status}
                </Badge>
                <Badge variant="outline" className="capitalize text-base">
                  Payment: {booking.payment_status}
                </Badge>
              </div>
              <p className="text-lg text-foreground">
                {booking.listings?.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Landlord Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {/* Add avatar logic if you have it */}
                {/* <Avatar>...</Avatar> */}
                <div>
                  {/* 3. SCHEMA FIX: Combine first_name and last_name */}
                  <p className="font-semibold">
                    {booking.profiles?.first_name} {booking.profiles?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your contact for this rental
                  </p>
                </div>
              </div>
              {/* You can add a "Contact Landlord" button here */}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Summary) */}
        <div className="md:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <DollarSign size={16} /> Total Spent
                </span>
                <span className="font-bold text-lg">
                  NPR {booking.total_price?.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock size={16} /> Total Days
                </span>
                <span className="font-semibold">{totalDays} days</span>
              </div>

              <hr />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium">
                    {new Date(booking.check_in_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">
                    {new Date(booking.check_out_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
