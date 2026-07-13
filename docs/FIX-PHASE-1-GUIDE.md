# Phase 1 Fix Guide — Do It Yourself

**Project:** `ustudy-notes-platform`  
**Goal:** Fix login session, database tables, profile page, middleware, then test the full auth flow.  
**Time:** ~1–2 hours

Work through the steps **in order**. Each step tells you which file to create or replace.

---

## Before you start

```bash
cd C:\Users\rasan\Desktop\ustudy-notes-platform
npm run dev
```

Keep the dev server running in one terminal. Use a second terminal for commands.

**Checklist:**

- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `.env.local` has `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- [ ] `.env.local` has `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Supabase project is created and reachable

---

## Step 1 — Fix login session (critical)

### Problem

`/api/auth/login` signs in on the **server** without writing cookies to the browser. After login, middleware still thinks you are logged out.

### Solution

Sign in with the **browser Supabase client** so `@supabase/ssr` stores the session in cookies automatically.

### 1.1 Replace `src/app/(auth)/login/page.tsx`

Delete the old file content and paste this entire file:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setError(
          signInError.message.includes('Email not confirmed')
            ? 'Please verify your email before logging in.'
            : 'Invalid email or password'
        );
        setLoading(false);
        return;
      }

      router.push('/profile');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Log In</h1>
          <p className="text-slate-500">Access your UStudy Notes account</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@connect.ust.hk"
              className="w-full"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <p className="text-center text-slate-600 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 1.2 (Optional) Remove or keep `/api/auth/login`

You can **keep** the API route for later (rate limiting). The login page no longer uses it.

If you keep it, add a comment at the top of `src/app/api/auth/login/route.ts`:

```typescript
// Deprecated: login now uses browser Supabase client in src/app/(auth)/login/page.tsx
```

---

## Step 2 — SQL migration (Supabase)

### Problem

The repo has no migration files. Registration needs `users` and `verification_tokens` tables.

### 2.1 Create folder and file

Create:

```
docs/migrations/001_auth_tables.sql
```

Paste this SQL:

```sql
-- ============================================================
-- UStudy Notes Platform — Auth tables (Phase 1)
-- Run once in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Public profile row linked to Supabase Auth user
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  anonymous_id text unique generated always as (
    upper(substr(md5(id::text), 1, 6))
  ) stored,
  is_seller boolean not null default false,
  is_first_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_anonymous_id on public.users(anonymous_id);

-- Email verification tokens (custom flow via Resend)
create table if not exists public.verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_tokens_token on public.verification_tokens(token);
create index if not exists idx_verification_tokens_user_id on public.verification_tokens(user_id);

-- Row Level Security
alter table public.users enable row level security;
alter table public.verification_tokens enable row level security;

-- Users: read/update own row
drop policy if exists "Users can read own data" on public.users;
create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can update own data" on public.users;
create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

-- verification_tokens: no client access (API uses service_role)
drop policy if exists "No direct client access to tokens" on public.verification_tokens;
create policy "No direct client access to tokens"
  on public.verification_tokens for all
  using (false);
```

### 2.2 Run in Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project  
2. **SQL Editor** → **New query**  
3. Paste the full SQL → **Run**  
4. **Table Editor** → confirm `users` and `verification_tokens` exist  

### 2.3 Supabase Auth setting (important)

In Supabase: **Authentication → Providers → Email**

- Turn **ON** "Confirm email" for Supabase-managed email verification during local testing.
- Or turn **OFF** "Confirm email" and rely only on your `verification_tokens` flow.

**Recommended for this project:** keep Supabase "Confirm email" **enabled**. Your `/api/auth/verify-email` sets `email_confirm: true` via admin API after the user clicks the link.

---

## Step 3 — Profile page

### 3.1 Install Card component (if missing)

```bash
npx shadcn@latest add card
```

If the CLI asks questions, accept defaults.

### 3.2 Create `src/app/profile/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AuthUser } from '@/types/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const result = await response.json();
        setUser(result.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-6">Profile</h1>

        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Email</label>
            <p className="text-lg text-slate-900">{user.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Anonymous ID</label>
            <p className="text-lg text-slate-900">{user.anonymousId}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Member Since</label>
            <p className="text-lg text-slate-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Status</label>
            <p className="text-lg text-slate-900">
              {user.isSeller ? 'Verified Seller' : 'Buyer'}
            </p>
          </div>
        </Card>

        <div className="mt-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full text-red-600 hover:bg-red-50"
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4 — Fix middleware paths

### Problem

Middleware protects `/en/profile`, `/en/cart`, etc., but your routes are `/login`, `/register`, `/profile`.

### 4.1 Replace `src/middleware.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PROTECTED_PATHS = [
  '/profile',
  '/cart',
  '/checkout',
  '/orders',
  '/wallet',
  '/grades',
  '/notes/upload',
  '/admin',
];

const AUTH_PATHS = ['/register', '/login', '/verify-email'];

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options as CookieOptions);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
```

---

## Step 5 — Small fixes (recommended)

### 5.1 Register rate limit — `src/app/api/auth/register/route.ts`

Change line 18 from `100` to `5`:

```typescript
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});
```

### 5.2 Add `@upstash/redis` as direct dependency

```bash
npm install @upstash/redis
```

### 5.3 Update `.env.example`

Replace contents with:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

RESEND_API_KEY=your-resend-api-key

UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

CRON_SECRET=your-cron-secret
```

