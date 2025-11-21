export interface SearchFilters {
  city?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  bathrooms?: number
  amenities?: string[]
  search?: string
}

export function parseSearchInput(input: string): SearchFilters {
  const filters: SearchFilters = {}
  const lowerInput = input.toLowerCase()

  const cityPatterns = [
    "kathmandu",
    "pokhara",
    "bhaktapur",
    "lalitpur",
    "biratnagar",
    "patan",
  ]
  for (const city of cityPatterns) {
    if (lowerInput.includes(city)) {
      filters.city = city.charAt(0).toUpperCase() + city.slice(1)
      break
    }
  }

  const bedroomMatch = lowerInput.match(
    /(\d+)\s*(?:bhk|bedroom|bed|bed\s?room)/
  )
  if (bedroomMatch) {
    filters.bedrooms = parseInt(bedroomMatch[1])
  }

  const priceMatch = lowerInput.match(
    /(?:rs\.?\s*|₹\s*)(\d+)\s*(?:to|-|and)\s*(?:rs\.?\s*|₹\s*)?(\d+)/i
  )
  if (priceMatch) {
    filters.minPrice = parseInt(priceMatch[1])
    filters.maxPrice = parseInt(priceMatch[2])
  } else {
    const singlePriceMatch = lowerInput.match(/(?:rs\.?\s*|₹\s*)(\d+)/)
    if (singlePriceMatch) {
      filters.maxPrice = parseInt(singlePriceMatch[1])
    }
  }

  const bathroomMatch = lowerInput.match(/(\d+)\s*(?:bathroom|bath|wc)/)
  if (bathroomMatch) {
    filters.bathrooms = parseInt(bathroomMatch[1])
  }

  const amenityList = [
    "wifi",
    "water 24/7",
    "furnished",
    "parking",
    "garden",
    "balcony",
    "ac",
    "kitchen",
  ]
  filters.amenities = amenityList.filter((amenity) =>
    lowerInput.includes(amenity)
  )

  filters.search = input

  return filters
}
