"use client";

import LandlordSidebar from "@/components/landlord-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MapPin, Bed, Bath, Edit, Trash2 } from 'lucide-react';
import useSWR from "swr";
import { createBrowserClient } from "@supabase/ssr";

export default function AvailableListings() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: listings, mutate } = useSWR("available-listings", async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return [];

    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("landlord_id", session.session.user.id)
      .neq("availability_status", "occupied");

    return data || [];
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id);

    if (!error) {
      mutate();
    }
  };

  return (
    <div className="flex">
      <LandlordSidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Available Listings</h1>
          <p className="text-muted-foreground mb-8">Manage your listings that are not yet rented</p>

          {listings && listings.length > 0 ? (
            <div className="grid gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {listing.photos?.[0] && (
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
                          {listing.title}
                        </h3>
                        <div className="space-y-2 text-muted-foreground text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            {listing.address}, {listing.city}
                          </div>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <Bed size={16} />
                              {listing.bedrooms} beds
                            </div>
                            <div className="flex items-center gap-2">
                              <Bath size={16} />
                              {listing.bathrooms} baths
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-primary">
                          NPR {listing.price.toLocaleString()}/month
                        </p>
                        <div className="flex gap-2">
                          <Link href={`/landlord/edit-listing/${listing.id}`}>
                            <Button size="sm" variant="outline">
                              <Edit size={16} className="mr-2" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(listing.id)}
                          >
                            <Trash2 size={16} className="mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                All your listings are currently rented or you don't have any listings yet.
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
