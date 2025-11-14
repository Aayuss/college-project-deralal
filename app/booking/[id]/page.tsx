"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Calendar, ChevronLeft, FileText, User } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Listing {
  id: string
  title: string
  price: number
  bedrooms: number
  bathrooms: number
  landlord_id: string
  availability_status: string
  occupied_by: string | null
}

interface BookingData {
  checkInDate: string
  checkOutDate: string
  totalPrice: number
  name: string
  email: string
  phone: string
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const listingId = Array.isArray(params.id) ? params.id[0] : params.id

  const [listing, setListing] = useState<Listing | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookingData, setBookingData] = useState<BookingData>({
    checkInDate: "",
    checkOutDate: "",
    totalPrice: 0,
    name: "",
    email: "",
    phone: "",
  })
  const [processingPayment, setProcessingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        if (!authUser) {
          router.push("/auth/login")
          return
        }

        setUser(authUser)

        // Fetch listing
        const { data: listingData } = await supabase
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .single()

        if (listingData) {
          setListing(listingData)
          setBookingData((prev) => ({
            ...prev,
            email: authUser.email || "",
          }))
        }

        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking")
        setLoading(false)
      }
    }

    fetchData()
  }, [listingId, router, supabase])

  const calculateDays = () => {
    if (!bookingData.checkInDate || !bookingData.checkOutDate) return 0
    const checkIn = new Date(bookingData.checkInDate)
    const checkOut = new Date(bookingData.checkOutDate)
    return Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  const days = calculateDays()
  const totalPrice = listing
    ? days < 30
      ? (listing.price / 30) * days * 3
      : (listing.price / 30) * days
    : 0

  useEffect(() => {
    setBookingData((prev) => ({
      ...prev,
      totalPrice: totalPrice || 0,
    }))
  }, [totalPrice])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setBookingData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProcessPayment = async () => {
    if (
      !bookingData.checkInDate ||
      !bookingData.checkOutDate ||
      !bookingData.name ||
      !bookingData.phone
    ) {
      setError("Please fill in all required fields")
      return
    }

    if (days <= 0) {
      setError("Check-out date must be after check-in date")
      return
    }

    try {
      setProcessingPayment(true)
      setError(null)

      // --- ⬇️ START OF CHANGES ⬇️ ---

      // 1. Prepare the arguments for our SQL function
      const bookingArgs = {
        p_listing_id: listingId,
        p_rentee_id: user.id,
        p_landlord_id: listing?.landlord_id,
        p_check_in_date: bookingData.checkInDate,
        p_check_out_date: bookingData.checkOutDate,
        p_total_price: totalPrice,
      }

      // 2. Call the single RPC function
      const { data: newBookingId, error: rpcError } = await supabase.rpc(
        "handle_new_booking",
        bookingArgs
      )

      if (rpcError) {
        console.log("RPC Error:", rpcError)
        throw rpcError
      }

      // --- ⬆️ END OF CHANGES ⬆️ ---

      // 3. Redirect to success page
      router.push(`/payment/success?bookingId=${newBookingId}`)
    } catch (err) {
      console.log(err)
      setError(err instanceof Error ? err.message : "Failed to process payment")
      setProcessingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Listing not found</h2>
          <Link href="/rentee/search">
            <Button>Back to Search</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
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
        <h1 className="text-3xl font-bold mb-8">Book Your Room</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            {error && (
              <Card className="p-4 mb-6 bg-destructive/10 border-destructive/30">
                <p className="text-destructive text-sm">{error}</p>
              </Card>
            )}

            <Card className="p-6 mb-6">
              <h2 className="text-lg font-bold mb-6">Booking Dates</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Check-in Date *
                  </label>
                  <Input
                    type="date"
                    name="checkInDate"
                    value={bookingData.checkInDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Check-out Date *
                  </label>
                  <Input
                    type="date"
                    name="checkOutDate"
                    value={bookingData.checkOutDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {days > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>{days}</strong> night{days !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-6">Your Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <Input
                    name="name"
                    placeholder="Your full name"
                    value={bookingData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={bookingData.email}
                    onChange={handleInputChange}
                    disabled
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Phone Number *
                  </label>
                  <Input
                    placeholder="+977"
                    name="phone"
                    value={bookingData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Booking Summary */}
          <div>
            <Card className="p-6 sticky top-8">
              <h2 className="text-lg font-bold mb-6">Booking Summary</h2>

              <div className="mb-6 pb-6 border-b border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Listing</span>
                  <span className="font-semibold">{listing.title}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price per month</span>
                  <span className="font-semibold">
                    NPR {listing.price.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Number of nights
                  </span>
                  <span className="font-semibold">{days > 0 ? days : "-"}</span>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Total Price</span>
                  <span className="text-2xl font-bold text-primary">
                    NPR {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <Link href={`/contract/generate/${listingId}`}>
                  <Button variant="outline" className="w-full mb-3">
                    <FileText className="w-4 h-4 mr-2" />
                    View Contract
                  </Button>
                </Link>

                <Button
                  onClick={handleProcessPayment}
                  disabled={processingPayment || days <= 0}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {processingPayment ? "Processing..." : "Complete Booking"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                By booking, you agree to our terms and conditions
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
