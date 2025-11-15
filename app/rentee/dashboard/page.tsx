"use client"

import { createBrowserClient } from "@supabase/ssr"
import { Bath, Bed, Heart, MapPin, Star, Users } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"

import RenteeSidebar from "@/components/rentee-sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Booking = {
  id: string
  listing_id: string
  rentee_id: string
  landlord_id: string
  check_in_date: string
  check_out_date: string
  total_price: number
  status: string
  payment_status: string
  created_at: string
  updated_at: string
}

type Listing = {
  id: string
  landlord_id: string
  title: string
  description: string
  address: string
  city: string
  district: string
  price: number
  currency: string
  bedrooms: number
  bathrooms: number
  area_sqft: number | null
  amenities: string[]
  photos: string[]
  availability_status: string
  created_at: string
  updated_at: string
  is_active: boolean
  occupied_by: string | null
  rating: number | null
}

type SearchHistory = {
  id: string
  rentee_id: string
  raw_query: string | null
  city: string | null
  min_price: number | null
  max_price: number | null
  bedrooms: number | null
  bathrooms: number | null
  created_at: string
}

export default function RenteeDashboard() {
  const [showRecommendations, setShowRecommendations] = useState(true)

  const { data: bookings } = useSWR<Booking[]>("bookings", async () => {
    const { data: session } = await supabase.auth.getSession()
    const user = session?.session?.user
    if (!user) return []

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("rentee_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3)

    if (error) {
      console.error("Error fetching bookings", error)
      return []
    }

    return (data || []) as Booking[]
  })

  const { data: stats } = useSWR("rentee-stats", async () => {
    const { data: session } = await supabase.auth.getSession()
    const user = session?.session?.user
    if (!user) return { totalRentals: 0, activeBookings: 0 }

    const { count, error } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("rentee_id", user.id)

    if (error) {
      console.error("Error fetching stats", error)
      return { totalRentals: 0, activeBookings: 0 }
    }

    // currently treating all bookings as rentals + "active"
    return { totalRentals: count || 0, activeBookings: count || 0 }
  })

  const { data: recommendations } = useSWR<Listing[]>(
    "rentee-recommendations",
    async () => {
      const { data: session } = await supabase.auth.getSession()
      const user = session?.session?.user
      if (!user) return []

      // 1) past bookings + their listings
      const { data: bookingRows, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          listing_id,
          created_at,
          listings (
            id,
            city,
            district,
            price,
            bedrooms,
            bathrooms
          )
        `
        )
        .eq("rentee_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (bookingsError) {
        console.error(
          "Error fetching bookings for recommendations",
          bookingsError
        )
      }

      const bookedListingIds = Array.from(
        new Set(
          (bookingRows || [])
            .map((b: any) => b.listing_id)
            .filter((id: string | null) => !!id)
        )
      ) as string[]

      const citiesFromBookings = (bookingRows || [])
        .map((b: any) => b.listings?.city)
        .filter((c: string | null) => !!c) as string[]

      const pricesFromBookings = (bookingRows || [])
        .map((b: any) => Number(b.listings?.price))
        .filter((p: number) => !Number.isNaN(p))

      const bedroomsFromBookings = (bookingRows || [])
        .map((b: any) => b.listings?.bedrooms)
        .filter((n: number | null) => typeof n === "number") as number[]

      // 2) past search history
      let searchHistory: SearchHistory[] = []
      const { data: searchRows, error: searchError } = await supabase
        .from("search_history")
        .select("*")
        .eq("rentee_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (searchError) {
        console.warn(
          "search_history not used (missing or error)",
          searchError.message
        )
      } else {
        searchHistory = (searchRows || []) as SearchHistory[]
      }

      const citiesFromSearches = searchHistory
        .map((s) => s.city)
        .filter((c): c is string => !!c)

      const minPricesFromSearches = searchHistory
        .map((s) => (s.min_price != null ? Number(s.min_price) : NaN))
        .filter((n) => !Number.isNaN(n))

      const maxPricesFromSearches = searchHistory
        .map((s) => (s.max_price != null ? Number(s.max_price) : NaN))
        .filter((n) => !Number.isNaN(n))

      const bedroomsFromSearches = searchHistory
        .map((s) => s.bedrooms)
        .filter((n): n is number => typeof n === "number")

      // 3) preference signals from bookings + searches

      // 3a) cities:
      // - ANY city from bookings is trusted (even once)
      // - cities from searches are only trusted if they appear >= 2 times
      const bookingCitySet = new Set(citiesFromBookings)

      const searchCityCount: Record<string, number> = {}
      for (const c of citiesFromSearches) {
        searchCityCount[c] = (searchCityCount[c] || 0) + 1
      }
      const strongSearchCities = Object.entries(searchCityCount)
        .filter(([, count]) => count >= 2)
        .map(([c]) => c)

      const preferredCities = Array.from(
        new Set([...bookingCitySet, ...strongSearchCities])
      )

      // 3b) prices:
      const allMinCandidates = [...pricesFromBookings, ...minPricesFromSearches]
      const allMaxCandidates = [...pricesFromBookings, ...maxPricesFromSearches]

      const minPricePref =
        allMinCandidates.length > 0
          ? Math.min(...allMinCandidates) * 0.7
          : undefined
      const maxPricePref =
        allMaxCandidates.length > 0
          ? Math.max(...allMaxCandidates) * 1.3
          : undefined

      // 3c) bedrooms:
      const bedroomPrefs = Array.from(
        new Set([...bedroomsFromBookings, ...bedroomsFromSearches])
      )

      // 3d) if absolutely no signal, bail
      if (
        preferredCities.length === 0 &&
        !minPricePref &&
        !maxPricePref &&
        bedroomPrefs.length === 0
      ) {
        return []
      }

      // 4) query similar listings (first pass)
      let recQuery = supabase
        .from("listings")
        .select("*")
        .eq("availability_status", "available")
        .eq("is_active", true)

      if (preferredCities.length > 0) {
        recQuery = recQuery.in("city", preferredCities)
      }

      if (minPricePref !== undefined) {
        recQuery = recQuery.gte("price", minPricePref)
      }

      if (maxPricePref !== undefined) {
        recQuery = recQuery.lte("price", maxPricePref)
      }

      if (bedroomPrefs.length > 0) {
        recQuery = recQuery.in("bedrooms", bedroomPrefs)
      }

      let { data: candidateListings, error: recError } = await recQuery
        .order("created_at", { ascending: false })
        .limit(24)

      if (recError) {
        console.error("Error fetching recommended listings", recError)
        return []
      }

      let candidates = (candidateListings || []) as Listing[]

      // 4b) If city filter killed everything but we had only weak city signals,
      // relax city constraint and try again.
      if (candidates.length === 0 && (preferredCities.length === 0) === false) {
        // If preferredCities came ONLY from searches (no booking cities) and those are weak in practice,
        // we already filtered them out by the >=2 rule, so at this point preferredCities
        // should mostly reflect bookings. If you want an extra safety net, you can
        // fully drop city constraints when no results:
        const hasBookingCity = bookingCitySet.size > 0
        if (!hasBookingCity) {
          let relaxedQuery = supabase
            .from("listings")
            .select("*")
            .eq("availability_status", "available")
            .eq("is_active", true)

          if (minPricePref !== undefined) {
            relaxedQuery = relaxedQuery.gte("price", minPricePref)
          }

          if (maxPricePref !== undefined) {
            relaxedQuery = relaxedQuery.lte("price", maxPricePref)
          }

          if (bedroomPrefs.length > 0) {
            relaxedQuery = relaxedQuery.in("bedrooms", bedroomPrefs)
          }

          const { data: relaxedListings, error: relaxedError } =
            await relaxedQuery
              .order("created_at", { ascending: false })
              .limit(24)

          if (!relaxedError && relaxedListings) {
            candidates = relaxedListings as Listing[]
          }
        }
      }

      // 5) filter out listings already booked by this user
      const filtered = candidates.filter(
        (l) => !bookedListingIds.includes(l.id)
      )

      return filtered.slice(0, 8)
    }
  )

  return (
    <div className="flex">
      <RenteeSidebar />
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back, Rentee!
          </h1>
          <p className="text-muted-foreground mb-8">
            Manage your rental bookings and explore new listings
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Rentals
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.totalRentals || 0}
                  </p>
                </div>
                <Heart className="w-10 h-10 text-primary/20" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Active Bookings
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.activeBookings || 0}
                  </p>
                </div>
                <MapPin className="w-10 h-10 text-primary/20" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Savings
                  </p>
                  <p className="text-3xl font-bold text-foreground">NPR 0</p>
                </div>
                <Users className="w-10 h-10 text-primary/20" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Quick Actions
            </h2>
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
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Recent Bookings
            </h2>
            {bookings && bookings.length > 0 ? (
              <div className="grid gap-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <p className="text-foreground font-semibold">
                      Booking #{booking.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {booking.status}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check-in: {booking.check_in_date} • Check-out:{" "}
                      {booking.check_out_date}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  No bookings yet. Start exploring listings!
                </p>
              </Card>
            )}
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Recommended for you
              </h2>
              <button
                onClick={() => setShowRecommendations((v) => !v)}
                className="text-xs border border-input rounded-full px-3 py-1 text-muted-foreground hover:bg-muted transition"
              >
                {showRecommendations
                  ? "Hide recommendations"
                  : "Show recommendations"}
              </button>
            </div>

            {showRecommendations ? (
              recommendations && recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/rentee/listing/${listing.id}`}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition cursor-pointer h-full flex flex-col">
                        {/* Image */}
                        <div className="relative bg-muted h-40 overflow-hidden">
                          {listing.photos && listing.photos.length > 0 ? (
                            <img
                              src={listing.photos[0] || "/placeholder.svg"}
                              alt={listing.title}
                              className="w-full h-full object-cover hover:scale-105 transition"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-10 h-10 text-muted-foreground opacity-30" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                            {listing.title}
                          </h3>
                          <div className="flex items-center text-xs text-muted-foreground mb-2">
                            <MapPin className="w-3 h-3 mr-1" />
                            {listing.address}, {listing.city}
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {listing.description}
                          </p>

                          <div className="flex items-center gap-3 text-xs mb-3">
                            <span className="flex items-center gap-1">
                              <Bed className="w-3 h-3" />
                              {listing.bedrooms} bed
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath className="w-3 h-3" />
                              {listing.bathrooms} bath
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              <span className="text-xs font-medium">
                                {listing.rating ?? "N/A"}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-primary">
                                NPR {Number(listing.price).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                per month
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  No recommendations yet. Once you search or book a few places,
                  we’ll suggest similar rooms here.
                </Card>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
