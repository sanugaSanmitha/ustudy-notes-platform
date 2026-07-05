
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PROTECTED_PATHS = [
  '/complete-profile',
  '/profile',
  '/cart',
  '/checkout',
  '/orders',
  '/wallet',
  '/grades',
  '/notes/upload',
  '/admin',
  '/support',
];

const AUTH_PATHS = ['/register', '/login', '/verify-email'];
type AppRole = 'user' | 'support' | 'admin';

function isAdminEmail(email?: string | null) {
  const configured = (process.env.ADMIN_REVIEW_EMAIL || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length === 0) {
    return false;
  }
  return configured.includes((email || '').trim().toLowerCase());
}

async function getUserRoles(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Middleware role fetch error:', error);
    return [];
  }

  return (data || [])
    .map((row: { role: string | null }) => row.role)
    .filter(
      (role: string | null): role is AppRole =>
        role === 'user' || role === 'support' || role === 'admin'
    );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isCompleteProfilePath = pathname === '/complete-profile' || pathname.startsWith('/complete-profile/');
  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Skip Supabase/session work for routes that do not need auth enforcement.
  if (!isProtectedPath && !isAuthPath && !isCompleteProfilePath) {
    return NextResponse.next();
  }

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

  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isSupportPath = pathname === '/support' || pathname.startsWith('/support/');

  let isProfileCompleted = false;
  let userRoles: AppRole[] = [];

  if (user) {
    userRoles = await getUserRoles(supabase, user.id);

    const { data: profile } = await supabase
      .from('users')
      .select('profile_completed, full_name, school')
      .eq('id', user.id)
      .maybeSingle();

    isProfileCompleted = Boolean(
      profile?.profile_completed &&
      profile?.full_name?.trim() &&
      profile?.school?.trim()
    );
  }

  if (isAdminPath && user) {
    const isAuthorizedAdmin = isAdminEmail(user.email) || userRoles.includes('admin');
    if (!isAuthorizedAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (isSupportPath && user) {
    const isAuthorizedSupport =
      isAdminEmail(user.email) || userRoles.includes('admin') || userRoles.includes('support');
    if (!isAuthorizedSupport) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (user && !isProfileCompleted && !isAuthPath && !isCompleteProfilePath && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/complete-profile', request.url));
  }

  if (isCompleteProfilePath && user && isProfileCompleted) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAuthPath && user) {
    const isVerifyEmailPage = pathname === '/verify-email' || pathname.startsWith('/verify-email/');
    const emailConfirmed = Boolean(user.email_confirmed_at);

    if (isVerifyEmailPage && !emailConfirmed) {
      return supabaseResponse;
    }

    const destination = isProfileCompleted ? '/' : '/complete-profile';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/complete-profile/:path*',
    '/profile/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/wallet/:path*',
    '/grades/:path*',
    '/notes/upload/:path*',
    '/admin/:path*',
    '/support/:path*',
    '/register/:path*',
    '/login/:path*',
    '/verify-email/:path*',
  ],
};
