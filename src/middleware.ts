import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

  // Refresh session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect routes that require authentication
  const protectedPaths = [
    '/en/profile',
    '/en/cart',
    '/en/checkout',
    '/en/orders',
    '/en/wallet',
    '/en/grades',
    '/en/notes/upload',
    '/en/admin',
    '/zh-Hant/profile',
    '/zh-Hant/cart',
    '/zh-Hant/checkout',
    '/zh-Hant/orders',
    '/zh-Hant/wallet',
    '/zh-Hant/grades',
    '/zh-Hant/notes/upload',
    '/zh-Hant/admin',
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Prevent authenticated users from accessing auth pages
  const authPaths = [
    '/register',
    '/login',
    '/en/auth/register',
    '/en/auth/login',
    '/zh-Hant/auth/register',
    '/zh-Hant/auth/login',
  ];

  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && user) {
    // Redirect to homepage
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
