
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import {
  isAuthorizedAdmin,
  isAuthorizedAssistant,
  isAuthorizedSupport,
  isAuthorizedVerificationReviewer,
  resolvePortalLandingPath,
  type AppRole,
} from '@/lib/auth/admin-access';

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

function isAdminUser(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedAdmin(email, roles);
}

function isAssistantUser(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedAssistant(email, roles);
}

function isSupportUser(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedSupport(email, roles);
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
        role === 'user' || role === 'support' || role === 'admin' || role === 'assistant'
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
  const isHomePath = pathname === '/';

  // Skip Supabase/session work for routes that do not need auth enforcement.
  if (!isProtectedPath && !isAuthPath && !isCompleteProfilePath && !isHomePath) {
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
  let isSeller = false;
  let userRoles: AppRole[] = [];

  if (user) {
    userRoles = await getUserRoles(supabase, user.id);

    const { data: profile } = await supabase
      .from('users')
      .select('profile_completed, full_name, school, is_seller')
      .eq('id', user.id)
      .maybeSingle();

    isProfileCompleted = Boolean(
      profile?.profile_completed &&
      profile?.full_name?.trim() &&
      profile?.school?.trim()
    );
    isSeller = Boolean(profile?.is_seller);
  }

  const isNotesUploadPath = pathname === '/notes/upload' || pathname.startsWith('/notes/upload/');
  if (isNotesUploadPath && user && !isSeller) {
    const verifyUrl = new URL('/grades/upload', request.url);
    verifyUrl.searchParams.set('reason', 'seller_required');
    return NextResponse.redirect(verifyUrl);
  }

  if (isAdminPath && user) {
    const isAdminSupportPath = pathname === '/admin/support' || pathname.startsWith('/admin/support/');
    const isAdminGradesPath = pathname === '/admin/grades' || pathname.startsWith('/admin/grades/');
    const isAdminDashboardPath = pathname === '/admin';
    const isAuthorizedAdminUser = isAdminUser(user.email, userRoles);
    const isAuthorizedAssistantUser = isAssistantUser(user.email, userRoles);
    const isAuthorizedSupportUser = isSupportUser(user.email, userRoles);

    if (isAdminSupportPath) {
      if (!isAuthorizedAdminUser && !isAuthorizedSupportUser) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } else if (isAdminGradesPath) {
      if (!isAuthorizedVerificationReviewer(user.email, userRoles)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } else if (isAdminDashboardPath && !isAuthorizedAdminUser && (isAuthorizedAssistantUser || isAuthorizedSupportUser)) {
      return NextResponse.redirect(new URL('/admin/grades', request.url));
    } else if (!isAuthorizedAdminUser) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (isSupportPath && user) {
    if (!isSupportUser(user.email, userRoles)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (user && !isProfileCompleted && !isAuthPath && !isCompleteProfilePath && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/complete-profile', request.url));
  }

  if (isCompleteProfilePath && user && isProfileCompleted) {
    const landing = resolvePortalLandingPath({
      profileCompleted: true,
      email: user.email,
      roles: userRoles,
    });
    return NextResponse.redirect(new URL(landing, request.url));
  }

  if (isHomePath && user && isProfileCompleted) {
    const landing = resolvePortalLandingPath({
      profileCompleted: true,
      email: user.email,
      roles: userRoles,
    });
    if (landing !== '/') {
      return NextResponse.redirect(new URL(landing, request.url));
    }
  }

  if (isAuthPath && user) {
    const isVerifyEmailPage = pathname === '/verify-email' || pathname.startsWith('/verify-email/');
    const emailConfirmed = Boolean(user.email_confirmed_at);

    if (isVerifyEmailPage && !emailConfirmed) {
      return supabaseResponse;
    }

    const destination = resolvePortalLandingPath({
      profileCompleted: isProfileCompleted,
      email: user.email,
      roles: userRoles,
    });
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/complete-profile/:path*',
    '/profile/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/wallet/:path*',
    '/grades/:path*',
    '/notes/upload/:path*',
    '/admin',
    '/admin/:path*',
    '/support/:path*',
    '/register/:path*',
    '/login/:path*',
    '/verify-email/:path*',
  ],
};
