import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // No cache

// Crear cliente fresco cada vez para evitar datos stale
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[DB] Missing Supabase environment variables');
    return null;
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { 
      auth: { persistSession: false }
    }
  );
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[USERS] GET request at ${timestamp}`);
  
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Supabase not configured',
        users: [],
        timestamp
      }, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
    
    // Obtener usuarios con datos actualizados
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, plan, is_early_founder_candidate, created_at, marketing_opt_in, founder_source, usage_count, max_uses')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[USERS] Error fetching users:', error);
      return NextResponse.json({ 
        ok: false, 
        error: error.message,
        users: [],
        timestamp
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    console.log(`[USERS] Fetched ${users?.length || 0} users at ${timestamp}`);
    
    return NextResponse.json({
      ok: true,
      users: users || [],
      count: users?.length || 0,
      timestamp
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
  } catch (error: any) {
    console.error('[USERS] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message,
      users: [],
      timestamp
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}

