import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-only Supabase admin client
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { 
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    );
    console.log('[DB] Supabase admin client initialized');
  }
  
  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Test simple insert without user_id
    const { data, error } = await supabase
      .from('playlists')
      .insert([{
        user_email: 'test@example.com',
        playlist_name: 'Test Playlist',
        prompt: 'Test prompt',
        spotify_url: 'https://open.spotify.com/playlist/test',
        spotify_id: 'test123',
        track_count: 10
      }])
      .select()
      .single();

    if (error) {
      console.error('[TEST] Insert error:', error);
      return NextResponse.json({
        ok: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    console.log('[TEST] Test insert successful:', data);
    return NextResponse.json({
      ok: true,
      message: 'Test insert successful',
      data: data
    }, { status: 200 });

  } catch (error: any) {
    console.error('[TEST] Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
