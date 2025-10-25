import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-only Supabase admin client
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[DB] Missing Supabase environment variables - returning null for build');
    return null;
  }
  
  if (supabaseAdmin === null) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { 
        auth: { persistSession: false },
      }
    );
    console.log('[DB] Supabase admin client initialized');
  }
  
  return supabaseAdmin;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Supabase not configured - skipping schema inspection' 
      }, { status: 200 });
    }
    
    // Try to get a sample record to see the actual structure
    const { data: playlistsData, error: playlistsError } = await supabase
      .from('playlists')
      .select('*')
      .limit(1);

    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    return NextResponse.json({
      ok: true,
      playlists: {
        data: playlistsData,
        error: playlistsError?.message,
        code: playlistsError?.code
      },
      payments: {
        data: paymentsData,
        error: paymentsError?.message,
        code: paymentsError?.code
      },
      message: 'Schema inspection complete'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[SCHEMA] Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
