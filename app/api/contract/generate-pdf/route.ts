import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { listing, landlord, renter } = await request.json()

    const pdfContent = `
RENTAL AGREEMENT

PARTIES:
Landlord: ${landlord?.first_name} ${landlord?.last_name}
Renter: ${renter?.email}

PROPERTY:
Address: ${listing?.address}, ${listing?.city}
Bedrooms: ${listing?.bedrooms}
Bathrooms: ${listing?.bathrooms}

TERMS:
Monthly Rent: NPR ${listing?.price?.toLocaleString()}
Payment Method: eSewa

AGREEMENT:
This rental agreement is valid from the check-in date as specified in the booking confirmation.

Generated on: ${new Date().toLocaleDateString()}
This agreement is digitally signed through deralal platform.
    `

    // For this implementation, we'll return a text file
    // In production, use a PDF library to generate actual PDF
    const buffer = Buffer.from(pdfContent, "utf-8")

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rental-contract-${listing?.title?.replace(
          /\s+/g,
          "-"
        )}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    )
  }
}
