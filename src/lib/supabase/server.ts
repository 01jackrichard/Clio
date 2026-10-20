import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { config } from '@/lib/config';
import type { User } from '@supabase/supabase-js';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    config.supabase.url || 'https://placeholder.supabase.co',
    config.supabase.publishableKey || 'placeholder-publishable-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Request-scoped memoized authentication user.
 * Within a single Server Component render, eliminates duplicate remote HTTPS round-trips
 * across page, layout, and service functions.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
});

export interface UserProfileRecord {
  id: string;
  role: 'student' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  display_name: string | null;
  email: string | null;
  department?: string | null;
  academic_year?: string | null;
}

/**
 * Request-scoped memoized user profile query.
 * Eliminates repeated queries to the profiles table within the same request.
 */
export const getCurrentUserProfile = cache(
  async (userId: string): Promise<UserProfileRecord | null> => {
    if (!config.supabase.url || config.supabase.url.includes('placeholder') || !userId) {
      return null;
    }

    try {
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, status, display_name, email, department, academic_year')
        .eq('id', userId)
        .maybeSingle();

      return (profile as UserProfileRecord) || null;
    } catch {
      return null;
    }
  }
);
