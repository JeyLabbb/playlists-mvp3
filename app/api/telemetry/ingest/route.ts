import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force Node.js runtime (not Edge)
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
      }
    );
    console.log('[DB] Supabase admin client initialized');
  }
  
  return supabaseAdmin;
}

async function insertPrompt(userEmail: string, text: string, source: string = 'web'): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('prompts')
      .insert([{
        user_email: userEmail,
        text: text,
        source: source
      }] as any)
      .select()
      .single();
    
    if (error) {
      console.error('[DB] prompts.insert error:', error.message);
      return null;
    }
    
    if (!data) {
      console.error('[DB] prompts.insert: no data returned');
      return null;
    }
    
    const result = data as any;
    console.log(`[DB] prompts.insert ok id=${result.id}`);
    return result.id;
  } catch (error) {
    console.error('[DB] Error in insertPrompt:', error);
    return null;
  }
}

async function getUserUUID(userEmail: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    // First try to get from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (!userError && user && (user as any).id) {
      return (user as any).id;
    }
    
    // If not found in users, try to get from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', userEmail)
      .single();
    
    if (!profileError && profile && (profile as any).user_id) {
      return (profile as any).user_id;
    }
    
    console.warn(`[DB] User not found for email: ${userEmail}`);
    return null;
  } catch (error) {
    console.error('[DB] Error getting user UUID:', error);
    return null;
  }
}

async function insertUsageEvent(userEmail: string, action: string, meta: any = {}): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get user UUID
    const userUUID = await getUserUUID(userEmail);
    if (!userUUID) {
      console.error(`[DB] Cannot insert usage event: user not found for ${userEmail}`);
      return null;
    }
    
    const { data, error } = await supabase
      .from('usage_events')
      .insert([{
        user_email: userEmail,
        user_id: userUUID,
        action: action,
        meta: meta
      }] as any)
      .select()
      .single();
    
    if (error) {
      console.error('[DB] usage_events.insert error:', error.message);
      return null;
    }
    
    if (!data) {
      console.error('[DB] usage_events.insert: no data returned');
      return null;
    }
    
    const result = data as any;
    console.log(`[DB] usage_events.insert ok id=${result.id}`);
    return result.id;
  } catch (error) {
    console.error('[DB] Error in insertUsageEvent:', error);
    return null;
  }
}

async function insertPlaylist(userEmail: string, playlistName: string, prompt: string, spotifyUrl?: string, spotifyId?: string, trackCount?: number): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Try to get user UUID, but don't fail if not found
    const userUUID = await getUserUUID(userEmail);
    
    const { data, error } = await supabase
      .from('playlists')
      .insert([{
        user_email: userEmail,
        user_id: null, // Use null to avoid foreign key constraint issues
        playlist_name: playlistName,
        prompt: prompt,
        spotify_url: spotifyUrl,
        spotify_id: spotifyId,
        track_count: trackCount || 0
      }] as any)
      .select()
      .single();
    
    if (error) {
      console.error('[DB] playlists.insert error:', error.message);
      return null;
    }
    
    if (!data) {
      console.error('[DB] playlists.insert: no data returned');
      return null;
    }
    
    const result = data as any;
    console.log(`[DB] playlists.insert ok id=${result.id}`);
    return result.id;
  } catch (error) {
    console.error('[DB] Error in insertPlaylist:', error);
    return null;
  }
}

async function insertPayment(userEmail: string, stripePaymentIntentId: string, stripeCustomerId: string, amount: number, plan: string, status: string = 'completed'): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Try to get user UUID, but don't fail if not found
    const userUUID = await getUserUUID(userEmail);
    
    // For now, use null for user_id to avoid foreign key constraint issues
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_email: userEmail,
        user_id: null, // Use null to avoid foreign key constraint issues
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_customer_id: stripeCustomerId,
        amount: amount,
        currency: 'eur',
        plan: plan,
        status: status
      }] as any)
      .select()
      .single();
    
    if (error) {
      console.error('[DB] payments.insert error:', error.message);
      return null;
    }
    
    if (!data) {
      console.error('[DB] payments.insert: no data returned');
      return null;
    }
    
    const result = data as any;
    console.log(`[DB] payments.insert ok id=${result.id}`);
    return result.id;
  } catch (error) {
    console.error('[DB] Error in insertPayment:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload } = body;
    
    if (!type || !payload) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing type or payload' 
      }, { status: 400 });
    }
    
    if (!['prompt', 'usage', 'playlist', 'payment'].includes(type)) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid type. Must be "prompt", "usage", "playlist", or "payment"' 
      }, { status: 400 });
    }
    
    let result;
    
    if (type === 'prompt') {
      const { email, prompt, source = 'web' } = payload;
      
      if (!email || !prompt) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Missing email or prompt in payload' 
        }, { status: 400 });
      }
      
      const promptId = await insertPrompt(email, prompt, source);
      
      if (promptId) {
        result = { id: promptId, type: 'prompt' };
      } else {
        return NextResponse.json({ 
          ok: false, 
          error: 'Failed to insert prompt' 
        }, { status: 500 });
      }
      
    } else if (type === 'usage') {
      const { email, event, meta = {} } = payload;
      
      if (!email || !event) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Missing email or event in payload' 
        }, { status: 400 });
      }
      
      const usageId = await insertUsageEvent(email, event, meta);
      
      if (usageId) {
        result = { id: usageId, type: 'usage' };
      } else {
        return NextResponse.json({ 
          ok: false, 
          error: 'Failed to insert usage event' 
        }, { status: 500 });
      }
      
    } else if (type === 'playlist') {
      const { email, playlistName, prompt, spotifyUrl, spotifyId, trackCount } = payload;
      
      if (!email || !playlistName || !prompt) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Missing email, playlistName, or prompt in payload' 
        }, { status: 400 });
      }
      
      const playlistId = await insertPlaylist(email, playlistName, prompt, spotifyUrl, spotifyId, trackCount);
      
      if (playlistId) {
        result = { id: playlistId, type: 'playlist' };
      } else {
        return NextResponse.json({ 
          ok: false, 
          error: 'Failed to insert playlist' 
        }, { status: 500 });
      }
      
    } else if (type === 'payment') {
      const { email, stripePaymentIntentId, stripeCustomerId, amount, plan, status = 'completed' } = payload;
      
      if (!email || !stripePaymentIntentId || !stripeCustomerId || !amount || !plan) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Missing required payment fields in payload' 
        }, { status: 400 });
      }
      
      const paymentId = await insertPayment(email, stripePaymentIntentId, stripeCustomerId, amount, plan, status);
      
      if (paymentId) {
        result = { id: paymentId, type: 'payment' };
      } else {
        return NextResponse.json({ 
          ok: false, 
          error: 'Failed to insert payment' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      ok: true, 
      ...result,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[TELEMETRY] Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
