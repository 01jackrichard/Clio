import { NextResponse } from 'next/server';
import { checkConfigStatus, config } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const configStatus = checkConfigStatus();

  const diagnostics: {
    status: 'ok' | 'degraded' | 'misconfigured';
    storage: {
      provider: string;
      cost: string;
      status: 'active' | 'degraded';
      allowedMimeTypes: string[];
    };
    supabase: { connected: boolean; message?: string };
    missingEnv: { public: string[]; server: string[] };
  } = {
    status: 'ok',
    storage: {
      provider: 'google_drive',
      cost: 'zero_additional_cost',
      status: 'active',
      allowedMimeTypes: config.storage.allowedMimeTypes,
    },
    supabase: { connected: false },
    missingEnv: {
      public: configStatus.missingPublic,
      server: configStatus.missingServer,
    },
  };

  // Test Supabase connectivity
  if (configStatus.supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if (error) {
        diagnostics.supabase = { connected: false, message: error.message };
        diagnostics.status = 'degraded';
      } else {
        diagnostics.supabase = { connected: true };
      }
    } catch (err: unknown) {
      diagnostics.supabase = {
        connected: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
      diagnostics.status = 'degraded';
    }
  } else {
    diagnostics.supabase = {
      connected: false,
      message: 'Supabase URL or Publishable key is missing',
    };
    diagnostics.status = 'misconfigured';
  }

  return NextResponse.json(diagnostics, {
    status: diagnostics.status === 'ok' ? 200 : 200,
  });
}

