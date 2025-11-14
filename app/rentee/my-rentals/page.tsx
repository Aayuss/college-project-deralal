"use client"

import RenteeSidebar from "@/components/rentee-sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createBrowserClient } from "@supabase/ssr"
import { Calendar, DollarSign, MapPin } from "lucide-react"
import Link from "next/link" // Import Link
import useSWR from "swr"

export default function MyRentals() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: bookings } = useSWR("my-rentals", async () => {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) return []

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
        )
      `
      )
      // --- ⬆️ END OF FIX ⬆️ ---
      .eq("rentee_id", session.session.user.id)

    return data || []
  })

  return (
    <div className="flex">
      <RenteeSidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Rented Places
          </h1>
          <p className="text-muted-foreground mb-8">
            Manage your active and past rentals
          </p>

          {bookings && bookings.length > 0 ? (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                // --- ⬇️ START OF CHANGES ⬇️ ---
                <Link
                  href={`/rentee/my-rentals/${booking.id}`}
                  key={booking.id}
                  className="block"
                >
                  <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                    {/* ... (rest of your card content is identical) ... */}
                    {/* --- ⬇️ (NO CHANGES IN HERE) ⬇️ --- */}
                    <div className="flex flex-col md:flex-row">
                      {booking.listings?.photos?.[0] && (
                        <div
                          className="w-full md:w-48 h-48 bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${booking.listings.photos[0]})`,
                          }}
                        />
                      )}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            {booking.listings?.title}
                          </h3>
                          <div className="space-y-2 text-muted-foreground text-sm mb-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} />
                              {booking.listings?.address},{" "}
                              {booking.listings?.city}
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign size={16} />
                              NPR {booking.listings?.price?.toLocaleString()}
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
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Status:{" "}
                            <span className="font-semibold text-foreground capitalize">
                              {booking.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* --- ⬆️ (NO CHANGES IN HERE) ⬆️ --- */}
                  </Card>
                </Link>
                // --- ⬆️ END OF CHANGES ⬆️ ---
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't rented any places yet. Start exploring!
              </p>
              <Link href="/rentee/search">
                <Button>Find Listings</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
