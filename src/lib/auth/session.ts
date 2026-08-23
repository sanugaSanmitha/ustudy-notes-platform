import { cache } from 'react';
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { readAuthIdentity, type AuthIdentity } from "@/lib/auth/identity";
import { hasAuthSessionCookies } from "@/lib/auth/nav-cookies";
import type { AuthUser } from "@/types/auth";

export { readAuthIdentity, type AuthIdentity };

export const getAuthIdentity = cache(async (): Promise<AuthIdentity | null> => {
  if (!hasAuthSessionCookies(cookies().getAll())) {
    return null;
  }

  return readAuthIdentity(createClient());
});

type ProfileRow = {
  id: string;
  email: string;
  full_name?: string | null;
  school?: string | null;
  profile_completed?: boolean | null;
  anonymous_id: string;
  is_seller: boolean;
  is_first_purchase: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: ProfileRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    school: row.school,
    profileCompleted: Boolean(row.profile_completed),
    anonymousId: row.anonymous_id,
    isSeller: row.is_seller,
    isFirstPurchase: row.is_first_purchase,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const getCurrentAuthUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const identity = await getAuthIdentity();
    if (!identity) {
      return null;
    }

    const withAvatar = await adminClient
      .from("users")
      .select("id, email, full_name, school, profile_completed, anonymous_id, is_seller, is_first_purchase, avatar_url, created_at, updated_at")
      .eq("id", identity.id)
      .maybeSingle();

    const { data, error } = withAvatar.error?.message?.includes("avatar_url")
      ? await adminClient
          .from("users")
          .select("id, email, full_name, school, profile_completed, anonymous_id, is_seller, is_first_purchase, created_at, updated_at")
          .eq("id", identity.id)
          .maybeSingle()
      : withAvatar;

    if (error || !data) {
      return null;
    }

    return mapProfile(data as ProfileRow);
  } catch {
    return null;
  }
});

export async function getSession(): Promise<AuthUser | null> {
  return getCurrentAuthUser();
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
