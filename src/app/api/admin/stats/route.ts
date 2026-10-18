import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run parallel aggregation queries
    const [
      approvedRes,
      pendingRes,
      rejectedRes,
      usersRes,
      reportsRes,
      totalsRes,
    ] = await Promise.all([
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('documents').select('file_size, download_count').eq('status', 'approved'),
    ]);

    let totalIndexedSizeBytes = 0;
    let totalDownloads = 0;

    if (totalsRes.data) {
      for (const doc of totalsRes.data) {
        totalIndexedSizeBytes += Number(doc.file_size || 0);
        totalDownloads += Number(doc.download_count || 0);
      }
    }

    return NextResponse.json({
      stats: {
        totalApproved: approvedRes.count ?? 0,
        totalPending: pendingRes.count ?? 0,
        totalRejected: rejectedRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        totalIndexedSizeBytes,
        totalDownloads,
        pendingReports: reportsRes.count ?? 0,
      },
      quotaSettings: {
        maxFileSizeMb: config.storage.maxFileSizeMb,
        maxPendingSubmissionsPerUser: config.features.maxPendingSubmissionsPerUser,
        maxUploadsPerHour: config.features.maxUploadsPerHour,
      },
      note: 'Storage metric reflects database-indexed document file sizes in the archive.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
