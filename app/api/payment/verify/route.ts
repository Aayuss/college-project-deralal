import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { bookingId, transactionId, status } = await request.json();

    if (status === "success") {
      // Update booking payment status
      const { error } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
        })
        .eq("id", bookingId);

      if (error) throw error;

      // Create contract
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (booking) {
        await supabase
          .from("contracts")
          .insert({
            booking_id: booking.id,
            landlord_id: booking.landlord_id,
            rentee_id: booking.rentee_id,
            status: "pending",
          });
      }

      return NextResponse.json({ success: true });
    } else {
      // Update booking status to failed
      await supabase
        .from("bookings")
        .update({ status: "cancelled", payment_status: "pending" })
        .eq("id", bookingId);

      return NextResponse.json({ success: false });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
