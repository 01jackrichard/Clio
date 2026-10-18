import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitReportSchema } from '@/lib/validations/report';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to report a document.' },
        { status: 401 }
      );
    }

    // Check account status
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'suspended') {
      return NextResponse.json(
        { error: 'Your account is suspended. You cannot submit reports.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = submitReportSchema.safeParse({
      ...body,
      document_id: id,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { reason, details } = parseResult.data;

    // Check if user already reported this document recently
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('document_id', id)
      .eq('reporter_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already submitted a pending report for this document.' },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from('reports').insert({
      document_id: id,
      reporter_id: user.id,
      reason,
      details: details || null,
      status: 'pending',
    });

    if (insertError) {
      console.error('Error inserting report:', insertError);
      return NextResponse.json(
        { error: 'Failed to record report. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Report submitted. Our moderation team will review this document.' },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
