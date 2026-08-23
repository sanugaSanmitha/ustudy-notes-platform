import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { readAuthIdentity } from '@/lib/auth/identity';
import {
  isAuthorizedAdmin,
  isAuthorizedAssistant,
  isAuthorizedSupport,
  isAuthorizedVerificationReviewer,
  resolvePortalLandingPath,
  type AppRole,
} from '@/lib/auth/admin-access';
import {
  AVATAR_COOKIE,
  DISPLAY_NAME_COOKIE,
  PROFILE_COMPLETE_COOKIE,
  SELLER_COOKIE,
  encodeNavCookieValue,
  hasAuthSessionCookies,
  navCookieOptions,
} from '@/lib/auth/nav-cookies';

const PROTECTED_PATHS = [
  '/complete-profile',
  '/profile',
  '/cart',
  '/checkout',
  '/grades',
  '/notes/upload',
  '/admin',
  '/support',
];

const AUTH_PATHS = ['/register', '/login', '/verify-email'];

function hasSupabaseSessionCookie(request: NextRequest) {
  return hasAuthSessionCookies(request.cookies.getAll());
}

function isAdminUser(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedAdmin(email, roles);
}

function isAssistantUser(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedAssistant(email, roles);
}

function isSupportUser(email: string | null | undefined, roles: AppRole[]) {
  return isAuthorizedSupport(email, roles);
}

function applyProfileNavCookies(
  response: NextResponse,
  profile: { profile_completed?: boolean | null; full_name?: string | null; school?: string | null; is_seller?: boolean | null; avatar_url?: string | null }
) {
  const isProfileCompleted = Boolean(
    profile.profile_completed && profile.full_name?.trim() && profile.school?.trim()
  );
  const isSeller = Boolean(profile.is_seller);
  const displayName = profile.full_name?.trim() || '';
  const avatarUrl = profile.avatar_url || '';

  response.cookies.set(PROFILE_COMPLETE_COOKIE, isProfileCompleted ? '1' : '0', navCookieOptions());
  response.cookies.set(SELLER_COOKIE, isSeller ? '1' : '0', navCookieOptions());
  response.cookies.set(DISPLAY_NAME_COOKIE, encodeNavCookieValue(displayName), navCookieOptions());
  response.cookies.set(AVATAR_COOKIE, encodeNavCookieValue(avatarUrl), navCookieOptions());

  return { isProfileCompleted, isSeller };
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
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isSupportPath = pathname === '/support' || pathname.startsWith('/support/');
  const isNotesUploadPath = pathname === '/notes/upload' || pathname.startsWith('/notes/upload/');

  if (pathname === '/materials' || pathname.startsWith('/materials/')) {
    return NextResponse.redirect(new URL('/notes/upload', request.url));
  }

  if (isHomePath && !hasSupabaseSessionCookie(request)) {
    return NextResponse.next();
  }

  if (!isProtectedPath && !isAuthPath && !isCompleteProfilePath && !isHomePath) {
    return NextResponse.next();
  }

  const supabaseResponse = NextResponse.next({
    request,
  });

  const redirectWithCookies = (url: URL) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  };

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

  const identity = await readAuthIdentity(supabase);
  const user = identity
    ? { id: identity.id, email: identity.email, email_confirmed_at: identity.emailConfirmed ? 'confirmed' : null }
    : null;

  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return redirectWithCookies(loginUrl);
  }

  let isProfileCompleted = request.cookies.get(PROFILE_COMPLETE_COOKIE)?.value === '1';
  let isSeller = request.cookies.get(SELLER_COOKIE)?.value === '1';
  let userRoles: AppRole[] = [];

  if (user) {
    const emailLooksStaff = isAuthorizedVerificationReviewer(user.email, []);
    const needsRoleCheck =
      isAdminPath || isSupportPath || isAuthPath || isCompleteProfilePath || (isHomePath && emailLooksStaff);
    const needsFreshProfile =
      !isProfileCompleted ||
      isCompleteProfilePath ||
      isNotesUploadPath ||
      isAuthPath ||
      request.cookies.get(DISPLAY_NAME_COOKIE) === undefined;

    if (needsFreshProfile || needsRoleCheck) {
      const [roles, profileResult] = await Promise.all([
        needsRoleCheck ? getUserRoles(supabase, user.id) : Promise.resolve([] as AppRole[]),
        needsFreshProfile
          ? (async () => {
              const withAvatar = await supabase
                .from('users')
                .select('profile_completed, full_name, school, is_seller, avatar_url')
                .eq('id', user.id)
                .maybeSingle();

              if (withAvatar.error?.message?.includes('avatar_url')) {
                return supabase
                  .from('users')
                  .select('profile_completed, full_name, school, is_seller')
                  .eq('id', user.id)
                  .maybeSingle();
              }

              return withAvatar;
            })()
          : Promise.resolve({ data: null }),
      ]);

      userRoles = roles;

      if (profileResult.data) {
        const nextProfile = applyProfileNavCookies(supabaseResponse, profileResult.data);
        isProfileCompleted = nextProfile.isProfileCompleted;
        isSeller = nextProfile.isSeller;
      }
    }
  }

  if (isNotesUploadPath && user && !isSeller) {
    const verifyUrl = new URL('/grades/upload', request.url);
    verifyUrl.searchParams.set('reason', 'seller_required');
    return redirectWithCookies(verifyUrl);
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
        return redirectWithCookies(new URL('/', request.url));
      }
    } else if (isAdminGradesPath) {
      if (!isAuthorizedVerificationReviewer(user.email, userRoles)) {
        return redirectWithCookies(new URL('/', request.url));
      }
    } else if (isAdminDashboardPath && !isAuthorizedAdminUser && (isAuthorizedAssistantUser || isAuthorizedSupportUser)) {
      return redirectWithCookies(new URL('/admin/grades', request.url));
    } else if (!isAuthorizedAdminUser) {
      return redirectWithCookies(new URL('/', request.url));
    }
  }

  if (isSupportPath && user) {
    if (!isSupportUser(user.email, userRoles)) {
      return redirectWithCookies(new URL('/', request.url));
    }
  }

  if (user && !isProfileCompleted && !isAuthPath && !isCompleteProfilePath && !pathname.startsWith('/api/')) {
    return redirectWithCookies(new URL('/complete-profile', request.url));
  }

  if (isCompleteProfilePath && user && isProfileCompleted) {
    const landing = resolvePortalLandingPath({
      profileCompleted: true,
      email: user.email,
      roles: userRoles,
    });
    return redirectWithCookies(new URL(landing, request.url));
  }

  if (isHomePath && user && isProfileCompleted) {
    const landing = resolvePortalLandingPath({
      profileCompleted: true,
      email: user.email,
      roles: userRoles,
    });
    if (landing !== '/') {
      return redirectWithCookies(new URL(landing, request.url));
    }
  }

  if (isAuthPath && user) {
    const isVerifyEmailPage = pathname === '/verify-email' || pathname.startsWith('/verify-email/');
    const emailConfirmed = identity?.emailConfirmed;

    if (isVerifyEmailPage && !emailConfirmed) {
      return supabaseResponse;
    }

    const destination = resolvePortalLandingPath({
      profileCompleted: isProfileCompleted,
      email: user.email,
      roles: userRoles,
    });
    return redirectWithCookies(new URL(destination, request.url));
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
    '/grades/:path*',
    '/notes/upload/:path*',
    '/materials',
    '/materials/:path*',
    '/admin',
    '/admin/:path*',
    '/support/:path*',
    '/register/:path*',
    '/login/:path*',
    '/verify-email/:path*',
  ],
};
