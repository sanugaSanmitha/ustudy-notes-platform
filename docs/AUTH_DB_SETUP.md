# Auth DB Setup (Supabase)

Use this when your project currently has only part of the auth schema.

## 1) Run SQL migration in Supabase

1. Open Supabase Dashboard -> your project -> SQL Editor.
2. Open `docs/migrations/006_auth_bootstrap_all_in_one.sql`.
3. Copy and run the full SQL.

This creates and wires:

- `public.users`
- `public.verification_tokens`
- `public.password_reset_tokens`
- RLS policies and grants used by existing API routes

## 2) Verify tables

Run this in SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('users', 'verification_tokens', 'password_reset_tokens')
order by table_name;
```

Expected: 3 rows returned.

## 3) Verify profile columns

Run:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name in ('full_name', 'school', 'profile_completed')
order by column_name;
```

Expected: 3 rows returned.

## 4) Smoke test app flows

- Register account -> should insert into `auth.users` and `public.users`.
- Verify email flow -> should insert/read `public.verification_tokens`.
- Forgot password flow -> should insert/read `public.password_reset_tokens`.

## Notes

- The SQL is idempotent (`if not exists` + safe policy/grant resets), so it is safe to run more than once.
- Existing migration files (`001`-`005`) remain valid. This file is a practical one-shot bootstrap for environments that missed earlier steps.
