"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ChevronLeft, Plus, X } from 'lucide-react';

const AMENITIES_OPTIONS = [
  "WiFi",
  "TV",
  "Kitchen",
  "Washing Machine",
  "Air Conditioning",
  "Heating",
  "Furnished",
  "Parking",
  "Balcony",
  "Garden",
  "Security",
  "Pet Friendly",
];

export default function CreateListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    district: "",
    price: "",
    bedrooms: "1",
    bathrooms: "1",
    area_sqft: "",
    photos: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleAddPhoto = () => {
    const newPhoto = prompt("Enter photo URL:");
    if (newPhoto) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, newPhoto]
      }));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.title || !formData.description || !formData.address || !formData.city || !formData.price) {
        throw new Error("Please fill in all required fields");
      }

      const supabase = createClient();

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("You must be logged in");
      }

      // Insert listing
      const { data, error: insertError } = await supabase
        .from("listings")
        .insert({
          landlord_id: user.id,
          title: formData.title,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          price: parseFloat(formData.price),
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms),
          area_sqft: formData.area_sqft ? parseInt(formData.area_sqft) : null,
          amenities: selectedAmenities,
          photos: formData.photos,
          availability_status: "available",
          is_active: true,
        })
        .select();

      if (insertError) throw insertError;

      router.push("/landlord/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-40">
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
          <p className="text-muted-foreground">Fill in the details about your property</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <Card className="p-4 mb-6 bg-destructive/10 border-destructive/30">
              <p className="text-destructive text-sm">{error}</p>
            </Card>
          )}

          {/* Basic Information */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input
                  name="title"
                  placeholder="e.g., Cozy 2BHK near Kathmandu Center"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description *</label>
                <textarea
                  name="description"
                  placeholder="Describe your property, features, and what makes it special..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full h-32 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Address *</label>
                  <Input
                    name="address"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">City *</label>
                  <Input
                    name="city"
                    placeholder="e.g., Kathmandu"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">District</label>
                <Input
                  name="district"
                  placeholder="e.g., Kathmandu"
                  value={formData.district}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </Card>

          {/* Property Details */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Property Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Bedrooms *</label>
                <select
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5+</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Bathrooms *</label>
                <select
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Area (Sq. Ft.)</label>
                <Input
                  type="number"
                  name="area_sqft"
                  placeholder="e.g., 1200"
                  value={formData.area_sqft}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Monthly Price (NPR) *</label>
                <Input
                  type="number"
                  name="price"
                  placeholder="e.g., 15000"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Amenities */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AMENITIES_OPTIONS.map(amenity => (
                <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(amenity)}
                    onChange={() => handleAmenityToggle(amenity)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm">{amenity}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Photos */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Photos</h2>
            <div className="mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddPhoto}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Photo URL
              </Button>
            </div>

            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={photo || "/placeholder.svg"}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
            >
              {loading ? "Creating..." : "Create Listing"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
