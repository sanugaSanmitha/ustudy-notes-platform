-- Allow the server-side Supabase service role to manage auth support tables.
-- Required because registration inserts into public.users and verification_tokens
-- from Next.js API routes using SUPABASE_SERVICE_ROLE_KEY.

grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.users
  to service_role;

grant select, insert, update, delete
  on table public.verification_tokens
  to service_role;
