import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { config } from '@/lib/config';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Protected student routes
  const isStudentRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/my-submissions') ||
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/shared-with-me') ||
    pathname.startsWith('/upgrade') ||
    pathname.startsWith('/profile');

  // Protected admin routes
  const isAdminRoute = pathname.startsWith('/admin');

  // Auth routes (redirect logged-in users away from login/register)
  const isAuthRoute =
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register') ||
    pathname.startsWith('/auth/forgot-password');

  // Fast-path: Check for Supabase session cookies before making remote network calls
  const allCookies = request.cookies.getAll();
  const hasAuthCookies = allCookies.some(
    (c) => c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.includes('supabase')
  );

  if (!hasAuthCookies) {
    if (isStudentRoute || isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }
    // Guest accessing public page: bypass remote network round-trip entirely
    return supabaseResponse;
  }

  const supabase = createServerClient(
    config.supabase.url || 'https://placeholder.supabase.co',
    config.supabase.publishableKey || 'placeholder-publishable-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() to validate auth status server-side securely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (isStudentRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/documents';
    return NextResponse.redirect(url);
  }

  // If visiting admin route, verify role from profiles table
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
