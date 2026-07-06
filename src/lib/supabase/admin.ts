import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function createMissingAdminClient(reason: string): SupabaseClient {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(reason);
      },
    }
  ) as SupabaseClient;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const missingKeys: string[] = [];

if (!supabaseUrl) missingKeys.push("NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) missingKeys.push("SUPABASE_SERVICE_ROLE_KEY");

const missingEnvReason =
  missingKeys.length > 0
    ? `Missing required server environment variables: ${missingKeys.join(
        ", "
      )}. Add them in Vercel Project Settings -> Environment Variables and redeploy.`
    : "";

export const adminClient =
  missingEnvReason.length > 0
    ? createMissingAdminClient(missingEnvReason)
    : createClient(supabaseUrl as string, serviceRoleKey as string, {
        auth: { persistSession: false },
      });