### 5.4 Update homepage — `src/app/page.tsx`

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          UStudy Notes Platform
        </h1>
        <p className="text-slate-500 mb-6">
          Secure note trading for university students.
        </p>
        <div className="flex gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Register
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Log in
          </Link>
          <Link
            href="/profile"
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
```

### 5.5 Resend email sender (production)

In `src/lib/email/resend.ts`, for local testing use Resend's test sender:

```typescript
from: 'onboarding@resend.dev',  // use until you verify ustudy-notes.com domain
```

After you verify your domain in Resend, switch back to:

```typescript
from: 'noreply@ustudy-notes.com',
```

---

## Step 6 — Test the full auth flow

### 6.1 Build check

```bash
npm run build
```

Should finish with no errors.

### 6.2 Manual test checklist

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Open `http://localhost:3000/register` | Register form loads |
| 2 | Register with `test@connect.ust.hk` + password ≥8 chars | Redirect to `/verify-email` |
| 3 | Check email (or Resend dashboard) | Verification link received |
| 4 | Click link (`/verify-email?token=...`) | “Email Verified”, redirect to `/login` |
| 5 | Log in with same email/password | Redirect to `/profile` |
| 6 | Refresh `/profile` | Still logged in, data shown |
| 7 | Open `/profile` in incognito (not logged in) | Redirect to `/login` |
| 8 | Click Log Out | Redirect to `/login` |
| 9 | Visit `/profile` again | Redirect to `/login` |
| 10 | Try register with `gmail.com` email | Error: university email only |

### 6.3 Verify in Supabase Table Editor

After register:

- `auth.users` — new row  
- `public.users` — matching `id` and `email`  
- `public.verification_tokens` — token row (then `used_at` set after verify)

### 6.4 Common errors

| Error | Fix |
|-------|-----|
| `relation "public.users" does not exist` | Run Step 2 SQL in Supabase |
| `Too many registration attempts` | Upstash Redis env vars wrong or rate limit hit — wait 1 hour or fix Redis |
| Email not received | Use `onboarding@resend.dev` sender; check Resend logs |
| Login says “verify your email” | Complete Step 4 of test flow first |
| Profile 401 after login | Step 1 not applied — use browser Supabase login |
| `USER_CREATE_ERROR` on register | RLS or missing `users` table — re-run migration |

---

## Step 7 — Commit your fixes

```bash
git add .
git status
git commit -m "Fix Phase 1 auth: login session, migrations, profile, middleware"
git push
```

---

## Step 8 — What comes next (Phase 2 preview)

After Phase 1 tests pass, start grade verification:

| File to create | Purpose |
|----------------|---------|
| `docs/migrations/002_grade_tables.sql` | `verified_grades`, storage bucket |
| `src/lib/pdf/parse-transcript.ts` | Extract text with `pdf-parse` |
| `src/lib/ai/deepseek-verify.ts` | DeepSeek API checks (your preferred AI) |
| `src/app/grades/upload/page.tsx` | Upload transcript UI |
| `src/app/api/grades/upload/route.ts` | Upload + parse + AI verify |

**DeepSeek flow (100 docs/month):**

```
PDF → pdf-parse (free) → DeepSeek check #1 (format)
                      → DeepSeek check #2 (anomaly)
                      → compare → admin if disagree
```

Use your `PHASE-2-COMPLETE.md` from Downloads as the base, but replace regex-only parsing with DeepSeek where  needed. 

--- 

## Quick file checklist  

After all steps, you should have: 

- [ ] `src/app/(auth)/login/page.tsx` — browser Supabase sign-in  
- [ ] `src/app/profile/page.tsx` — profile UI  
- [ ] `src/middleware.ts` — correct `/profile`, `/login` paths  
- [ ] `docs/migrations/001_auth_tables.sql` — committed to git  
- [ ] Supabase tables created  
- [ ] `.env.example` updated  
- [ ] Full test checklist passed  

---

**You’re done with Phase 1 fixes when:** register → verify → login → profile → logout all work without errors.
