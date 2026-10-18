import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: SupabaseClient<any, 'public', any> | null = null;

export function getAdminClient() {
  if (adminClient) return adminClient;

  const url = config.supabase.url;
  const secretKey = config.supabase.secretKey;

  if (!url || !secretKey) {
    throw new Error(
      'Supabase admin client requires SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL to be set in environment variables.'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient = createSupabaseClient<any>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
