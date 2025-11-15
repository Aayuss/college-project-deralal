"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  Plus,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Listing {
  id: string
  title: string
  address: string
  city: string
  price: number
  bedrooms: number
  bathrooms: number
  availability_status: string
  created_at: string
  is_active: boolean
}

export default function LandlordDashboard() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [searchFilter, setSearchFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Get current user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError || !authUser) {
          router.push("/auth/login")
          return
        }

        setUser(authUser)

        // Fetch listings
        let query = supabase
          .from("listings")
          .select("*")
          .eq("landlord_id", authUser.id)
          .order("created_at", { ascending: false })

        if (statusFilter) {
          query = query.eq("availability_status", statusFilter)
        }

        const { data: listingsData, error: listingsError } = await query

        if (listingsError) throw listingsError

        setListings(listingsData || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listings")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, statusFilter])

  const handleDelete = async (listingId: string) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return

    try {
      setDeletingId(listingId)
      const supabase = createClient()

      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId)

      if (error) throw error

      setListings(listings.filter((l) => l.id !== listingId))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete listing")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (listingId: string, isActive: boolean) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("listings")
        .update({ is_active: !isActive })
        .eq("id", listingId)

      if (error) throw error

      setListings(
        listings.map((l) =>
          l.id === listingId ? { ...l, is_active: !isActive } : l
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update listing")
    }
  }

  const filteredListings = listings.filter(
    (listing) =>
      listing.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      listing.address.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const occupiedListings = listings.filter(
    (l) => l.availability_status === "occupied"
  )

  const stats = {
    total: listings.length,
    active: listings.filter(
      (l) => l.is_active && l.availability_status === "available"
    ).length,
    occupied: occupiedListings.length,
    totalRevenue: occupiedListings.reduce((acc, l) => acc + l.price, 0),
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-40">
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
              <Link href="/landlord/settings">
                <Button variant="outline" size="sm">
                  Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Listing Management</h1>
            <p className="text-muted-foreground">
              Manage your property listings and bookings
            </p>
          </div>
          <Link href="/landlord/create-listing">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create Listing
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Listings</p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-3xl font-bold mt-2 text-blue-600">
                  {stats.occupied}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-3xl font-bold mt-2 text-primary">
                  NPR {stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Search by title or address..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {/* Listings Table */}
        {loading ? (
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading listings...</p>
          </Card>
        ) : error ? (
          <Card className="p-6 bg-destructive/10 border-destructive/30">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : filteredListings.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No listings found</h3>
            <p className="text-muted-foreground mb-6">
              Create your first listing to get started
            </p>
            <Link href="/landlord/create-listing">
              <Button>Create Listing</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{listing.title}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          listing.availability_status === "available"
                            ? "bg-green-100 text-green-700"
                            : listing.availability_status === "occupied"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {listing.availability_status}
                      </span>
                      {!listing.is_active && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {listing.address}, {listing.city}
                    </p>

                    <div className="flex items-center gap-6 text-sm">
                      <span className="font-semibold">
                        NPR {listing.price.toLocaleString()}/month
                      </span>
                      <span className="text-muted-foreground">
                        {listing.bedrooms} bed, {listing.bathrooms} bath
                      </span>
                      <span className="text-muted-foreground">
                        Created{" "}
                        {new Date(listing.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/landlord/edit-listing/${listing.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/rentee/listing/${listing.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant={listing.is_active ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        handleToggleActive(listing.id, listing.is_active)
                      }
                    >
                      {listing.is_active ? "Active" : "Inactive"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(listing.id)}
                      disabled={deletingId === listing.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
