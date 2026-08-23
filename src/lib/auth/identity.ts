type ClaimsClient = {
  auth: {
    getClaims: () => Promise<{
      data: { claims: Record<string, unknown> } | null;
      error: { message?: string } | null;
    }>;
  };
};

export type AuthIdentity = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
};

export async function readAuthIdentity(supabase: ClaimsClient): Promise<AuthIdentity | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) {
    return null;
  }

  return {
    id: String(claims.sub),
    email: typeof claims.email === 'string' ? claims.email : null,
    emailConfirmed: claims.email_verified === true || typeof claims.email_confirmed_at === 'string',
  };
}
