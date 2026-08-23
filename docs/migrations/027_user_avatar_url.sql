-- Profile avatar support (public bucket: avatars)
alter table public.users
  add column if not exists avatar_url text;

-- Optional: create storage bucket in Supabase dashboard named "avatars" (public read).
