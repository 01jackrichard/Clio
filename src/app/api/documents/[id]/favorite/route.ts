import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isFavorited: false });
    }

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('document_id', id)
      .maybeSingle();

    return NextResponse.json({ isFavorited: Boolean(data) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
        { error: 'Unauthorized. Please sign in to save favorites.' },
        { status: 401 }
      );
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('document_id', id)
      .maybeSingle();

    if (existing) {
      // Remove favorite
      await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ isFavorited: false, message: 'Removed from favorites' });
    } else {
      // Add favorite
      await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          document_id: id,
        });

      return NextResponse.json({ isFavorited: true, message: 'Added to favorites' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
