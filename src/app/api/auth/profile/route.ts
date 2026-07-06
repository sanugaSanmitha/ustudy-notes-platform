import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { isAuthorizedAdmin } from "@/lib/auth/admin-access";
import { z } from "zod";
import { SCHOOL_OPTIONS } from "@/lib/profile/constants";

export const dynamic = "force-dynamic";

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120, "Full name is too long"),
  school: z.enum(SCHOOL_OPTIONS),
});

function formatProfileDbError(error: unknown, fallback: string) {
  const dbError = error as { code?: string; message?: string; details?: string | null } | null;
  const rawMessage = dbError?.message?.toLowerCase() ?? "";
  const rawDetails = dbError?.details?.toLowerCase() ?? "";

  // Most common setup issue: DB migration missing profile columns.
  if (
    rawMessage.includes("column") &&
    (rawMessage.includes("full_name") ||
      rawMessage.includes("school") ||
      rawMessage.includes("profile_completed") ||
      rawDetails.includes("full_name") ||
      rawDetails.includes("school") ||
      rawDetails.includes("profile_completed"))
  ) {
    return "Profile fields are not ready in the database. Run docs/migrations/006_auth_bootstrap_all_in_one.sql in Supabase SQL Editor.";
  }

  return fallback;
}

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

    const { data, error } = await adminClient
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
      return NextResponse.json(
        {
          error: {
            code: "PROFILE_FETCH_ERROR",
            message: formatProfileDbError(error, "Failed to fetch profile"),
          },
        },
        { status: 500 }
      );
    }

    let profile = data;

    // Auto-heal old accounts that were created in auth.users but missed public.users row.
    if (!profile) {
      if (!user.email) {
        return NextResponse.json(
          {
            error: {
              code: "PROFILE_INCOMPLETE",
              message: "Authenticated user does not have a valid email.",
            },
          },
          { status: 400 }
        );
      }

      const { data: insertedProfile, error: insertError } = await adminClient
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email.toLowerCase(),
          },
          { onConflict: "id" }
        )
        .select("*")
        .single();

      if (insertError || !insertedProfile) {
        console.error("Profile auto-heal error:", insertError);
        return NextResponse.json(
          {
            error: {
              code: "PROFILE_NOT_FOUND",
              message:
                "Auth account exists but profile row is missing in public.users.",
            },
          },
          { status: 404 }
        );
      }

      profile = insertedProfile;
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: {
            code: "PROFILE_NOT_FOUND",
            message:
              "Auth account exists but profile row is missing in public.users.",
          },
        },
        { status: 404 }
      );
    }

    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (roleRows || [])
      .map((row) => row.role)
      .filter((role): role is "user" | "support" | "admin" =>
        role === "user" || role === "support" || role === "admin"
      );

    const isAdmin = isAuthorizedAdmin(user.email, roles);

    return NextResponse.json(
      {
        data: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          school: profile.school,
          profileCompleted: Boolean(
            profile.profile_completed &&
              profile.full_name?.trim() &&
              profile.school?.trim()
          ),
          anonymousId: profile.anonymous_id,
          isSeller: profile.is_seller,
          isFirstPurchase: profile.is_first_purchase,
          isAdmin,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
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

export async function PATCH(request: Request) {
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

    if (!user.email) {
      return NextResponse.json(
        { error: { code: "PROFILE_INCOMPLETE", message: "Authenticated user does not have a valid email." } },
        { status: 400 }
      );
    }

    const parsed = updateProfileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues[0]?.message || "Invalid profile data",
          },
        },
        { status: 400 }
      );
    }

    const { fullName, school } = parsed.data;

    const { error: profileSeedError } = await adminClient
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email.toLowerCase(),
        },
        { onConflict: "id" }
      );

    if (profileSeedError) {
      console.error("Profile seed error:", profileSeedError);
      return NextResponse.json(
        {
          error: {
            code: "PROFILE_UPDATE_ERROR",
            message: "Failed to prepare profile record",
          },
        },
        { status: 500 }
      );
    }

    const { data: updatedProfile, error: updateError } = await adminClient
      .from("users")
      .update({
        full_name: fullName,
        school,
        profile_completed: true,
      })
      .eq("id", user.id)
      .select("*")
      .single();

    if (updateError || !updatedProfile) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        {
          error: {
            code: "PROFILE_UPDATE_ERROR",
            message: formatProfileDbError(updateError, "Failed to save profile"),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          fullName: updatedProfile.full_name,
          school: updatedProfile.school,
          profileCompleted: Boolean(
            updatedProfile.profile_completed &&
              updatedProfile.full_name?.trim() &&
              updatedProfile.school?.trim()
          ),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update profile" } },
      { status: 500 }
    );
  }
}
