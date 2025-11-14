import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, message } = await request.json();

    if (!receiverId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert warning message
    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: message,
        message_type: "warning",
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error sending warning:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send warning" },
      { status: 500 }
    );
  }
}
