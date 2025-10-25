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

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        ok: false, 
        error: 'Debug page is not available in production' 
      }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    
    // Get counts
    const { count: promptsCount } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true });
      
    const { count: usageEventsCount } = await supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true });
      
    const { count: profilesCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: playlistsCount } = await supabase
      .from('playlists')
      .select('*', { count: 'exact', head: true });

    const { count: paymentsCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });

    // Get recent prompts
    const { data: recentPrompts } = await supabase
      .from('prompts')
      .select('id, user_email, text, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent usage events
    const { data: recentUsageEvents } = await supabase
      .from('usage_events')
      .select('id, user_email, action, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(10);

    // Get recent playlists
    const { data: recentPlaylists } = await supabase
      .from('playlists')
      .select('id, user_email, playlist_name, prompt, spotify_url, track_count, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent payments
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('id, user_email, amount, currency, plan, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      counts: {
        prompts: promptsCount || 0,
        usage_events: usageEventsCount || 0,
        profiles: profilesCount || 0,
        playlists: playlistsCount || 0,
        payments: paymentsCount || 0
      },
      recentPrompts: recentPrompts || [],
      recentUsageEvents: recentUsageEvents || [],
      recentPlaylists: recentPlaylists || [],
      recentPayments: recentPayments || []
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error fetching debug data:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}