import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: {
            code: "PROFILE_NOT_FOUND",
            message:
              "Auth account exists but profile row is missing in public.users. Re-register or insert the row manually.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: data.id,
          email: data.email,
          anonymousId: data.anonymous_id,
          isSeller: data.is_seller,
          isFirstPurchase: data.is_first_purchase,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch profile" } },
      { status: 500 }
    );
  }
}
