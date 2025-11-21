"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import {
  BadgeCheck,
  Bath,
  Bed,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Share2,
  Square,
  Star,
  User,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// --- Interfaces ---

interface Listing {
  id: string
  title: string
  description: string
  address: string
  city: string
  district: string
  price: number
  bedrooms: number
  bathrooms: number
  area_sqft: number
  amenities: string[]
  photos: string[]
  landlord_id: string
  rating: number
  review_count: number
  availability_status: string
  view_count: number // Added for tracking
}

interface Landlord {
  id: string
  first_name: string
  last_name: string
  avatar_url: string
  rating: number
  review_count: number
  is_verified: boolean // Added for verification badge
}

interface Review {
  id: string
  rating: number
  review_text: string
  created_at: string
  reviewer: {
    first_name: string
    last_name: string
    avatar_url: string
  }
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const listingId = Array.isArray(params.id) ? params.id[0] : params.id

  // --- State ---
  const [listing, setListing] = useState<Listing | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [similarListings, setSimilarListings] = useState<Listing[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [user, setUser] = useState<any>(null)

  // --- Effects ---

  // 1. Fetch Auth User
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      setUser(authUser)
    }
    fetchUser()
  }, [])

  // 2. Increment View Count (feeds the Ranking Algorithm)
  useEffect(() => {
    if (!listingId) return
    const incrementView = async () => {
      // This calls the Postgres function we created earlier
      const { error } = await supabase.rpc("increment_listing_view", {
        listing_id: listingId,
      })
      if (error) console.error("Failed to increment view", error)
    }
    incrementView()
  }, [listingId])

  // 3. Fetch Listing, Landlord, Reviews, and Similar Items
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)

        // A. Fetch Listing
        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .single()

        if (listingError) throw listingError
        setListing(listingData)

        // B. Fetch Landlord Profile
        const { data: landlordData, error: landlordError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", listingData.landlord_id)
          .single()

        if (landlordError) throw landlordError
        setLandlord(landlordData)

        // C. Fetch Reviews (Top 3 recent)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select(
            `
            id, rating, review_text, created_at,
            reviewer:reviewer_id (first_name, last_name, avatar_url)
          `
          )
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false })
          .limit(3)

        // Need to cast type because Supabase returns array of objects, not strictly typed automatically deeply
        if (!reviewsError && reviewsData) {
          // @ts-ignore
          setReviews(reviewsData)
        }

        // D. Fetch Similar Listings (Same City, different ID)
        const { data: similarData } = await supabase
          .from("listings")
          .select("*")
          .eq("city", listingData.city)
          .neq("id", listingId)
          .eq("availability_status", "available")
          .limit(3)

        setSimilarListings(similarData || [])

        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listing")
      } finally {
        setLoading(false)
      }
    }

    if (listingId) fetchAllData()
  }, [listingId])

  // --- Handlers ---

  const handleBookNow = () => {
    if (!user) return router.push("/auth/login")
    if (!listing) return
    if (listing.availability_status === "occupied")
      return alert("This listing is already occupied")
    router.push(`/booking/${listing.id}`)
  }

  const handleContactLandlord = async () => {
    if (!user) return router.push("/auth/login")
    if (!landlord || !listing) return
    if (user.id === landlord.id)
      return alert("You cannot send a message to yourself.")

    try {
      // Check for existing conversation
      const { data: existingMessages } = await supabase
        .from("messages")
        .select("id")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${landlord.id}),and(sender_id.eq.${landlord.id},receiver_id.eq.${user.id})`
        )
        .limit(1)

      // Start conversation if none exists
      if (!existingMessages || existingMessages.length === 0) {
        await supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: landlord.id,
          content: `I'm interested in your listing: ${listing.title}`,
          message_type: "text",
        })
      }
      router.push(`/messages/${landlord.id}`)
    } catch (err) {
      console.error(err)
      alert("Could not start conversation.")
    }
  }

  const nextPhoto = () => {
    if (listing?.photos && listing.photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % listing.photos.length)
    }
  }

  const prevPhoto = () => {
    if (listing?.photos && listing.photos.length > 1) {
      setCurrentPhotoIndex(
        (prev) => (prev - 1 + listing.photos.length) % listing.photos.length
      )
    }
  }

  // --- Render Loading/Error ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading listing details...</p>
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Listing not found</h2>
          <p className="text-muted-foreground mb-6">
            {error || "This listing is no longer available"}
          </p>
          <Link href="/rentee/search">
            <Button>Back to Search</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const currentPhoto = listing.photos?.[currentPhotoIndex] || "/placeholder.svg"

  return (
    <div className="min-h-screen bg-background pb-12">
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFavorite ? "fill-primary text-primary" : ""
                  }`}
                />
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Content */}
          <div className="lg:col-span-2">
            {/* Photo Gallery */}
            <div className="relative mb-6 bg-muted rounded-xl overflow-hidden border border-border shadow-sm">
              <div className="relative w-full" style={{ paddingBottom: "60%" }}>
                <img
                  src={currentPhoto}
                  alt={listing.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {listing.photos && listing.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    {listing.photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`h-1.5 rounded-full transition ${
                          idx === currentPhotoIndex
                            ? "bg-white w-6"
                            : "bg-white/50 w-2"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Title & Location */}
            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-foreground">
                    {listing.title}
                  </h1>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1.5" />
                    <span>
                      {listing.address}, {listing.city}, {listing.district}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full font-medium text-sm">
                    <Star className="w-3.5 h-3.5 fill-primary" />
                    {listing.rating ? listing.rating : "New"}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {listing.view_count / 2 || 0} views
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card className="p-4 flex flex-col items-center justify-center hover:border-primary/50 transition bg-card/50">
                <Bed className="w-6 h-6 text-primary mb-2" />
                <span className="text-xl font-bold">{listing.bedrooms}</span>
                <span className="text-xs text-muted-foreground">Bedrooms</span>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center hover:border-primary/50 transition bg-card/50">
                <Bath className="w-6 h-6 text-primary mb-2" />
                <span className="text-xl font-bold">{listing.bathrooms}</span>
                <span className="text-xs text-muted-foreground">Bathrooms</span>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center hover:border-primary/50 transition bg-card/50">
                <Square className="w-6 h-6 text-primary mb-2" />
                <span className="text-xl font-bold">{listing.area_sqft}</span>
                <span className="text-xs text-muted-foreground">Sq. Ft.</span>
              </Card>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">About this place</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="mb-8 pt-8 border-t border-border">
              <h2 className="text-xl font-bold mb-4">What this place offers</h2>
              {listing.amenities && listing.amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {listing.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-primary/10">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium capitalize">
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No specific amenities listed.
                </p>
              )}
            </div>

            {/* Reviews Section */}
            <div className="mb-8 pt-8 border-t border-border">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                Reviews
                <span className="text-sm font-normal text-muted-foreground">
                  ({listing.review_count})
                </span>
              </h2>

              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-border pb-6 last:border-0"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {review.reviewer.avatar_url ? (
                          <img
                            src={review.reviewer.avatar_url}
                            alt="user"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">
                            {review.reviewer.first_name || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {review.created_at
                              ? formatDistanceToNow(
                                  new Date(review.created_at),
                                  { addSuffix: true }
                                )
                              : "Recently"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {review.review_text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <p className="text-muted-foreground">
                    No reviews yet. Be the first to book and review!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Sidebar */}
          <div>
            {/* Booking Card */}
            <Card className="p-6 mb-6 sticky top-24 shadow-lg border-primary/10">
              <div className="mb-6">
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-3xl font-bold text-primary">
                    NPR {listing.price.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground mb-1">/ month</span>
                </div>

                <div className="flex items-center gap-2 mt-3 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      listing.availability_status === "occupied"
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                  />
                  <span
                    className={
                      listing.availability_status === "occupied"
                        ? "text-red-500 font-medium"
                        : "text-green-600 font-medium"
                    }
                  >
                    {listing.availability_status === "occupied"
                      ? "Currently Occupied"
                      : "Available Now"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleBookNow}
                  disabled={listing.availability_status === "occupied"}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-semibold text-base"
                >
                  {listing.availability_status === "occupied"
                    ? "Not Available"
                    : "Book Now"}
                </Button>
                <Button
                  onClick={handleContactLandlord}
                  variant="outline"
                  className="w-full h-12"
                >
                  Chat with Landlord
                </Button>
              </div>
            </Card>

            {/* Landlord Profile Card */}
            {landlord && (
              <Card className="p-6 sticky top-[400px]">
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
                  Hosted by
                </h3>

                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    {landlord.avatar_url ? (
                      <img
                        src={landlord.avatar_url}
                        alt={landlord.first_name}
                        className="w-14 h-14 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-xl text-primary">
                          {landlord.first_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Verified Badge Indicator */}
                    {landlord.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                        <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500/10" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">
                        {landlord.first_name} {landlord.last_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-black text-black" />
                        {landlord.rating || "New"}
                      </span>
                      <span>•</span>
                      <span>{landlord.review_count} Reviews</span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-4">
                  {landlord.is_verified
                    ? "Identity verified. This host has provided valid government ID."
                    : "Identity not yet verified."}
                </div>

                <Button
                  onClick={() =>
                    router.push(`/landlord/profile/${landlord.id}`)
                  }
                  variant="ghost"
                  className="w-full border border-dashed"
                >
                  View Host Profile
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* "You might also like" Section */}
        {similarListings.length > 0 && (
          <div className="mt-16 border-t border-border pt-10">
            <h3 className="text-2xl font-bold mb-6">
              More places in {listing.city}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarListings.map((item) => (
                <Link
                  href={`/rentee/listing/${item.id}`}
                  key={item.id}
                  className="group"
                >
                  <div className="rounded-lg overflow-hidden border border-border hover:shadow-md transition bg-card">
                    <div className="h-48 bg-muted relative">
                      <img
                        src={item.photos[0] || "/placeholder.svg"}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        alt={item.title}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold line-clamp-1">{item.title}</h4>
                        <span className="text-sm font-bold text-primary">
                          NPR {item.price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                        {item.address}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" /> {item.bedrooms}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-3 h-3" /> {item.bathrooms}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
