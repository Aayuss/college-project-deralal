"use client"

import { Bath, Bed, MapPin, Search, Star } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { parseQueryToFilters } from "./search-filters"

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
  amenities: string[]
  photos: string[]
  rating: number
}

// Helper to decide if we should save this query to history
function isMeaningfulSearch(query: string): boolean {
  const cleanQ = query
    .replace(/^(i want|i need|looking for)\s+/i, "")
    .trim()
    .toLowerCase()

  if (!cleanQ) return false

  const tokens = cleanQ.split(/\s+/).filter(Boolean)

  if (tokens.length === 1) {
    const t = tokens[0]
    if (t.length < 4) return false
    if (/\d/.test(t)) return true
    return true
  }

  const hasSubstantialToken = tokens.some((t) => t.length >= 3)
  return hasSubstantialToken
}

function SearchPageContent() {
  const searchParams = useSearchParams()

  const [listings, setListings] = useState<Listing[]>([])
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [city, setCity] = useState(searchParams.get("city") || "")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [bedrooms, setBedrooms] = useState("")
  const [bathrooms, setBathrooms] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [amenitiesFilter, setAmenitiesFilter] = useState<string[]>([])

  const [lastSavedQuery, setLastSavedQuery] = useState<string | null>(null)

  // Fetch listings from Supabase using structured filters
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        let query = supabase
          .from("listings")
          .select("*")
          .eq("availability_status", "available")

        if (user) {
          query = query.neq("landlord_id", user.id)
        }

        // Apply Sidebar Filters
        if (city) query = query.ilike("city", `%${city}%`)
        if (minPrice) query = query.gte("price", parseFloat(minPrice))
        if (maxPrice) query = query.lte("price", parseFloat(maxPrice))
        if (bedrooms) query = query.eq("bedrooms", parseInt(bedrooms, 10))
        if (bathrooms) query = query.eq("bathrooms", parseInt(bathrooms, 10))
        if (amenitiesFilter.length > 0)
          query = query.contains("amenities", amenitiesFilter)

        // RANKING: Higher Rating first, then Newest
        query = query.order("rank_score", { ascending: false })

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        setListings(data || [])
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch listings"
        )
        setListings([])
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [city, minPrice, maxPrice, bedrooms, bathrooms, amenitiesFilter])

  // --- SMART CLIENT-SIDE FILTERING ---
  useEffect(() => {
    const q = searchQuery.trim()

    if (!q) {
      setFilteredListings(listings)
      return
    }

    // 1. Parse the natural language query to get logic (e.g. maxPrice: 20000)
    const parsed = parseQueryToFilters(q)

    // 2. Filter the existing listings based on this logic
    const filtered = listings.filter((listing) => {
      // Check Price
      if (parsed.maxPrice !== undefined && listing.price > parsed.maxPrice)
        return false
      if (parsed.minPrice !== undefined && listing.price < parsed.minPrice)
        return false

      // Check Bedrooms (exact match if specified)
      if (parsed.bedrooms !== undefined && listing.bedrooms !== parsed.bedrooms)
        return false

      // Check City (fuzzy match)
      if (parsed.city) {
        const listingCity = listing.city?.toLowerCase() || ""
        const searchCity = parsed.city.toLowerCase()
        if (!listingCity.includes(searchCity)) return false
      }

      // Check Amenities
      if (parsed.amenities && parsed.amenities.length > 0) {
        const hasAllAmenities = parsed.amenities.every((req) =>
          listing.amenities.some((avail) =>
            avail.toLowerCase().includes(req.toLowerCase())
          )
        )
        if (!hasAllAmenities) return false
      }

      // 3. Check Remaining Text (Title/Desc/Address)
      // This handles "beautiful", "near park", etc.
      if (parsed.remainingQuery) {
        const tokens = parsed.remainingQuery
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
        const haystack = (
          listing.title +
          " " +
          listing.description +
          " " +
          listing.address +
          " " +
          listing.city +
          " " +
          listing.district
        ).toLowerCase()

        // All remaining text tokens must exist in the listing
        return tokens.every((t) => haystack.includes(t))
      }

      return true
    })

    setFilteredListings(filtered)
  }, [searchQuery, listings])

  // Debounced logging remains the same...
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) return

    const handler = setTimeout(async () => {
      if (!isMeaningfulSearch(q)) return
      if (lastSavedQuery && lastSavedQuery === q) return

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const parsed = parseQueryToFilters(q)

      const { error } = await supabase.from("search_history").insert({
        rentee_id: user.id,
        raw_query: q,
        city: parsed.city ?? null,
        min_price: parsed.minPrice ?? null,
        max_price: parsed.maxPrice ?? null,
        bedrooms: parsed.bedrooms ?? null,
        bathrooms: parsed.bathrooms ?? null,
      })

      if (error) console.warn("Failed to save search", error.message)
      setLastSavedQuery(q)
    }, 800)

    return () => clearTimeout(handler)
  }, [searchQuery, lastSavedQuery])

  const handleReset = () => {
    setCity("")
    setMinPrice("")
    setMaxPrice("")
    setBedrooms("")
    setBathrooms("")
    setSearchQuery("")
    setAmenitiesFilter([])
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      parseNaturalLanguageSearch(searchQuery)
    }
  }

  const parseNaturalLanguageSearch = (query: string) => {
    const parsed = parseQueryToFilters(query)

    if (parsed.city) setCity(parsed.city)
    if (parsed.bedrooms !== undefined) setBedrooms(parsed.bedrooms.toString())
    if (parsed.bathrooms !== undefined)
      setBathrooms(parsed.bathrooms.toString())
    if (parsed.minPrice !== undefined) setMinPrice(parsed.minPrice.toString())
    if (parsed.maxPrice !== undefined) setMaxPrice(parsed.maxPrice.toString())
    if (parsed.amenities && parsed.amenities.length > 0)
      setAmenitiesFilter(parsed.amenities)

    setSearchQuery("")
  }

  return (
    <div className="min-h-screen bg-background pt-6">
      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">d</span>
              </div>
              <span className="font-bold text-lg hidden sm:inline">
                deralal
              </span>
            </Link>
            <Link href="/rentee/settings">
              <Button variant="outline" size="sm">
                Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <div>
                <h2 className="font-bold text-lg mb-6">Filters</h2>

                {/* Search Query */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">
                    Natural Language Search
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., I want 3BHK in Kathmandu under 20000"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm h-9"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to apply strict filters
                  </p>
                </div>

                {/* City */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">
                    City/District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Pokhara"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm h-9"
                  />
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm h-9"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm h-9"
                    />
                  </div>
                </div>

                {/* Bedrooms */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">
                    Bedrooms
                  </label>
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>

                {/* Bathrooms */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">
                    Bathrooms
                  </label>
                  <select
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3+</option>
                  </select>
                </div>

                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 rounded-md border border-input hover:bg-muted transition text-sm"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Listings */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">
                {searchQuery ? `Search Results` : "Available Rooms"}
              </h1>
              <p className="text-muted-foreground">
                {filteredListings.length}{" "}
                {filteredListings.length === 1 ? "listing" : "listings"} found
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading listings...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-destructive">{error}</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="p-12 text-center rounded-lg border border-border">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">
                  No listings found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredListings.map((listing) => (
                  <Link key={listing.id} href={`/rentee/listing/${listing.id}`}>
                    <div className="overflow-hidden rounded-lg border border-border hover:shadow-lg transition cursor-pointer h-full flex flex-col">
                      <div className="relative bg-muted h-48 overflow-hidden">
                        {listing.photos && listing.photos.length > 0 ? (
                          <img
                            src={listing.photos[0] || "/placeholder.svg"}
                            alt={listing.title}
                            className="w-full h-full object-cover hover:scale-105 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-12 h-12 text-muted-foreground opacity-30" />
                          </div>
                        )}
                        {listing.rating && (
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur text-white px-2 py-1 rounded flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {listing.rating}
                          </div>
                        )}
                      </div>

                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg mb-2 line-clamp-2">
                          {listing.title}
                        </h3>
                        <div className="flex items-center text-sm text-muted-foreground mb-3">
                          <MapPin className="w-4 h-4 mr-1" />
                          {listing.address}, {listing.city}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                          {listing.description}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Bed className="w-4 h-4 text-primary" />
                            <span>
                              {listing.bedrooms} bed
                              {listing.bedrooms !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Bath className="w-4 h-4 text-primary" />
                            <span>
                              {listing.bathrooms} bath
                              {listing.bathrooms !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-primary text-primary" />
                            <span className="text-sm font-medium">
                              {listing.rating || "N/A"}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              NPR {listing.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              per month
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SearchPageLoading() {
  return (
    <div className="min-h-screen bg-background pt-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading search...</p>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageContent />
    </Suspense>
  )
}
