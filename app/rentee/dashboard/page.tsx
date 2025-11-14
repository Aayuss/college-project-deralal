"use client";

import RenteeSidebar from "@/components/rentee-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart, MapPin, Users } from 'lucide-react';
import useSWR from "swr";
import { createBrowserClient } from "@supabase/ssr";

export default function RenteeDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: bookings } = useSWR("bookings", async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return [];
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("rentee_id", session.session.user.id)
      .limit(3);
    return data || [];
  });

  const { data: stats } = useSWR("rentee-stats", async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return { totalRentals: 0, activeBookings: 0 };
    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .eq("rentee_id", session.session.user.id);
    return { totalRentals: count || 0, activeBookings: count || 0 };
  });

  return (
    <div className="flex">
      <RenteeSidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back, Rentee!</h1>
          <p className="text-muted-foreground mb-8">Manage your rental bookings and explore new listings</p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Rentals</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.totalRentals || 0}</p>
                </div>
                <Heart className="w-10 h-10 text-primary/20" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Bookings</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.activeBookings || 0}</p>
                </div>
                <MapPin className="w-10 h-10 text-primary/20" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Savings</p>
                  <p className="text-3xl font-bold text-foreground">NPR 0</p>
                </div>
                <Users className="w-10 h-10 text-primary/20" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/rentee/search">
                <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
                  Search New Listings
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline" className="w-full h-12">
                  View Messages
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Bookings */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Recent Bookings</h2>
            {bookings && bookings.length > 0 ? (
              <div className="grid gap-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <p className="text-foreground font-semibold">Booking #{booking.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">Status: {booking.status}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No bookings yet. Start exploring listings!</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
