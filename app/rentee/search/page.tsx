"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Bath, Bed, MapPin, Search, Star } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
  amenities: string[]
  photos: string[]
  rating: number
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
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

  // Fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // --- ⬇️ START OF CHANGES ⬇️ ---

        // 1. Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let query = supabase
          .from("listings")
          .select("*")
          .eq("availability_status", "available")

        // 2. If the user is logged in, hide their own listings
        if (user) {
          query = query.neq("landlord_id", user.id)
        }

        // --- ⬆️ END OF CHANGES ⬆️ ---

        // Apply filters (this part is unchanged)
        if (city) {
          query = query.ilike("city", `%${city}%`)
        }

        if (minPrice) {
          query = query.gte("price", parseFloat(minPrice))
        }

        if (maxPrice) {
          query = query.lte("price", parseFloat(maxPrice))
        }

        if (bedrooms) {
          query = query.eq("bedrooms", parseInt(bedrooms))
        }

        if (bathrooms) {
          query = query.eq("bathrooms", parseInt(bathrooms))
        }

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
  }, [city, minPrice, maxPrice, bedrooms, bathrooms])

  // Filter listings by search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = listings.filter(
        (listing) =>
          listing.title.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query) ||
          listing.address.toLowerCase().includes(query) ||
          listing.amenities.some((a) => a.toLowerCase().includes(query))
      )
      setFilteredListings(filtered)
    } else {
      setFilteredListings(listings)
    }
  }, [searchQuery, listings])

  const handleReset = () => {
    setCity("")
    setMinPrice("")
    setMaxPrice("")
    setBedrooms("")
    setBathrooms("")
    setSearchQuery("")
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      parseNaturalLanguageSearch(searchQuery)
    }
  }

  const parseNaturalLanguageSearch = (query: string) => {
    const lowerQuery = query.toLowerCase()

    // Detect city/location
    const cityMatch = query.match(/(?:in|at)\s+(\w+)/i)
    if (cityMatch) {
      setCity(cityMatch[1])
    }

    // Detect bedrooms (e.g., "2BHK", "2 bed", "2 bedroom")
    const bedroomMatch = query.match(/(\d+)\s*(?:bhk|bed|bedroom)/i)
    if (bedroomMatch) {
      setBedrooms(bedroomMatch[1])
    }

    // Detect price range (e.g., "5000-15000", "5000 to 15000", "rs 5000")
    const priceMatch = query.match(
      /(?:rs\.?|npr\.?)\s*(\d+)(?:\s*-|to)\s*(\d+)/i
    )
    if (priceMatch) {
      setMinPrice(priceMatch[1])
      setMaxPrice(priceMatch[2])
    }

    // Detect amenities (common ones)
    if (lowerQuery.includes("wifi") || lowerQuery.includes("internet")) {
      // Would need to add amenity filtering logic
    }
    if (lowerQuery.includes("water") || lowerQuery.includes("24 hours")) {
      // Would need to add amenity filtering logic
    }
  }

  return (
    <div className="min-h-screen bg-background pt-6">
      {/* Header */}
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
                    placeholder="e.g., 2BHK in Kathmandu 5000-15000"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm h-9"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to search with auto-detection!
                  </p>
                </div>

                {/* City */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">
                    City/District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Kathmandu"
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
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : "Available Rooms"}
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
                      {/* Listing Image */}
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
                      </div>

                      {/* Content */}
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
