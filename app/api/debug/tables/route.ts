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
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        ok: false, 
        error: 'Debug page is not available in production' 
      }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Supabase not configured - skipping table check' 
      }, { status: 200 });
    }
    
    // Check if tables exist by trying to query them
    const tableChecks: { [key: string]: boolean } = {};
    const tableSchemas: any[] = [];
    
    for (const table of ['playlists', 'payments', 'prompts', 'usage_events', 'profiles']) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.code === '42P01') { // Table doesn't exist
            tableChecks[table] = false;
            console.log(`[DEBUG] Table ${table} does not exist`);
          } else {
            tableChecks[table] = true; // Table exists but has other issues
            console.log(`[DEBUG] Table ${table} exists but has issues:`, error.message);
          }
        } else {
          tableChecks[table] = true;
          console.log(`[DEBUG] Table ${table} exists and is accessible`);
        }
      } catch (err) {
        tableChecks[table] = false;
        console.log(`[DEBUG] Table ${table} does not exist or is not accessible:`, err);
      }
    }

    // Try to get counts for existing tables
    const counts: { [key: string]: number } = {};
    
    for (const table of ['prompts', 'usage_events', 'profiles', 'playlists', 'payments']) {
      if (tableChecks[table]) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            console.warn(`[DEBUG] Error getting count for ${table}:`, error.message);
            counts[table] = -1; // Error indicator
          } else {
            counts[table] = count || 0;
          }
        } catch (err) {
          console.warn(`[DEBUG] Exception getting count for ${table}:`, err);
          counts[table] = -1;
        }
      } else {
        counts[table] = -2; // Table doesn't exist
      }
    }

    return NextResponse.json({
      ok: true,
      tableChecks,
      tableSchemas,
      counts,
      message: 'Table status check complete'
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
