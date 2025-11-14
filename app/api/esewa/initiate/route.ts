import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, productName, name, email, phone } = await request.json();

    // eSewa configuration
    const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";
    const ESEWA_API_URL = process.env.ESEWA_API_URL || "https://uat.esewa.com.np/epay/main";

    // Generate unique transaction ID
    const transactionId = `${Date.now()}-${bookingId}`;

    // Calculate total amount
    const totalAmount = amount + (amount * 0.02); // Add 2% service charge

    // Build payment URL
    const paymentParams = new URLSearchParams({
      amt: totalAmount.toString(),
      psc: "0",
      pdc: "0",
      txAmt: "0",
      tAmt: totalAmount.toString(),
      pid: transactionId,
      scd: ESEWA_MERCHANT_CODE,
      su: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?bookingId=${bookingId}`,
      fu: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/failed?bookingId=${bookingId}`,
    });

    const paymentUrl = `${ESEWA_API_URL}?${paymentParams.toString()}`;

    // Store transaction in database for verification
    // In production, you would store this in Supabase
    console.log("Transaction initiated:", {
      transactionId,
      bookingId,
      amount: totalAmount,
    });

    return NextResponse.json({
      paymentUrl,
      transactionId,
    });
  } catch (error) {
    console.error("eSewa initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
