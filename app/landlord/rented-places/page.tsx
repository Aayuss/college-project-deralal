"use client";

import LandlordSidebar from "@/components/landlord-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MapPin, Calendar, DollarSign, User } from 'lucide-react';
import useSWR from "swr";
import { createBrowserClient } from "@supabase/ssr";

export default function RentedPlaces() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: bookings } = useSWR("landlord-rentals", async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return [];

    const { data: listings } = await supabase
      .from("listings")
      .select("id")
      .eq("landlord_id", session.session.user.id);

    if (!listings || listings.length === 0) return [];

    const listingIds = listings.map(l => l.id);

    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        listings (
          id,
          title,
          city,
          location,
          price_per_month,
          photos
        ),
        profiles!rentee_id (
          full_name,
          phone
        )
      `)
      .in("listing_id", listingIds);

    return data || [];
  });

  return (
    <div className="flex">
      <LandlordSidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Rented Places</h1>
          <p className="text-muted-foreground mb-8">Track your active bookings and rented properties</p>

          {bookings && bookings.length > 0 ? (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
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
                            {booking.listings?.location}, {booking.listings?.city}
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign size={16} />
                            NPR {booking.listings?.price_per_month.toLocaleString()}/month
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            Occupied by: {booking.profiles?.full_name || "Unknown"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Status: <span className="font-semibold text-foreground capitalize">{booking.status}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                No active rentals yet. Create a listing to get started!
              </p>
              <Link href="/landlord/create-listing">
                <Button>Create Listing</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
