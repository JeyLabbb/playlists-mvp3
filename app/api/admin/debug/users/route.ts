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
        auth: { persistSession: false }
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
        error: 'Supabase not configured',
        users: []
      }, { status: 200 });
    }
    
    // 🚨 CRITICAL: Usar columnas correctas de Supabase (marketing_opt_in, no newsletter_opt_in)
    // Get all users from users table (TODOS los usuarios, no solo los de newsletter)
    // 🚨 NEW: Incluir founder_source para diferenciar entre compra y referidos
    // 🚨 NEW: Incluir usage_count y max_uses para mostrar usos restantes
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
        users: []
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      users: users || []
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[USERS] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message,
      users: []
    }, { status: 500 });
  }
}

