export interface ParsedFilters {
  city?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  bathrooms?: number
  amenities?: string[]
  remainingQuery?: string
}

export function parseQueryToFilters(query: string): ParsedFilters {
  // 1. Clean up "I want", "I need", etc.
  let cleaned = query.replace(
    /^(i want|i need|i'm looking for|looking for|show me)\s+/i,
    ""
  )

  const filters: ParsedFilters = {
    amenities: [],
  }

  // 2. Extract "under/below X" (Max Price)
  // Matches: "under 20000", "below 15000", "< 5000", "max 5000"
  const maxPriceMatch = cleaned.match(
    /(?:under|below|max|less than|<\s*)\s*(\d+)/i
  )
  if (maxPriceMatch) {
    filters.maxPrice = parseInt(maxPriceMatch[1], 10)
    cleaned = cleaned.replace(maxPriceMatch[0], "")
  }

  // 3. Extract "over/above X" (Min Price)
  // Matches: "over 20000", "above 15000", "> 5000", "min 5000"
  const minPriceMatch = cleaned.match(
    /(?:over|above|min|more than|>\s*)\s*(\d+)/i
  )
  if (minPriceMatch) {
    filters.minPrice = parseInt(minPriceMatch[1], 10)
    cleaned = cleaned.replace(minPriceMatch[0], "")
  }

  // 4. Extract Bedrooms (e.g., "3bhk", "2 bedrooms", "1 bed")
  const bedMatch = cleaned.match(/(\d+)\s*(?:bhk|bed|bedroom)/i)
  if (bedMatch) {
    filters.bedrooms = parseInt(bedMatch[1], 10)
    // We often keep "3bhk" in text for matching titles like "Beautiful 3BHK",
    // but for strict logic, you can remove it.
    // Let's leave it in 'cleaned' for text matching unless it causes issues.
  }

  // 5. Extract "in [City]"
  const cityMatch = cleaned.match(/\bin\s+([a-zA-Z]+)/i)
  if (cityMatch) {
    filters.city = cityMatch[1]
    cleaned = cleaned.replace(cityMatch[0], "")
  }

  // 6. Common Amenities
  const commonAmenities = [
    "wifi",
    "parking",
    "kitchen",
    "water",
    "ac",
    "internet",
  ]
  commonAmenities.forEach((amenity) => {
    if (cleaned.toLowerCase().includes(amenity)) {
      filters.amenities?.push(amenity)
    }
  })

  // 7. Clean up currency words so "20000 rs" doesn't fail if description says "NPR"
  cleaned = cleaned.replace(/\b(rs|rupees|npr|rupee)\b/gi, "")

  filters.remainingQuery = cleaned.trim()

  return filters
}
