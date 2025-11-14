"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft, Download, AlertCircle } from 'lucide-react';

interface Listing {
  title: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  landlord_id: string;
}

interface Landlord {
  first_name: string;
  last_name: string;
  email: string;
}

export default function GenerateContractPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = Array.isArray(params.listingId) ? params.listingId[0] : params.listingId;

  const [listing, setListing] = useState<Listing | null>(null);
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/auth/login");
          return;
        }

        setUser(authUser);

        // Fetch listing
        const { data: listingData } = await supabase
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .single();

        if (listingData) {
          setListing(listingData);

          // Fetch landlord info
          const { data: landlordData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", listingData.landlord_id)
            .single();

          if (landlordData) setLandlord(landlordData);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
        setLoading(false);
      }
    };

    fetchData();
  }, [listingId, router, supabase]);

  const handleDownloadPDF = async () => {
    try {
      setGenerating(true);

      const response = await fetch("/api/contract/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing,
          landlord,
          renter: user,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rental-contract-${listing?.title.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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
        <h1 className="text-3xl font-bold mb-2">Rental Agreement</h1>
        <p className="text-muted-foreground mb-8">Review and download your rental contract</p>

        {error && (
          <Card className="p-4 mb-6 bg-destructive/10 border-destructive/30">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        {/* Contract Preview */}
        <Card className="p-8 mb-8 bg-white dark:bg-slate-900 border-2">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <h2 className="text-center text-2xl font-bold mb-8">RENTAL AGREEMENT</h2>

            <div className="mb-6">
              <h3 className="font-bold mb-2">1. PARTIES</h3>
              <p>
                This Rental Agreement is entered into between <strong>{landlord?.first_name} {landlord?.last_name}</strong> (Landlord)
                and <strong>{user?.email}</strong> (Renter).
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">2. PROPERTY</h3>
              <p>
                The Landlord agrees to rent the property located at:
                <br />
                <strong>
                  {listing?.address}, {listing?.city}
                  <br />
                  {listing?.bedrooms} Bedroom(s), {listing?.bathrooms} Bathroom(s)
                </strong>
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">3. RENTAL TERMS</h3>
              <p>
                <strong>Monthly Rent:</strong> NPR {listing?.price.toLocaleString()}
                <br />
                <strong>Payment Due:</strong> On the 1st of each month
                <br />
                <strong>Payment Method:</strong> eSewa or agreed upon method
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">4. LEASE DURATION</h3>
              <p>
                This rental agreement is valid from the check-in date until the check-out date as specified in the booking confirmation.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">5. SECURITY DEPOSIT</h3>
              <p>
                The Renter shall pay one month's rent as a security deposit, refundable upon lease termination and property return in good condition.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">6. RESPONSIBILITIES</h3>
              <p>
                <strong>Landlord:</strong> Maintains the property in habitable condition and handles major repairs.
                <br />
                <strong>Renter:</strong> Keeps the property clean, reports maintenance issues promptly, and complies with all terms.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">7. TERMINATION</h3>
              <p>
                Either party may terminate this agreement with 30 days written notice. Early termination may result in penalty as per legal terms.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">8. GOVERNING LAW</h3>
              <p>
                This agreement is governed by the laws of Nepal and shall be interpreted according to Nepalese legal standards.
              </p>
            </div>

            <div className="mt-12 pt-8 border-t">
              <p className="text-sm mb-6">
                <strong>Generated on:</strong> {new Date().toLocaleDateString()} | <strong>Valid for:</strong> 30 days
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Both parties must sign this agreement digitally through the deralal platform to activate the rental.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={handleDownloadPDF}
            disabled={generating}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
          >
            <Download className="w-4 h-4 mr-2" />
            {generating ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="outline" onClick={() => router.back()} className="h-11">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
