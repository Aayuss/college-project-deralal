"use client"

import LandlordSidebar from "@/components/landlord-sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createBrowserClient } from "@supabase/ssr"
import { Calendar, DollarSign, MapPin, User } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

export default function RentedPlaces() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: bookings } = useSWR("landlord-rentals", async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user
    if (!user) return []

    // Get all listings for this landlord
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id")
      .eq("landlord_id", user.id)

    if (listingsError) {
      console.error("Error fetching listings", listingsError)
      return []
    }

    if (!listings || listings.length === 0) return []

    const listingIds = listings.map((l) => l.id)

    // Get bookings for those listings
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        listings (
          id,
          title,
          city,
          address,
          price,
          photos
        ),
        profiles!rentee_id (
          first_name,
          last_name,
          phone
        )
      `
      )
      .in("listing_id", listingIds)

    if (error) {
      console.error("Error fetching bookings", error)
      return []
    }

    return data || []
  })

  return (
    <div className="flex">
      <LandlordSidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Rented Places
          </h1>
          <p className="text-muted-foreground mb-8">
            Track your active bookings and rented properties
          </p>

          {bookings && bookings.length > 0 ? (
            <div className="grid gap-6">
              {bookings.map((booking: any) => {
                const listing = booking.listings
                const rentee = booking.profiles

                const fullName =
                  (rentee?.first_name || "") +
                  (rentee?.last_name ? ` ${rentee.last_name}` : "")

                return (
                  <Card key={booking.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {listing?.photos?.[0] && (
                        <div
                          className="w-full md:w-48 h-48 bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${listing.photos[0]})`,
                          }}
                        />
                      )}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            {listing?.title}
                          </h3>
                          <div className="space-y-2 text-muted-foreground text-sm mb-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} />
                              {listing?.address}, {listing?.city}
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign size={16} />
                              NPR {Number(listing?.price || 0).toLocaleString()}
                              /month
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={16} />
                              {new Date(
                                booking.check_in_date
                              ).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(
                                booking.check_out_date
                              ).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <User size={16} />
                              Occupied by: {fullName.trim() || "Unknown"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Status:{" "}
                            <span className="font-semibold text-foreground capitalize">
                              {booking.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                No active rentals yet. Create a listing to get started.
              </p>
              <Link href="/landlord/create-listing">
                <Button>Create Listing</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
