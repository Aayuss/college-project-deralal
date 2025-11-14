"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { MapPin, Bed, Bath, Star, Phone, Mail, Clock, ChevronLeft, MessageSquare } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
  rating: number;
  review_count: number;
  response_time: string;
  bio: string;
}

interface Listing {
  id: string;
  title: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  photos: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  created_at: string;
}

export default function LandlordProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [landlord, setLandlord] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const landlordId = Array.isArray(params.id) ? params.id[0] : params.id;
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchLandlordData = async () => {
      try {
        setLoading(true);

        // Fetch landlord profile
        const { data: landlordData, error: landlordError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", landlordId)
          .single();

        if (landlordError) throw landlordError;
        setLandlord(landlordData);

        // Fetch landlord's listings
        const { data: listingsData } = await supabase
          .from("listings")
          .select("*")
          .eq("landlord_id", landlordId)
          .limit(10);

        setListings(listingsData || []);

        // Fetch reviews for landlord
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*")
          .eq("landlord_id", landlordId)
          .order("created_at", { ascending: false })
          .limit(10);

        setReviews(reviewsData || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load landlord profile");
      } finally {
        setLoading(false);
      }
    };

    if (landlordId) fetchLandlordData();
  }, [landlordId]);

  const handleContactLandlord = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    router.push(`/messages?contact=${landlordId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !landlord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Profile not found</h2>
          <p className="text-muted-foreground mb-6">{error || "This profile is no longer available"}</p>
          <Link href="/rentee/search">
            <Button>Back to Search</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-card rounded-lg p-8 mb-8 border border-border">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            {landlord.avatar_url ? (
              <img
                src={landlord.avatar_url || "/placeholder.svg"}
                alt={landlord.first_name}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{landlord.first_name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {landlord.first_name} {landlord.last_name}
              </h1>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  <span className="font-semibold">{landlord.rating} ({landlord.review_count} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span>Response time: {landlord.response_time || "Usually quick"}</span>
                </div>
              </div>
              {landlord.bio && <p className="text-muted-foreground mb-4">{landlord.bio}</p>}
              <div className="flex gap-2">
                {landlord.phone && (
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    {landlord.phone}
                  </Button>
                )}
                <Button 
                  onClick={handleContactLandlord}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Listings by this Landlord ({listings.length})</h2>
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(listing => (
                <Link key={listing.id} href={`/rentee/listing/${listing.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition cursor-pointer h-full">
                    <div
                      className="w-full h-32 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${listing.photos?.[0] || '/placeholder.svg'})`,
                      }}
                    />
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 truncate">{listing.title}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {listing.city}
                        </div>
                        <div className="flex items-center gap-2">
                          <Bed className="w-4 h-4" />
                          {listing.bedrooms} beds • <Bath className="w-4 h-4" /> {listing.bathrooms} baths
                        </div>
                      </div>
                      <div className="text-lg font-bold text-primary">
                        NPR {listing.price.toLocaleString()}/mo
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              No listings available
            </Card>
          )}
        </div>

        {/* Reviews Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Reviews from Renters ({reviews.length})</h2>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map(review => (
                <Card key={review.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{review.reviewer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              No reviews yet
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
