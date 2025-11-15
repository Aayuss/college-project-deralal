// search-filters.ts

export type ParsedFilters = {
  city?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  bathrooms?: number
  amenities?: string[]
}

/**
 * Parses strings like "5k", "15000", "7.5k" into numbers.
 */
function parseNumberLike(input: string): number {
  const trimmed = input.trim().toLowerCase()
  const match = trimmed.match(/(\d+(?:\.\d+)?)(k)?/)
  if (!match) return NaN
  const base = parseFloat(match[1])
  const hasK = !!match[2]
  return hasK ? base * 1000 : base
}

/**
 * Main natural-language → filter parser.
 */
export function parseQueryToFilters(query: string): ParsedFilters {
  const q = query.toLowerCase()
  const result: ParsedFilters = {}

  // --- city / location ---
  // e.g. "in baneshwor", "at bhaktapur", "near koteshwor"
  const cityMatch = q.match(
    /\b(?:in|at|around|near)\s+([a-z\s]+?)(?:\d|for|under|over|with|without|,|\.|$)/
  )

  if (cityMatch) {
    let cityCandidate = cityMatch[1].trim()

    // Clean up extra spaces
    cityCandidate = cityCandidate.replace(/\s+/g, " ")

    const tokens = cityCandidate.split(" ")

    // Take the last “location” word to avoid things like "fully furnished"
    const stopWords = new Set([
      "fully",
      "furnished",
      "cheap",
      "cheaper",
      "room",
      "flat",
      "house",
      "apartment",
      "with",
      "without",
      "near",
      "around",
      "under",
      "over",
      "for",
      "wifi",
      "internet",
      "parking",
      "balcony",
      "water",
      "electricity",
      "bhk",
      "bedroom",
      "bedrooms",
      "bathroom",
      "bathrooms",
    ])

    const locationTokens = tokens.filter((t) => !stopWords.has(t))

    if (locationTokens.length > 0) {
      // Use the last token as the city (works for "bagar pokhara fully furnished" → "pokhara")
      result.city = locationTokens[locationTokens.length - 1]
    }
  }

  // --- bedrooms ---
  // "3bhk", "3 bhk", "3 bed", "3 bedroom(s)"
  const bedroomMatch = q.match(/(\d+)\s*(?:bhk|bed(?:room)?s?)/i)
  if (bedroomMatch) {
    result.bedrooms = parseInt(bedroomMatch[1], 10)
  }

  // --- bathrooms ---
  // "2 bath", "2 bathroom(s)"
  const bathroomMatch = q.match(/(\d+)\s*(?:bath(?:room)?s?)/i)
  if (bathroomMatch) {
    result.bathrooms = parseInt(bathroomMatch[1], 10)
  }

  // --- price range ---
  // 5000-15000, 5k-15k, "5000 to 15000"
  const rangeMatch = q.match(
    /(\d+(?:\.\d+)?k?)\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?k?)/
  )
  if (rangeMatch) {
    result.minPrice = parseNumberLike(rangeMatch[1])
    result.maxPrice = parseNumberLike(rangeMatch[2])
  } else {
    // "under 15000", "below 10k", "max 20k", "budget 15k"
    const maxMatch = q.match(
      /(under|below|less than|max(?:imum)?|budget)\s*(?:rs\.?|npr\.?)?\s*(\d+(?:\.\d+)?k?)/
    )
    if (maxMatch) {
      result.maxPrice = parseNumberLike(maxMatch[2])
    }

    // "over 10000", "above 8k", "min 5000", "at least 6000"
    const minMatch = q.match(
      /(over|above|more than|min(?:imum)?|at least)\s*(?:rs\.?|npr\.?)?\s*(\d+(?:\.\d+)?k?)/
    )
    if (minMatch) {
      result.minPrice = parseNumberLike(minMatch[2])
    }

    // lone price like "rs 10000" or "npr 12k" → treat as max
    if (result.minPrice === undefined && result.maxPrice === undefined) {
      const lonePrice = q.match(/(?:rs\.?|npr\.?)\s*(\d+(?:\.\d+)?k?)/)
      if (lonePrice) {
        result.maxPrice = parseNumberLike(lonePrice[1])
      }
    }
  }

  // --- amenities ---
  // Use canonical values that match your DB exactly: "WiFi", "Furnished", "Parking", "Balcony", etc.
  const amenityKeywords: Record<string, string[]> = {
    WiFi: ["wifi", "wi-fi", "internet"],
    Parking: ["parking", "garage"],
    Balcony: ["balcony", "terrace"],
    Furnished: ["furnished", "fully furnished", "semi-furnished"],
    TV: ["tv", "television"],
    Kitchen: ["kitchen", "cooking"],
    "Washing Machine": ["washing machine", "laundry"],
  }

  const amenitiesMatched: string[] = []

  for (const [canonical, variants] of Object.entries(amenityKeywords)) {
    if (variants.some((v) => q.includes(v))) {
      amenitiesMatched.push(canonical)
    }
  }

  if (amenitiesMatched.length > 0) {
    result.amenities = amenitiesMatched
  }

  return result
}
