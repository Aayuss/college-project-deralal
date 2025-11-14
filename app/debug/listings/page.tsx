"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    const checkListings = async () => {
      const supabase = createClient();

      // Get total count
      const { count: totalCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true });

      setCount(totalCount || 0);

      // Get all listings
      const { data } = await supabase
        .from("listings")
        .select("id, title, city, district, price, bedrooms")
        .limit(10);

      setListings(data || []);

      // Get distinct cities
      const { data: allListings } = await supabase
        .from("listings")
        .select("city");

      const uniqueCities = [...new Set((allListings || []).map((l: any) => l.city))];
      setCities(uniqueCities);
    };

    checkListings();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug: Listings Database</h1>
      
      <div className="mb-6 p-4 bg-blue-100 rounded">
        <p className="text-lg"><strong>Total Listings:</strong> {count}</p>
        <p className="text-lg"><strong>Cities Found:</strong> {cities.join(", ")}</p>
      </div>

      <h2 className="text-xl font-bold mb-2">Sample Listings (First 10):</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Title</th>
              <th className="border p-2">City</th>
              <th className="border p-2">Price</th>
              <th className="border p-2">Beds</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td className="border p-2">{listing.title}</td>
                <td className="border p-2">{listing.city}</td>
                <td className="border p-2">NPR {listing.price}</td>
                <td className="border p-2">{listing.bedrooms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
