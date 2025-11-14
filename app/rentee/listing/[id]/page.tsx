"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import {
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
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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
}

interface Landlord {
  id: string
  first_name: string
  last_name: string
  avatar_url: string
  rating: number
  review_count: number
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [user, setUser] = useState<any>(null)

  const listingId = Array.isArray(params.id) ? params.id[0] : params.id
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      setUser(authUser)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true)

        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .single()

        if (listingError) throw listingError

        setListing(listingData)

        const { data: landlordData, error: landlordError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", listingData.landlord_id)
          .single()

        if (landlordError) throw landlordError

        setLandlord(landlordData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listing")
        setListing(null)
      } finally {
        setLoading(false)
      }
    }

    if (listingId) fetchListing()
  }, [listingId])

  const handleBookNow = async () => {
    if (!user || !listing) {
      router.push("/auth/login")
      return
    }

    if (listing.availability_status === "occupied") {
      alert("This listing is already occupied")
      return
    }

    router.push(`/booking/${listing.id}`)
  }

  // --- THIS IS THE NEW, SIMPLE FUNCTION ---
  const handleContactLandlord = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (!landlord || !listing) return

    // 1. Prevent user from chatting with themselves
    if (user.id === landlord.id) {
      alert("You cannot send a message to yourself.")
      return
    }

    try {
      // 2. Check if a conversation (a first message) already exists
      const { data: existingMessages, error: checkError } = await supabase
        .from("messages")
        .select("id")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${landlord.id}),and(sender_id.eq.${landlord.id},receiver_id.eq.${user.id})`
        )
        .limit(1)

      if (checkError) throw checkError

      // 3. If no messages exist, create the first one
      if (existingMessages.length === 0) {
        const { error: insertError } = await supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: landlord.id,
          content: `I'm interested in your listing: ${listing.title}`,
          message_type: "text",
        })

        if (insertError) throw insertError
      }

      // 4. Redirect to the chat page, using the LANDLORD'S ID as the
      // "conversationId"
      router.push(`/messages/${landlord.id}`)
    } catch (err) {
      console.error(err)
      alert("Could not start conversation. Please try again.")
    }
  }

  const handleViewProfile = () => {
    if (!landlord) return
    router.push(`/landlord/profile/${landlord.id}`)
  }

  // ... (rest of the file is unchanged) ...
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading listing...</p>
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

  const currentPhoto =
    listing.photos?.[currentPhotoIndex] || "/cozy-reading-nook.png"
  const nextPhoto = () => {
    if (listing.photos && listing.photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % listing.photos.length)
    }
  }
  const prevPhoto = () => {
    if (listing.photos && listing.photos.length > 1) {
      setCurrentPhotoIndex(
        (prev) =>
          (prev - 1 + (listing.photos?.length || 1)) %
          (listing.photos?.length || 1)
      )
    }
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
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="relative mb-6 bg-muted rounded-lg overflow-hidden">
              <div
                className="relative w-full"
                style={{ paddingBottom: "66.67%" }}
              >
                <img
                  src={currentPhoto || "/placeholder.svg"}
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
                        className={`w-2 h-2 rounded-full transition ${
                          idx === currentPhotoIndex
                            ? "bg-white w-6"
                            : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Title & Location */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="w-5 h-5 mr-2" />
                <span>
                  {listing.address}, {listing.city}, {listing.district}
                </span>
              </div>
            </div>

            {/* Key Details */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Bed className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl font-bold">{listing.bedrooms}</p>
                <p className="text-sm text-muted-foreground">
                  Bedroom{listing.bedrooms !== 1 ? "s" : ""}
                </p>
              </Card>
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Bath className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl font-bold">{listing.bathrooms}</p>
                <p className="text-sm text-muted-foreground">
                  Bathroom{listing.bathrooms !== 1 ? "s" : ""}
                </p>
              </Card>
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Square className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl font-bold">{listing.area_sqft}</p>
                <p className="text-sm text-muted-foreground">Sq. Ft.</p>
              </Card>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">About this room</h2>
              <p className="text-muted-foreground leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {listing.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-primary" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Price Card */}
            <Card className="p-6 mb-6 sticky top-24">
              <div className="mb-6">
                <div className="text-4xl font-bold text-primary mb-1">
                  NPR {listing.price.toLocaleString()}
                </div>
                <p className="text-muted-foreground">per month</p>
                <div className="mt-2 text-sm font-semibold">
                  Status:{" "}
                  <span
                    className={
                      listing.availability_status === "occupied"
                        ? "text-red-500"
                        : "text-green-500"
                    }
                  >
                    {listing.availability_status === "occupied"
                      ? "Occupied"
                      : "Available"}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleBookNow}
                disabled={
                  isBooking || listing.availability_status === "occupied"
                }
                className="w-full mb-3 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
              >
                {listing.availability_status === "occupied"
                  ? "Already Occupied"
                  : "Book Now"}
              </Button>
              <Button
                onClick={handleContactLandlord}
                variant="outline"
                className="w-full h-11"
              >
                Contact Landlord
              </Button>
            </Card>

            {/* Landlord Card */}
            {landlord && (
              <Card className="p-6">
                <h3 className="font-bold mb-4">About the landlord</h3>
                <div className="flex items-center gap-3 mb-4">
                  {landlord.avatar_url ? (
                    <img
                      src={landlord.avatar_url || "/placeholder.svg"}
                      alt={landlord.first_name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">
                        {landlord.first_name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">
                      {landlord.first_name} {landlord.last_name}
                    </p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="text-sm">
                        {landlord.rating} ({landlord.review_count} reviews)
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleViewProfile}
                  variant="outline"
                  className="w-full"
                >
                  View Profile
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
